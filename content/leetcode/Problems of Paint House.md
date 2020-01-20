---
title: "Problems of Paint House"
date: 2020-01-06T19:00:55+08:00
draft: false
summary: "A problem set of Paint House problems."
categories: ["LeetCode"]
tags: ["Dynamic Programming", "Problem Set"]
---

## 256. Paint House I

根据题意我们知道，粉刷第`i`栋房子的颜色，依赖于第`i - 1`栋房子的颜色。因而粉刷前`i`栋房子的最小花费，依赖于不同颜色下粉刷前`i - 1`栋房子的最小花费。我们设`f[i][0]`为：**第`i - 1`栋房子是红色时，粉刷前`i`栋房子的最小花费**。

`f[i][0]`又可以拆解为两部分，一部分是”已知第`i - 1`栋房子是红色时，第`i`栋房子的最小花费“，另一部分是”第`i - 2`栋房子是蓝色或绿色时，粉刷前`i - 1`栋房子的最小花费“。因此有公式：

* 第`i - 1`栋房子是红色时，`f[i][0] = costs[i][0] + min(f[i - 1][1], f[i - 1][2])`
* 第`i - 1`栋房子是蓝色时，`f[i][1] = costs[i][1] + min(f[i - 1][0], f[i - 1][2])`
* 第`i - 1`栋房子是绿色时，`f[i][2] = costs[i][2] + min(f[i - 1][0], f[i - 1][1])`

```java
class Solution {
    public int minCost(int[][] costs) {
        final int houses = costs.length;
        if (houses == 0) {
            return 0;
        }
        final int colours = costs[0].length;
        int f[][] = new int[houses][colours];

        // init
        f[0] = costs[0];

        for (int i = 1; i < houses; i++) {
            f[i][0] = costs[i][0] + Math.min(f[i - 1][1], f[i - 1][2]);
            f[i][1] = costs[i][1] + Math.min(f[i - 1][0], f[i - 1][2]);
            f[i][2] = costs[i][2] + Math.min(f[i - 1][0], f[i - 1][1]);
        }
        // 骚操作
        Arrays.sort(f[houses - 1]);
        return f[houses - 1][0];
    }
}
```

## 265. Paint House II

这题和上一题的唯一区别就是从3种颜色变成了K种颜色。

```java
import java.util.Arrays;

class Solution {
    public int minCostII(int[][] costs) {
        int houses = costs.length;
        if (houses == 0) {
            return 0;
        }
        int colours = costs[0].length;
        // 设f[i][j]为：已知第i - 1栋房子是k颜色时，粉刷前i栋房子的最小花费
        // f[i][j] = min{ f[i - 1][k] } + costs[i][j], j != k
        int[][] f = new int[houses][colours];
        f[0] = costs[0];
        for (int i = 1; i < houses; i++) {
            for (int j = 0; j < colours; j++) {
                int min = Integer.MAX_VALUE;
                for (int k = 0; k < colours; k++) {
                    if (k != j) {
                        min = Math.min(min, f[i - 1][k]);
                    }
                }
                f[i][j] = min + costs[i][j];
            }
        }
        Arrays.sort(f[houses - 1]);
        return f[houses - 1][0];
    }
}
```

上述代码的时间复杂度是`O(NK^2)`，我们还可以继续做性能优化。根据状态转移方程，我们每次需要求`f[i - 1][1]`到`f[i - 1][k]`中除了某个元素之外其他元素的最小值。如果最小值的index是`i`，次小值的index是`j`：

* 如果除去的不是最小值，那么在剩余元素中的最小值的就是第`i`个元素
* 如果除去的是最小值，那么在剩余元素中的最小值就是第`j`个元素

```java
class Solution {
    public int minCostII(int[][] costs) {
        int houses = costs.length;
        if (houses == 0) {
            return 0;
        }
        int colours = costs[0].length;
        // 设f[i][j]为：已知第i - 1栋房子是k颜色时，粉刷前i栋房子的最小花费
        // f[i][j] = min{ f[i - 1][k] + costs[i][j] }, j != k
        int[][] f = new int[houses][colours];
        f[0] = costs[0];
        for (int i = 1; i < houses; i++) {
            // 最小值
            int min1 = Integer.MAX_VALUE;
            int index1 = 0;
            // 次小值
            int min2 = Integer.MAX_VALUE;
            int index2 = 0;
            // 找到最小值和次小值
            for (int j = 0; j < colours; j++) {
                if (f[i - 1][j] < min1) {
                    min2 = min1;
                    index2 = index1;
                    min1 = f[i - 1][j];
                    index1 = j;
                } else if (f[i - 1][j] < min2) {
                    min2 = f[i - 1][j];
                    index2 = j;
                }
            }
            for (int j = 0; j < colours; j++) {
                if (j == index1) {
                    f[i][j] = min2 + costs[i][j];
                } else {
                    f[i][j] = min1 + costs[i][j];
                }
            }
        }
        Arrays.sort(f[houses - 1]);
        return f[houses - 1][0];
    }
}
```

