---
title: "MapReduce Notes"
date: 2020-01-16T21:09:03+08:00
draft: false
summary: "本文是对Google经典论文MapReduce的翻译及归纳。"
categories: ["Distributed System"]
tags: ["Big Data"]
---

## Execution Overview

1. 把input files分割成M个部分。在机器集群上启动若干个程序的拷贝，其中有个特殊的拷贝叫master，其余的是worker，它们在master上注册。一共有M个map task和R个reduce task等待被分配给worker。
2. 被分配到map task的worker，把M个input file pieces转换成Key-Value，存储在内存中。（在实际应用中，内存中的数据会被周期性地写入到硬盘中，根据partitioning function，被分配到R个区域。这些被写入磁盘的数据的位置，会被传给master。）
3. 被分配到reduce task的worker，它们知道map task的output位置，使用RPC来获取这些output。当reduce worker获取到所有的intermediate data，就根据Key来排序，以确保相同Key的Key-Value聚集在一起。（如果内存装不下，需要采用外部排序）
4. reduce worker遍历已排序的数据，对于每一个Key，把Key和它的Value集合作为参数传给`Reduce(key string, values []string) string`，Reduce函数的output会被添加到这个reduce partition最终的output里。

## Types

```go
// map    (k1, v1)       → list(k2, v2)
// reduce (k2, list(v2)) → list(v2)

type KeyValue struct {
	Key   string
	Value string
}

mapFuc(key string, value string) []KeyValue

// Typically just zero or one output value is produced per Reduce invocation
reduceFuc(key string, values []string) string
```

## Example

### 1. Count of Word Frequency of a Large Collections of Documents

```go
func mapFuc(filename string, contents string) []KeyValue {
	var output []KeyValue
	keys := strings.FieldsFunc(contents, func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsNumber(r)
	})
	for _, k := range keys {
		output = append(output, KeyValue{Key: k, Value: "1"})
	}
	return output
}

func reduceFuc(key string, values []string) string {
	num := 0
	for _, value := range values {
		i, _ := strconv.Atoi(value)
		num += i
	}
	return strconv.Itoa(num)
}
```

### 2. Distributed Grep

```go
const pattern = "your pattern here"

// The map function emits a line if it matches a supplied pattern
func mapFuc(filename string, contents string) []KeyValue {
	var output []KeyValue
    
    // seperates file contents by line
	keys := strings.FieldsFunc(contents, func(r rune) bool {
		return r != '\n'
	})
    for _, k := range keys {
        matched, _ := regexp.Match(pattern, []byte(k))
        if (matched) {
            output = append(output, KeyValue{Key: k, Value: ""})
        }
    }
    return output
}

// The reduce function is an identity function that 
// just copies the supplied intermediate data to the output
func reduceFuc(key string, values[] string) string {
    return key
}
```

### 3. Count of URL Access Frequency

```go
// The map function processes logs of web page requests and outputs <URL, 1>
func mapFuc(filename string, contents string) []KeyValue {
}

// The reduce function adds together all values for the same URL 
// and emits a <URL, total count> pairs
func reduceFuc(key string, values[] string) string {
}
```

### 4. Reverse Web-Link Graph

```go
// The map function outputs <target, source> pairs for each link 
// to target URL found in a page named source
func mapFuc(filename string, contents string) []KeyValue {
}

// The reduce function concatenates the list of all source URLs 
// associated with a given target URL and emits the pair: <target, list(source)>
func reduceFuc(key string, values[] string) string {
}
```

### 5. Term-Vector per Host

```go
/*
	A term summarizes the most important words that occur in a document 
	or a set of documents as a list of <work, frequency> pairs.
	
	What is a term vector? 
	http://www.inf.ed.ac.uk/teaching/courses/tts/pdf/vspace-2x2.pdf
*/

// The map function emits a <hostname, term vector> pair for each input document.
// (where the hostname is extracted from the URL of the document)
func mapFuc(filename string, contents string) []KeyValue {
}

// The reduce function is passed all per-document term vectors for a given host.
// It adds these term vectors together, throwing away infrequent terms, 
// and then emits a final <hostname, term vector> pair.
func reduceFuc(key string, values[] string) string {
}
```

### 6. Inverted Index

```go
// The map function parses each document, 
// and emits a sequence of <word, document ID> pairs.
func mapFuc(filename string, contents string) []KeyValue {
    var output []KeyValue;
    words := strings.FieldsFunc(contents, func(r rune) bool {
        return !unicode.IsLetter(r) && !unicode.IsNumber(r)
    })
    for _, word := range words {
        output = append(output, KeyValue{Key: word, Value: filename})
    }
    return output
}

// The reduce function accepts all pairs for a given word, 
// sorts the corresponding document IDs and emits a <word, list(documentID)> pair.
// The set of all output pairs forms a simple inverted index.
// It is easy to augment this computation to keep track of word positions.
func reduceFuc(key string, values[] string) string {
    
}
```

### 7. Distributed Sort

```go
// The map function extracts the key from each record, and emits a <key, record> pair.
func mapFuc(filename string, contents string) []KeyValue {
}

// The reduce function emits all pairs unchanged.
// (This computation depends on the partitioning facilties described in
// Section 4.1 and the ordering properties described in Section 4.2)
func reduceFuc(key string, values[] string) string {
}
```

## How To Handle Worker Failures?

Master周期性ping已注册的worker，如果没有响应（不管是延迟还是真的挂了），master就认为这个worker挂了。分配给挂掉的worker的task会被重新分配给空闲的worker：

* 已完成的map task在worker挂掉的情况下**会**被重新执行，因为存储在local machine的output已经不可获取。

* 已完成的reduce task在worker挂掉的情况下**不会**被重新执行，因为它的output已经存储在global file system中。

如果一个map task先后被worker A和worker B执行（因为worker A挂了），所有在执行reduce task的worker都会被告知这次re-execution。然后，所有还没读worker A产生的数据的reduce task都会从worker B读。

## How To Handle Master Failure?

周期性地把master的数据写入硬盘（checkpoints），如果master挂了，就从最新的checkpoint恢复。

master挂了以后，停止MapReduce的计算，以确保一致性。

## Paritioning Function

Map阶段使用Partitioning Function把中间结果分配到不同的文件中，默认的是`hash(Key) % R`，用户也可以根据需要指定自己的函数。

## Ordering Guarantees

我们保证在一个给定的partition中，中间结果key-value对是以key递增的顺序处理的。

顺序保证让生成有序的输出文件变得容易，当输出文件需要**支持高效的循键随机访问**或**输出文件的用户需要有序的数据**，这会很有帮助。

## Combiner Function

在执行完map函数之后（仍是map阶段）通过网络传输之前，可以使用combiner对数据做部分的归并，这能明显加速某些MapReduce操作。

例如使用MapReduce做词频统计，因为在自然语言的语料库里单词的出现频率遵循齐夫分布（Zipf distribution），每个map任务都会产生成百上千的<the, 1>，这些大量的重复记录都会通过网络传输给单个reduce任务，并通过reduce函数产生一个结果。*所以我们可以使用combiner减轻reduce任务的计算压力并节约网络带宽。*

reduce函数和combiner函数通常是一样的，唯一区别是：前者的输出会被写入到最终的输出文件里，后者的输出会被写入到中间结果文件里。

## Reference

* [ MapReduce: Simplified Data Processing on Large Clusters  ](https://research.google.com/archive/mapreduce-osdi04.pdf)
* [6.824 Lab 1: MapReduce]( https://pdos.csail.mit.edu/6.824/labs/lab-1.html )