---
title: "Problems of Slow and Fast Pointer in Linked List"
date: 2020-01-15T10:01:07+08:00
draft: false
summary: "A problem set of Slow and Fast Pointer in Linked List problems."
categories: ["LeetCode"]
tags: ["Linked List", "Problem Set"]
---

## 141. Linked List Cycle

```java
/**
 * Definition for singly-linked list.
 * class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode(int x) {
 *         val = x;
 *         next = null;
 *     }
 * }
 */
public class Solution {
    public boolean hasCycle(ListNode head) {
        // len == 0 || len == 1
        if (head == null || head.next == null) {
            return false;
        }
        ListNode slow = head;
        ListNode fast = head;
        // if the fast pointer or the next of fast pointer
        // reaches to null, end this loop
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) {
                return true;
            }
        }
        return false;
    }
}
```

## 142. Linked List Cycle II

>  Given a linked list, return the node where the cycle begins. If there is no cycle, return `null`.

If there is cycle in a given linked list, pointers with step size of 1 and 2 will eventually meet. When they meet, `2 * distance(slow) = distance(fast)`.

Let's assume that the pointers walk around the cycle (if it exists) clockwise.

* `F` : the distance from head to the cycle entrance
* `a`: the distance from cycle entrance to intersection

* `b`: the distance from intersection to cycle entrance

Thus `2 * (F + a) = F + N(a + b) + a`, then `F = b + (N - 1)(a + b)`. After we find the intersection, let one pointer go from the intersection and the other from `head`, both of them have a same step size. We will get the cycle entrance when they meet.

```java
/**
 * Definition for singly-linked list.
 * class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode(int x) {
 *         val = x;
 *         next = null;
 *     }
 * }
 */
public class Solution {
    public ListNode detectCycle(ListNode head) {
        // corner case
        if (head == null) {
            return null;
        }
        
        // phase 1: find the intersection
        ListNode slow = head;
        ListNode fast = head;
        ListNode intersection = null;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) {
                intersection = fast;
                break;
            }
        }
        if (intersection == null) {
            return null;
        }
        
        // phase 2: find the cycle entrance
        ListNode ptr1 = head;
        ListNode ptr2 = intersection;
        while (ptr1 != ptr2) {
            ptr1 = ptr1.next;
            ptr2 = ptr2.next;
        }
        return ptr1;
    }
}
```

## 19. Remove Nth Node From End of List

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
    public ListNode removeNthFromEnd(ListNode head, int n) {
        ListNode dummy = new ListNode(42);
        dummy.next = head;

        // example: n = 2
        // dummy ->  1  ->  2  ->  3  ->  4  ->  5  ->  6  ->
        //  slow
        //  fast
        ListNode slow = dummy;
        ListNode fast = dummy;

        // dummy ->  1  ->  2  ->  3  ->  4  ->  5  ->  6  ->
        //  slow
        //                 fast
        for (int i = 0; i < n; i++) {
            fast = fast.next;
        }

        // dummy ->  1  ->  2  ->  3  ->  4  ->  5  ->  6  ->
        //                               slow
        //                                             fast
        while (fast.next != null) {
            slow = slow.next;
            fast = fast.next;x
        }

        // dummy ->  1  ->  2  ->  3  ->  4  ->  6  ->
        //                               slow
        //                                      fast
        ListNode removed = slow.next;
        slow.next = slow.next.next;
        removed.next = null;

        return dummy.next;
    }
}
```

## 876. Middle of the Linked List

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
    public ListNode middleNode(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;
    }
}
```

## 202. Happy Number

If a number is a "happy number", it will eventually converge to 1, otherwise it will fall into a infinite "unhappy number" loop. 

Thus we can use Floyd's cycle detection algorithm to solve this problem. The slow pointer calculate the sum of digit square once per loop, and the fast pointer calculate the sum of digit square twice per loop, finally they will meet. 

```java
class Solution {
    private int digitSquareSum(int n) {
        int sum = 0;
        while (n != 0) {
            int tmp = n % 10;
            sum += tmp * tmp;
            n /= 10;
        }
        return sum;
    }

    public boolean isHappy(int n) {
        int slow = n;
        int fast = n;
        do {
            slow = digitSquareSum(slow);
            fast = digitSquareSum(fast);
            fast = digitSquareSum(fast);
        } while (slow != fast);
        
        return slow == 1;
    }
}
```

## 287. Find the Duplicate Number

If there is no duplicate in the array, the mapping `f(index) = num` must be one to one, otherwise the mapping is many to one.

If we linked all the mappings up we can reduce this problem to cycle detection. In an array with duplicate numbers, there must be at least two `indexes` mapped to the same `num`, one of the `indexes` belongs to the cycle, the other belongs to the "straight line", thus the cycle entrance is the `num`.

```java
class Solution {
    public int findDuplicate(int[] nums) {
        int slow = nums[0];
        int fast = nums[0];
        do {
            slow = nums[slow];
            fast = nums[nums[fast]];
        } while (slow != fast);
        
        int ptr1 = slow;
        int ptr2 = nums[0];
        while (ptr1 != ptr2) {
            ptr1 = nums[ptr1];
            ptr2 = nums[ptr2];
        }
        return ptr1;
    }
}
```



