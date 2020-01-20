---
title: "Problems of House Rubber"
date: 2020-01-06T19:00:20+08:00
draft: false
summary: "A problem set of House Robber problems."
categories: ["LeetCode"]
tags: ["Dynamic Programming", "Problem Set"]
---

## 198. House Robber

> You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed, the only constraint stopping you from robbing each of them is that adjacent houses have security system connected and **it will automatically contact the police if two adjacent houses were broken into on the same night.**
>
> Given a list of non-negative integers representing the amount of money of each house, determine the maximum amount of money you can rob tonight **without alerting the police.**

题目说了一大堆，简单来说就是窃贼不能偷两栋挨着的房子，在这个条件上要使得偷到的钱最多。

对于最后一个房子，窃贼可能选择偷或者不偷。设`f[i][0]`为不偷第`i`个房子最多能偷的金币，设`f[i][1]`为偷第`i`个房子最多能偷的金币。如果选择偷了第`i`个房子，那么必然不能偷第`i - 1`个房子。如果选择不偷第`i`个房子，那么可以偷第`i - 1`个房子，也可以不偷。

* `f[i][1] = f[i - 1][0] + a[i]`
* `f[i][0] = max{ f[i - 1][0], f[i - 1][1] }`

```java
class Solution {
    public int rob(int[] nums) {
        int n = nums.length;
        if (n == 0) {
            return 0;
        }
        int[][] f = new int[n][2];
        // 设f[i][0]为不偷第i个房子最大能获取的金币数
        // 设f[i][1]为偷第i个房子最大能获取的金币数
        f[0][0] = 0;
        f[0][1] = nums[0];
        for (int i = 1; i < n; i++) {
            f[i][0] = Math.max(f[i - 1][0], f[i - 1][1]);
            f[i][1] = f[i - 1][0] + nums[i];
        }
        return Math.max(f[n - 1][0], f[n - 1][1]);
    }
}
```

其实我们也可以把这两种情况都压缩到一维。我们设`f[i]`为偷前`i`栋房子最多能偷到的金钱数，这就有两种情况，要么偷第`i`栋房子，要么不偷第`i`栋房子：

* 如果不偷第`i`栋房子，那就是`f[i - 1]`
* 如果偷第`i`栋房子，那么就不能偷第`i - 1`栋房子（即必然会偷第`i`栋房子，可能会偷前`i - 2`栋房子），那么就是`f[i - 2] + a[i]`

合并两种情况得`f[i] = max{ f[i - 1], f[i - 2] + a[i] }`

```java
class Solution {
    public int rob(int[] nums) {
        int n = nums.length;
        if (n == 0) {
            return 0;
        } else if (n == 1) {
            return nums[0];
        }
        int[] f = new int[n];
        f[0] = nums[0];
        f[1] = Math.max(nums[0], nums[1]);
        int res = f[1];
        for (int i = 2; i < n; i++) {
            f[i] = Math.max(f[i - 1], f[i - 2] + nums[i]);
            res = Math.max(res, f[i]);
        }
        return res;
    }
}
```

## 213. House Robber II

这题和上一题的区别在于：第`0`个房子和第`n - 1`个房子相邻，使得若干个房子构成环形，因此第一个房子和最后一个房子只能选择其中一个偷窃。

设`f[i]`为不偷窃第`0`个房子时在前`i`个房子偷窃的最大金币数，`f[i]`有两种情况：

* 偷第`i`个房子且不偷第`0`个房子，这样就不能偷第`i - 1`个房子了，即`f[i - 2] + a[i]` （其中`i`的取值范围是[1, n - 1]）
* 不偷第`i`个房子且不偷第`0`个房子，即`f[i - 1]`（其中`i`的取值范围是[1, n - 1]）

合并得`f[i] = max{ f[i - 1], f[i - 2] + a[i] }`。

设`g[i]`为不偷窃第`i`个房子时在前`i`个房子偷窃的最大金币数，`g[i]`也有两种情况：

* 偷第`i - 1`个房子且不偷窃第`i`个房子，即`g[i - 2] + a[i]`（其中`i`的取值范围是[0, n - 2]）
* 不偷第`i - 1`个房子且不偷窃第`i`个房子，即`g[i - 1]`（其中`i`的取值范围是[0, n - 2]）

合并得`g[i] = max{ g[i - 1], g[i - 2] + a[i] }`。

问题的最终结果等于`max{ f[i], g[i] }`。

**注意，因为已经定义了`i`的取值范围是[1, n - 1]，所以我们没有在`f[i]`的两种可能中额外减去`a[0]`。**

```java
class Solution {
    public int rob(int[] nums) {
        int n = nums.length;
        if (n == 0) {
            return 0;
        } else if (n == 1) {
            return nums[0];
        } else if (n == 2) {
            return Math.max(nums[0], nums[1]);
        }

        // [1, n - 1]
        int[] f = new int[n];
        // [0, n - 2]
        int[] g = new int[n];

        // f[i] = max{ f[i - 1], f[i - 2] + a[i] }
        f[0] = 0;
        f[1] = Math.max(f[0], nums[1]);
        int res1 = f[1];
        for (int i = 2; i < n; i++) {
            f[i] = Math.max(f[i - 1], f[i - 2] + nums[i]);
            res1 = Math.max(res1, f[i]);
        }

        // g[i] = max{ g[i - 1], g[i - 2] + a[i] }
        g[0] = nums[0];
        g[1] = Math.max(g[0], nums[1]);
        int res2 = g[1];
        for (int i = 2; i < n - 1; i++) {
            g[i] = Math.max(g[i - 1], g[i - 2] + nums[i]);
            res2 = Math.max(res2, g[i]);
        }

        return Math.max(res1, res2);
    }
}
```
