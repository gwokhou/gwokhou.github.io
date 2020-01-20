---
title: "Problems of Add Binary, Add Strings and Multiply Strings"
date: 2020-01-06T18:59:45+08:00
draft: false
summary: "A problem set of strings calculation problems."
categories: ["LeetCode"]
tags: ["Math", "Problem Set"]
---

## 67. Add Binary

```java
class Solution {
    public String addBinary(String a, String b) {
        StringBuilder builder = new StringBuilder();
        char carry = '0';
        int i = a.length() - 1;
        int j = b.length() - 1;
        while (i >= 0 || j >= 0) {
            int iNum = (i >= 0) ? a.charAt(i) : '0';
            int jNum = (j >= 0) ? b.charAt(j) : '0';
            int sum = iNum + jNum + carry;
            char temp;
            int threeZero = '0' * 3;
            if (sum == threeZero) {
                temp = '0';
                carry = '0';
            } else if (sum == threeZero + 1) {
                temp = '1';
                carry = '0';
            } else if (sum == threeZero + 2) {
                temp = '0';
                carry = '1';
            } else {
                temp = '1';
                carry = '1';
            }
            builder.append(temp);
            i--;
            j--;
        }
        if (carry == '1') {
            builder.append('1');
        }
        return builder.reverse().toString();
    }
}
```



## 415. Add Strings

```java
class Solution {
    public String addStrings(String num1, String num2) {
        StringBuilder builder = new StringBuilder();
        int carry = 0;
        int i = num1.length() - 1;
        int j = num2.length() - 1;
        while (i >= 0 || j >= 0) {
            int iNum = (i >= 0) ? num1.charAt(i) - '0' : 0;
            int jNum = (j >= 0) ? num2.charAt(j) - '0' : 0;
            int sum = iNum + jNum + carry;
            carry = sum / 10;
            builder.append(sum % 10);
            i--;
            j--;
        }
        if (carry == 1) {
            builder.append(1);
        }
        return builder.reverse().toString();
    }
}
```



## 43. Multiply Strings

We can solve this problem by simulating vertical multiplication which factoring the multiplier into coefficient and exponent.
For example, 123 * 456 = 123 * 4 * 10^2 + 123 * 5 * 10^1 + 123 * 6 * 10^0.

```java
class Solution {
    private String addString(String num1, String num2) {
        int i = num1.length() - 1;
        int j = num2.length() - 1;
        StringBuilder builder = new StringBuilder();
        int carry = 0;
        while (i >= 0 || j >= 0) {
            int iNum = (i >= 0) ? (num1.charAt(i) - '0') : 0;
            int jNum = (j >= 0) ? (num2.charAt(j) - '0') : 0;
            int sum = iNum + jNum + carry;
            carry = sum / 10;
            builder.append(sum % 10);
            i--;
            j--;
        }
        if (carry == 1) {
            builder.append(1);
        }
        return builder.reverse().toString();
    }

    private String helper(String multiplicand, char multiplier, int exp) {
        StringBuilder builder = new StringBuilder();
        int carry = 0;
        for (int i = multiplicand.length() - 1; i >= 0; i--) {
            char num = multiplicand.charAt(i);
            int product = (num - '0') * (multiplier - '0') + carry;
            carry = product / 10;
            builder.append(product % 10);
        }
        if (carry != 0) {
            builder.append(carry);
        }
        builder.reverse();
        for (int i = 0; i < exp; i++) {
            builder.append('0');
        }
        return builder.toString();
    }

    public String multiply(String num1, String num2) {
        if ("0".equals(num1) || "0".equals(num2)) {
            return "0";
        }
        String sum = "0";
        int count = 0;
        for (int i = num2.length() - 1; i >= 0; i--) {
            char c = num2.charAt(i);
            String temp = helper(num1, c, count);
            sum = addString(sum, temp);
            count++;
        }
        return sum;
    }
}
```

