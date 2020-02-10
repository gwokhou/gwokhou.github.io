---
title: "Quick Sort vs Merge Sort"
date: 2020-02-10T18:39:15+08:00
draft: false
summary: "No summary"
categories: ["Algorithm"]
---

## 1. Overview

Quick Sort

* Recursive call happens after partitioning
* The partitioning pivot depends on the data of array
* Not stable

Merge Sort

* Recursive call happens before merging
* The array is divided into two halves of equal length
* Stable

## 2. Details of Quick Sort

Best Case

* The pivot always lands on the median of an array

Worst Cases

* Bad Order: the original array is sorted
* Bad element: all the element of the original array is duplicated

If the pivot always lands on the median of an array, the calling tree of quick sort will look like a balanced binary tree, so the time complexity is O(nlogn).

In the worst cases, the calling tree will look like a linked list, so the time complexity is O(n^2).

```java
public void QuickSort(int[] a) {
	shuffle(a);
    sort(a, 0, a.length - 1);
}

private void sort(int[] a, int lo, int hi) {
    if (hi <= lo) return;
    int j = partition(a, lo, hi);
    sort(a, lo, j - 1);
    sort(a, j + 1, hi);
}

private int partition(int[] a, int lo, int hi) {
    int i = lo;			// init the left pointer
    int j = hi + 1;		// init the right pointer
    int v = a[lo];		// init the pivot
    while (true) {
        while (i < hi && a[++i] < v) {}	// scan from left to right, 
        								// until it finds a element larger than pivot
        while (lo < j && a[--j] > v) {}	// scan from right to left,
        								// until it finds a element smaller than pivot
        if (i >= j) break;
        exch(a, i, j);					// swap the "unsorted" pair
    }
    // swap pivot with the rightest element of the left subarray
    //
    // FROM   v    <=v    >=v
    //  TO   <=v    v     >=v
    exch(a, lo, j);
    return j;			// return the index of pivot
}

private void exch(int[] a, int i, int j) {
    int temp = a[i];
    a[i] = a[j];
    a[j] = temp;
}

// Fisher–Yates shuffle algorithm
private void shuffle(int[] a) {
    Random random = new Random();
    for (int i = a.length - 1; i >= 0; i--) {
        // 0 <= r <= i
        int r = random.nextInt(i + 1);
        exch(a, i, r);
    }
}
```

## 3. Details of Merge Sort

```java
public void MergeSort(int[] a) {
    int[] aux = new int[a.length];
    sort(a, 0, a.length - 1);
}

private void sort(int[] a, int lo, int hi) {
    if (hi <= lo) return;
    int mid = lo + (hi - lo) / 2;
    sort(a, lo, mid);		// sort the left subarray
    sort(a, mid + 1, hi);	// sort the right subarray
    merge(a, lo, mid, hi);  // merge them
}

private void merge(int[] a, int lo, int mid, int hi) {
    for (int k = lo; k <= hi; k++) {
        aux[k] = a[k];
    }
    int i = lo;			// init the left subarray pointer
    int j = mid + 1;	// init the right subarray pointer
    for (int k = lo; k <= hi; k++) {
        if      (i > mid)         a[k] = aux[j++];	// take a right element (cause the left is used up)
        else if (j > hi)          a[k] = aux[i++];	// take a left element (cause the right is used up)
        else if (aux[j] < aux[i]) a[k] = aux[j++];	// take a right element (cause it's smaller)
        else                      a[k] = aux[i++];	// take a left element (casue it's smaller)
    }
}
```

Note that we use `lo + (hi - lo) / 2` instead of `(hi + lo) / 2` to avoid integer overflow.

## 4. Reference

* Robert Sedgewick and Kevin Wayne's *Algorithm (4th Edition)*

* UC Berkeley CS 61B
