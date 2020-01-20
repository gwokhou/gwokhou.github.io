---
title: "Problems of In-place Reversal of Linked List"
date: 2020-01-11T15:40:25+08:00
draft: false
summary: "A problem set of In-place Reversal of Linked List problems."
categories: ["LeetCode"]
tags: ["Linked List", "Problem Set"]
---

## 206. Reverse Linked List

> Reverse a singly linked list, return the head of the reversed linked list.

```java
/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode(int x) { val = x; }
 * }
 */
class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode curr = head;
        while (curr != null) {
            ListNode oldNext = curr.next;	// 1. stores the old next
            curr.next = prev;				// 2. the current points to the previous
            prev = curr;					// 3. the current becomes a new previous
            curr = oldNext;					// 4. the current moves on
        }
        return prev;
    }
}
```

Why return `prev`? Cause `prev` pointed to the last `curr` (the last node).

## 92. Reverse Linked List II

> Reverse a linked list from position m to n. Do it in one-pass.
>
> **Note:** 1 ≤ m ≤ n ≤ length of list.

```java
/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode(int x) { val = x; }
 * }
 */
class Solution {
    private ListNode reverseN(ListNode head, int n) {
        ListNode prev = null;
        ListNode curr = head;
        for (int i = 0; i < n; i++) {
            ListNode oldNext = curr.next;
            curr.next = prev;
            prev = curr;
            curr = oldNext;
        }
        return prev;
    }
    
    public ListNode reverseBetween(ListNode head, int m, int n) {
        ListNode dummy = new ListNode(42);
        dummy.next = head;
        ListNode ptr1 = dummy;
        ListNode ptr2 = dummy;
        // finds the endpoint of the left segment
        for (int i = 0; i < m - 1; i++) {
            ptr2 = ptr2.next;
        }
        // finds the endpoint of the right segment
        for (int i = 0; i < n + 1; i++) {
            ptr1 = ptr1.next;
        }
        // finds the tail of the reversed linked list
        ListNode t = ptr2.next;
        // reverses a part of the linked list and gets its head
        ListNode h = reverseN(t, n - m + 1);
        // links up the left segment with the head of the reversed linked list
        ptr2.next = h;
        // links up the right segment with the tail of the reversed linked list
        t.next = ptr1;
        
        return dummy.next;
    }
}
```

## 234. Palindrome Linked List

> Given a singly linked list, determine if it is a palindrome.

We can solve this problem in three steps:

1. finds the middle of the linked list
2. reverses the second half of the linked list
3. traverses from the head and end of the linked list and determines if each of the numbers are equal

```java
/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode(int x) { val = x; }
 * }
 */
class Solution {
    private ListNode findMiddle(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;
    }

    private ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode curr = head;
        while (curr != null) {
            ListNode oldNext = curr.next;
            curr.next = prev;
            prev = curr;
            curr = oldNext;
        }
        return prev;
    }

    public boolean isPalindrome(ListNode head) {
        if (head == null || head.next == null) {
            return true;
        }
        ListNode middle = findMiddle(head);
        ListNode ptr1 = reverseList(middle);
        ListNode ptr2 = head;
        while (ptr1 != null && ptr2 != null) {
            if (ptr1.val != ptr2.val) {
                return false;
            }
            ptr1 = ptr1.next;
            ptr2 = ptr2.next;
        }
        return true;
    }
}
```

## 24. Swap Nodes in Pairs

> Given a linked list, swap every two adjacent nodes and return its head.
>
> You may **not** modify the values in the list's nodes, only nodes itself may be changed.
>

```java
/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode(int x) { val = x; }
 * }
 */
class Solution {
    public ListNode swapPairs(ListNode head) {
        ListNode dummy = new ListNode(42);
        dummy.next = head;
        ListNode c = dummy;
        while (c.next != null && c.next.next != null) {
            ListNode a = c.next;
            ListNode b = c.next.next;

            // swaps nodes in pair
            c.next = b;
            a.next = b.next;
            b.next = a;
            
            c = c.next.next;
        }
        return dummy.next;
    }
}
```

