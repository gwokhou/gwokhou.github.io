---
title: "Problems of Merge Intervals"
date: 2020-01-12T13:39:00+08:00
draft: true
summary: "A problem set of Merge Intervals problems."
categories: ["LeetCode"]
tags: ["Merge Intervals", "Problem Set"]
---

## 56. Merge Intervals

Intuition: if we sort intervals by the start endpoint of an interval, those mergeable intervals must be consecutive.

```java
import java.util.ArrayList;
import java.util.List;

class Solution {
    public int[][] insert(int[][] intervals, int[] newInterval) {
        if (intervals.length == 0) {
            return new int[][]{newInterval};
        }
        int newStart = newInterval[0];
        List<int[]> merged = new ArrayList<>();

        // adds interval into merged list
        // if the start of the interval < the start of the newInterval
        for (int[] interval : intervals) {
            if (interval[0] < newStart) {
                merged.add(interval);
            }
        }

        // adds the newInterval into merged list,
        // merge with the last interval of the list if necessary
        if (merged.isEmpty() || merged.get(merged.size() - 1)[1] < newInterval[0]) {
            merged.add(newInterval);
        } else {
            int[] lastInterval = merged.get(merged.size() - 1);
            if (lastInterval[1] < newInterval[1]) {
                lastInterval[1] = newInterval[1];
            }
        }

        // adds interval into merged list
        // if the start of the interval >= the start of newInterval
        // merge if necessary
        for (int[] interval : intervals) {
            if (interval[0] >= newStart) {
                int[] lastInterval = merged.get(merged.size() - 1);
                if (lastInterval[1] < interval[0]) {
                    merged.add(interval);
                } else {
                    if (lastInterval[1] < interval[1]) {
                        lastInterval[1] = interval[1];
                    }
                }
            }
        }

        return merged.toArray(new int[merged.size()][]);
    }
}
```

## 57. Insert Intervals

> Given a set of *non-overlapping* intervals, insert a new interval into the intervals (merge if necessary).
>
> You may assume that the intervals were initially sorted according to their start times.
>

We could solve this problem by using a greedy strategy.

In the problem of [56. Merge Interval](https://leetcode-cn.com/problems/merge-interval/), the time cost of the solution consists of two parts: sorting (`O(NlogN)`) and merging (`O(N)`). In this problem, the input is already sorted, so we can use this to solve the problem in a time cost of `O(N)`.

```java
class Solution {
    public int[][] insert(int[][] intervals, int[] newInterval) {
        if (intervals.length == 0) {
            return new int[][]{newInterval};
        }
        int newStart = newInterval[0];
        List<int[]> merged = new ArrayList<>();

        // adds interval into merged list
        // if the start of the interval < the start of the newInterval
        for (int[] interval : intervals) {
            if (interval[0] < newStart) {
                merged.add(interval);
            }
        }

        // adds the newInterval into merged list,
        // merge with the last interval of the list if necessary
        int last = merged.size() - 1;
        if (merged.isEmpty() || merged.get(last)[1] < newInterval[0]) {
            merged.add(newInterval);
        } else {
            int[] lastInterval = merged.get(merged.size() - 1);
            if (lastInterval[1] < newInterval[1]) {
                lastInterval[1] = newInterval[1];
            }
        }

        // adds interval into merged list
        // if the start of the interval >= the start of newInterval
        // merge if necessary
        for (int[] interval : intervals) {
            if (interval[0] >= newStart) {
                int[] lastInterval = merged.get(merged.size() - 1);
                if (lastInterval[1] < interval[0]) {
                    merged.add(interval);
                } else {
                    if (lastInterval[1] < interval[1]) {
                        lastInterval[1] = interval[1];
                    }
                }
            }
        }

        return merged.toArray(new int[merged.size()][]);
    }
}
```

## 252. Meeting Rooms

> Given an array of meeting time intervals consisting of start and end times `[[s1,e1],[s2,e2],...]` (si < ei), determine if a person could attend all meetings.

```java
class Solution {
    // we can sort the intervals by the start time then 
    // try to compare the end of interval[i] and the start of interval[i + 1]
    public boolean canAttendMeetings(int[][] intervals) {
        if (intervals.length <= 1) {
            return true;
        }
        Arrays.sort(intervals, new Comparator<int[]>() {
            @Override
            public int compare(int[] o1, int[] o2) {
                return o1[0] - o2[0];
            }
        });
        for (int i = 0; i < intervals.length - 1; i++) {
            if (intervals[i][1] > intervals[i + 1][0]) {
                return false;
            }
        }
        return true;
    }
}
```

## 253. Meeting Rooms II

> Given an array of meeting time intervals consisting of start and end times `[[s1,e1],[s2,e2],...]` (si < ei), find the minimum number of conference rooms required.
>

```java
class Solution {
    public int minMeetingRooms(int[][] intervals) {
        if (intervals.length <= 1) {
            return intervals.length;
        }
        
        // sort the start time and the end time seperately
        int[] starts = new int[intervals.length];
        int[] ends = new int[intervals.length];
        for (int i = 0; i < intervals.length; i++) {
            starts[i] = intervals[i][0];
            ends[i] = intervals[i][1];
        }
        Arrays.sort(starts);
        Arrays.sort(ends);

        int startPtr = 0;
        int endPtr = 0;
        int usedRooms = 0;
        while (startPtr < intervals.length) {
            // if a meeting is finished, reused a room
            // we don't care about which meeting is finished,
            // we care about it provided an available room.
            if (starts[startPtr] >= ends[endPtr]) {
                usedRooms--;
                endPtr++;
            }
            usedRooms++;
            startPtr++;
        }
        return usedRooms;
    }
}
```

