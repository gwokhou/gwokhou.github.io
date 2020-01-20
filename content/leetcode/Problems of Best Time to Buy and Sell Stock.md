---
title: "Problems of Best Time to Buy and Sell Stock"
date: 2020-01-06T19:00:04+08:00
draft: false
summary: "A problem set of Best Time to Buy and Sell Stock problems."
categories: ["LeetCode"]
tags: ["Dynamic Programming", "Problem Set"]
---

## 121. Best Time to Buy and Sell Stock

> Say you have an array for which the ith element is the price of a given stock on day i.
>
> If you were only permitted to complete **at most one transaction** (i.e., buy one and sell one share of the stock), design an algorithm to find the maximum profit.
>
> Note that you cannot sell a stock before you buy one.
>

### Normal Solution

```java
class Solution {
    public int maxProfit(int[] prices) {
    	int n = prices.length;
        if (n == 0) {
            return 0;
        }
        int maxProfit = 0;
        int minPrice = prices[0];
        for (int i = 1; i < n; i++) {
            maxProfit = Math.max(maxProfit, prices[i] - minPrice);
            minPrice = Math.min(minPrice, prices[i]);
        }
        return maxProfit;
    }
}
```

## 122. Best Time to Buy and Sell Stock II

> Say you have an array for which the ith element is the price of a given stock on day i.
>
> Design an algorithm to find the maximum profit. You may complete **as many transactions as you like** (i.e., buy one and sell one share of the stock multiple times).
>
> **Note:** You may not engage in multiple transactions at the same time (i.e., you must sell the stock before you buy again).

## 123. Best Time to Buy and Sell Stock III

> Say you have an array for which the ith element is the price of a given stock on day i.
>
> Design an algorithm to find the maximum profit. You may complete **at most two transactions**.
>
> **Note:** You may not engage in multiple transactions at the same time (i.e., you must sell the stock before you buy again).

## 188. Best Time to Buy and Sell Stock IV

> Say you have an array for which the ith element is the price of a given stock on day i.
>
> Design an algorithm to find the maximum profit. You may complete **at most k transactions**.
>
> **Note:** You may not engage in multiple transactions at the same time (ie, you must sell the stock before you buy again).

## 309. Best Time to Buy and Sell Stock with Cooldown

> Say you have an array for which the ith element is the price of a given stock on day i.
>
> Design an algorithm to find the maximum profit. You may complete **as many transactions as you like** (ie, buy one and sell one share of the stock multiple times) with the following restrictions:
>
> * You may not engage in multiple transactions at the same time (ie, you must sell the stock before you buy again).
> * **After you sell your stock, you cannot buy stock on next day.** (ie, cooldown 1 day)

## 714. Best Time to Buy and Sell Stock with Transaction Fee

> Your are given an array of integers prices, for which the ith element is the price of a given stock on day i; and a non-negative integer fee representing a transaction fee.
>
> You may complete **as many transactions as you like**, but you need to pay the transaction fee for each transaction. You may not buy more than 1 share of a stock at a time (ie. you must sell the stock share before you buy again.)
>
> Return the maximum profit you can make.
>