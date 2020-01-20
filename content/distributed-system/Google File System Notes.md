---
title: "Google File System Notes"
date: 2020-01-16T21:09:05+08:00
draft: false
summary: "本文是对Google经典论文Google File System的翻译及归纳。"
categories: ["Distributed System"]
tags: ["Storage System"]
---

## 0. QA

Question：GFS是建立在Linux文件系统之上，还是取代了它？

Answer：当然是建立在Linux文件系统之上啦！整个GFS系统都是用户级别的进程。此外，chunkserver还利用了Linux的文件缓存机制呢。

~

Question：GFS提供的接口和POSIX API处于同一层么？

Answer：

~

Question：chunk lease是什么？

Answer：chunk lease是用于维护多chunk副本一致性的机制。master向其中一个chunk副本授予lease，这个副本被称作primary，其余的副本都被称作secondary。primary为chunk的所有修改选择一个序列顺序，所有副本进行修改时遵循这个顺序。

~

Question：chunkserver怎么保证数据完整性？

Answer：chunkserver用checksum保证数据完整性。每个chunk都会被分解成64KB大小的块，每个块都有一个32位的checksum。对于读操作，chunkserver在数据返回给请求者之前，检查所有交叠部分的checksum。如果checksum不一致，chunkserver会**向请求者返回错误**并**向master报告数据缺失**，请求者会转而请求其他chunk副本，master会从其他chunk副本复制发给缺失者。收到新的副本后，旧的损坏副本会被删除。

## 1. Introduction

Google File System借鉴了先前的分布式系统在性能、扩展性、可靠性、可用性的成果，并基于对Google应用程序的工作负载和技术环节的观察，做出了许多与传统设计相异的设计假设：

* **Component错误比预期中更常见**：因为系统是由成百上千台商用计算机构成，更有可能出现各种各样的错误，所以持续监控、错误检查、自动容错恢复非常必要。
* **与传统标准（论文发表的时代）相比，存储的文件数目更多体积更大**
* **文件读写有特定规律**：多数文件追加新数据而不是覆盖已存在的数据、随机写入几乎不存在、文件经常是被顺序读取而不是随机读取
* **应用和文件系统协同设计有利于提高系统整体灵活性**

## 2. Design Overview

### 2.1 Assumptions

* 系统是由许多不昂贵的商用电脑组成的，它们经常挂掉。所以系统需要持续地被监控、探测、容忍错误，并例行地及时从错误中恢复。
* 系统存储了适量的大文件。我们期望有几百万个每个几百MB的文件。几GB的文件是非常常见的，它们应该被有效地管理。小文件也必须被支持，但是无需为他们优化。
* 系统的工作负载主要由两部分读操作组成：**大的流式读取**和**小的随机读取**。在大的流式读取中，单次操作往往读取几百KB，更常见的是1MB及以上；来自同一个客户端的连续操作经常从文件的一个邻近区域读取。小的随机读取往往是以任意的偏移量读取几KB。注重性能的应用程序通常对小的随机读取进行批处理和排序，以稳定地读取文件，而不是来回移动。
* 系统的工作负载也有许多**大的顺序的向文件追加数据的写操作**。典型的写操作与读操作的数据大小相似。一旦写入，文件就很少被再次修改。系统支持小的文件随机写入操作，但是它们不必高效。
* 系统必须高效地实现定义明确的“**多client并发追加数据到同一个文件**”语义。系统里的文件经常被用于生产者-消费者队列或多路归并。数百个生产者（每台机器一个）将并发地向文件追加数据。这一语义必须满足原子性，并具有最小的同步开销。文件可能会在以后读取，消费者也可能同时读取文件。
* **高持续带宽比低延迟更重要**。多数的目标应用程序都非常重视高速处理大量数据，而很少有对单个读取或写入有严格响应时间要求的应用程序。

### 2.2 Interface

虽然Google File System没有实现标准API（例如POSIX），但它提供了熟悉的文件系统接口：*create*、*delete*、*open*、*close*、*read*、*write*。

除此之外，GFS还提供了*snapshot*和*record append*这两种操作。

* snapshot：低成本创建一个文件或文件夹树的拷贝
* record append：允许多客户端向同一个文件并发地追加数据，并保证每个客户端追加操作的原子性

### 2.3 Architecture

一个GFS集群由一个master、多个chunkserver和多个client组成，它们通常都是运行在商用Linux机器上的**用户级别进程**。

文件被分割成固定大小的chunks，每个chunk通过一个不可变的全局唯一的64位chunk handle识别（在chunk创建时由master分配）。chunkserver以Linux文件的形式在本地硬盘上存储chunk，读写chunk数据需要使用chunk handle和byte range指明。用户可以为不同的命名空间指定不同的复制级别，默认情况下，我们存储三份文件的拷贝。

**Master维护了所有的文件系统元信息，其中包括：命名空间、访问控制信息、文件到chunk的映射、chunk的当前位置**。它也控制了全系统的活动，例如chunk租约管理、孤儿chunk的垃圾回收、chunkserver之间的chunk迁移。Master周期性地和chunkserver以心跳包的形式通信，给它们发送指示，并收集它们的状态。

与每个应用程序相连的GFS client代码实现了文件系统的API，并代表应用程序读写数据，与master和chunkserver通信。client与master交互以进行元数据操作，但所有的携带数据的通信都是直接与chunkserver进行。我们不提供POSIX API，因此不需要连接到Linux vnode层。

**client和chunkserver都不缓存文件数据**。client缓存收效甚微，因为大多数应用程序流经大文件或有太大的工作集以至于无法被缓存。因为无需实现client缓存，消除了缓存一致性问题，简化了client和整个系统的设计（但client还是要缓存元数据）。chunkserver也不需要缓存文件数据，因为chunk以本地文件的形式存储，所以Linux的缓存已经把最常访问的的数据缓存在内存里了。

### 2.4 Single Master

单个的master极大地简化了我们的设计，使得master可以使用全局信息来制定复杂的chunk放置决策和复制决策。但我们必须使它对读写操作的波及最小化，以确保它不会成为瓶颈。client不经由master读写文件，而是问master它需要联系哪个chunkserver。client在有限时间内缓存这个信息，在随后的操作中直接与chunkserver交互。

（下面两段是例子，就不翻译了）

### 2.5 Chunk Size

Chunk size是关键设计参数之一，我们选择64MB作为chunk size，这比典型的文件系统块大小更大。每个块复制品以普通Linux文件的形式存储在chunkserver上，它仅按需扩展。惰性空间分配避免了由于内部碎片而浪费空间，这可能是对如此大的块大小的最大反对意见。**（？）**

大chunk size有以下几点好处：

* **它减少了client和master交互的需求**，因为读写同一个chunk仅需要一次对chunk位置信息的初始请求。这对减少工作负载是非常显著的，因为应用程序大多顺序地读写大文件。即使是小的顺序读取，客户端也能缓存几TB工作集所有的chunk位置信息
* 在一个大chunk上，客户端更有可能在给定的chunk执行多个操作，所以大的chunk size可以**在长时间内通过保持一个持久的TCP连接来减少网络开销**
* **它减少了存储在master的元数据大小**，这使得可以在内存中保存元数据。反过来也带来了其它好处，我们会在Section 2.6.1讨论

另一方面，大的chunk size（即便是惰性空间分配）也有其缺点。假如有一个小文件，它由几个chunk组成（可能只有一个）。如果客户端多次访问同一个文件，这些chunk会成为chunkserver中的热点。在实践中，热点通常不会成为主要问题，因为我们的应用多数是以大的多chunk顺序读取。

但是，当批处理队列系统首次使用GFS时，热点确实出现了：

### 2.6 Metadata

（暂时未翻译）

### 2.7 Consistency Model

* **Consistent**: 如果所有的client无论从哪个副本读取都能得到相同数据，那么这个文件区域是一致的。
* **Defined**: 客户端向某个offset写入数据后，读取，读到的是自己写的那个。
* **Undefined but consistent**: 多客户端并发写，所有客户端都能看见一致的数据，但无从得知什么客户端写了什么数据。

这位博主写的GFS一致性模型[文章]( https://www.leeif.me/2019/07/gfs-consistency.html )解释得很清楚，可以参考一下。

## Reference

* [Google File System]( https://static.googleusercontent.com/media/research.google.com/en//archive/gfs-sosp2003.pdf )

