---
title: "Problems of Maximum&Minimum Depth of Binary Tree"
date: 2020-01-06T19:00:43+08:00
draft: false
summary: "A problem set of Depth of Binary Tree problems."
categories: ["LeetCode"]
tags: ["Binary Tree", "Problem Set"]
---

## 104. Maximum Depth of Binary Tree

这题很简单，只要理解`树的深度 = max{ 左子树深度, 右子树深度} + 1`就可以了。还有就是要理解递归。

```java
/**
 * Definition for a binary tree node.
 * public class TreeNode {
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode(int x) { val = x; }
 * }
 */
class Solution {
    public int maxDepth(TreeNode root) {
        if (root == null) {
            return 0;
        }
        int leftDepth = maxDepth(root.left);
        int rightDepth = maxDepth(root.right);
        return Math.max(leftDepth, rightDepth) + 1;
    }
}
```

## 111. Minimum Depth of Binary Tree

这题跟上边那题有点微妙的区别，如果试图套用`树的深度 = min{左子树深度， 右子树深度} + 1`，那么有几个测试用例是过不了的。

```java
/**
 * Definition for a binary tree node.
 * public class TreeNode {
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode(int x) { val = x; }
 * }
 */
class Solution {
    public int minDepth(TreeNode root) {
        if (root == null) {
            return 0;
        }
        int leftDepth = minDepth(root.left);
        int rightDepth = minDepth(root.right);
        if (leftDepth == 0 || rightDepth == 0) {
            return leftDepth == 0 ? rightDepth + 1 : leftDepth + 1;
        } else {
            return Math.min(leftDepth, rightDepth) + 1;
        }
    }
}
```

