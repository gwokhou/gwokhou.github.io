---
title: "Problems of Longest Subsequence"
date: 2020-01-06T18:58:35+08:00
draft: false
summary: "A problem set of Longest Subsequence problems."
categories: ["LeetCode"]
tags: ["Dynamic Programming", "Problem Set"]
---

## 674. Longest Continuous Increasing Subsequence

设`f[i]`为：以`a[i]`结尾的最长连续上升子序列的长度。因为子序列是“最长无重复子序列”，所以以`a[i]`结尾的最长连续上升子序列的倒数第二个元素必然是`a[i - 1]`，否则就违背了**“连续”**。既然以`a[i]`结尾的最长连续上升子序列是**最长**的，那么如果它被减去`a[i]`这个元素的长度，必然是第二长的。

所以长度`f[i]`可以被分解为两部分（其中一部分是规模更小的有相同结构的子问题）：

* `a[i]`这个元素本身的长度
* 以`a[i - 1]`结尾的最长连续子序列的长度

状态转移方程：

* `f[i] = max{ f[i - 1] + 1 }` （如果 `a[i - 1] < a[i]`）
* `f[i] = 1`（如果 `a[i - 1] >= a[i]`），因为只有符合这种条件的`i`才是连续上升子序列的起点

初始条件：`f[0] = 1`

```java
class Solution {
    public int findLengthOfLCIS(int[] nums) {
        if (nums.length() <= 1) {
            return nums.length();
        }
        int f[] = new int[nums.length()];
        f[0] = 1;
        int largest = f[0];
        for (int i = 1; i < nums.length(); i++) {
            if (nums[i - 1] < nums[i]) {
                f[i] = f[i - 1] + 1;
            } else {
                f[i] = 1;
            }
            largest = Math.max(largest, f[i]);
        }
        return largest;
    }
}
```

## 300. Longest Increasing Subsequence

相比于[《674. Longest Continuous Increasing Subsequence》](https://leetcode.com/problems/longest-continuous-increasing-subsequence/)，这题少了“连续”的条件，这意味着长度仅次于“以`a[i]`结尾的上升子序列”的子序列不再是以`a[i - 1]`结尾，而是以`a[j], (0 <= j < i)`结尾。

现在我们用文字重新解释长度仅次于`f[i]`的子序列：

* 对于第674题来说，长度仅次于**“以`a[i]`结尾的连续上升子序列”**的子序列的结尾必定在`i - 1`，因为序列是连续的。
* 对于本题来说，长度仅次于**“以`a[i]`结尾的上升子序列”**的子序列的结尾可能在`[0, i)`任意一处，因为序列不一定连续。

所以，对于所有的`f[i]`，我们都要考察以`a[j] (for all 0 <= j < i)`结尾的子序列`f[j]`可以达到的最大长度，达到最大长度的那个子序列就是子问题。

状态转移方程：

* `f[j] = max{ f[j] } (for all 0 <= j < i and a[j] < a[i])`
* `f[i] = max{ f[j] + 1 }`

初始条件：`f[0] = 1`

```java
class Solution {
    public int lengthOfLIS(int[] nums) {
        if (nums.length() <= 1) {
            return nums.length();
        }
        int f[] = new int[nums.length()];
        f[0] = 1;
        int largest = f[0];
        // i and j traverse from left to right which means that 
        // they first calculate the first few terms of f[i] = f[j] + 1
        for (int i = 1; i < nums.length(); i++) {
            int maxFj = 0;
            for (int j = 0; j < i; j++) {
                if (nums[j] < nums[i]) {
                    maxFj = Math.max(maxFj, f[j]);
                }
            }
            f[i] = maxFj + 1;
            largest = Math.max(largest, f[i]);
        }
        return largest;
    }
}
```

## 3. Longest Substring Without Repeating Characters

所谓“连续无重复子串”其实就是“连续无重复子序列”，相比于[《674. Longest Continuous Increasing Subsequence》](https://leetcode.com/problems/longest-continuous-increasing-subsequence/)，无非就是把条件换成了“无重复”，所以我们可以尝试套用之前的思路。

设`f[i]`为：以`a[i]`结尾的最长连续无重复子串的长度。因为以`a[i]`结尾的最长连续子串是无重复的，所以以`a[i - 1]`结尾的最长连续子串也是无重复的。

我们知道对于数组的下标有`begin + len(array) - 1 = end`，因此有`begin = end - len(array) + 1`。以`a[i - 1]`结尾的连续子串的`end = i - 1`且`len(array) = f[i - 1]`，所以它的范围是[`i - f[i - 1]`, `i - 1`]。

因此可得状态转移方程：

* `f[i] = max{ f[i - 1] + 1 }`（如果`a[i]`在`a[i - f[i - 1]]`到`a[i - 1]`中没有重复)
* `f[i] = i - k`（如果`a[i]`和`a[k]`重复，其中`k`的取值范围是[`i - f[i - 1]`, `i - 1`]）

```java
class Solution {
    public int lengthOfLongestSubstring(String s) {
        if (s.length() <= 1) {
            return s.length();
        }
        int f[] = new int[s.length()];
        f[0] = 1;
        int largest = f[0];
        for (int i = 1; i < s.length(); i++) {
            int curr = s.charAt(i);
            int k = i - f[i - 1] - 1;
            for (int j = i - 1; j >= i - f[i - 1] && j >= 0; j--) {
                if (curr == s.charAt(j)) {
                    k = j;
                    break;
                }
            }
            f[i] = i - k;
            largest = Math.max(largest, f[i]);
        }
        return largest;
    }
}
```

（注：本题大篇幅参考了知乎作者“澪同学”的[题解](https://zhuanlan.zhihu.com/p/33374733)。）
