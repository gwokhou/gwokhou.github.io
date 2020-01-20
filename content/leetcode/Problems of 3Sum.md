---
title: "Problems of 3Sum"
date: 2020-01-12T13:42:29+08:00
draft: false
summary: "A problem set of 3Sum problems."
categories: ["LeetCode"]
tags: ["Two Pointers", "Problem Set"]
---

## 15. 3Sum

In this problem, we use three pointers to get **no repeating tuples**, one for iteration and two for shrinking the solution space.

```java
class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        if (nums == null || nums.length < 3) {
            return new ArrayList<>();
        }
        // quick sort
        Arrays.sort(nums);
        List<List<Integer>> lists = new ArrayList<>();
        for (int i = 0; i < nums.length; i++) {
            // no 3sum tuple in the rest of the sorted array
            if (nums[i] > 0) {
                return lists;
            }
            // If nums[i] is duplicated with nums[i - i], skips this round of loop.
            if (i > 0 && nums[i] == nums[i - 1]) {
                continue;
            }
            int left = i + 1;
            int right = nums.length - 1;
            while (left < right) {
                if (nums[i] + nums[left] + nums[right] == 0) {
                    lists.add(Arrays.asList(nums[i], nums[left], nums[right]));
                    // skips duplicated elements (if it exists)
                    while (left < right && nums[left] == nums[left + 1]) {
                        left = left + 1;
                    }
                    while (left < right && nums[right] == nums[right - 1]) {
                        right = right - 1;
                    }
                    // moves to the next element
                    left = left + 1;
                    right = right - 1;
                } else if (nums[i] + nums[left] + nums[right] > 0) {
                    right = right - 1;
                } else {
                    left = left + 1;
                }
            }
        }
        return lists;
    }
}
```

## 16. 3Sum Closest

```java
class Solution {
    public int threeSumClosest(int[] nums, int target) {
        // corner cases
        if (nums.length == 1) {
            return nums[0];
        }
        if (nums.length == 2) {
            int diff1 = Math.abs(nums[0] - target);
            int diff2 = Math.abs(nums[1] - target);
            return Math.min(diff1, diff2);
        }

        Arrays.sort(nums);
        int closestSum = nums[0] + nums[1] + nums[nums.length - 1];
        for (int i = 0; i < nums.length; i++) {
            // If nums[i] is duplicated with nums[i - i], skip this round of loop.
            if (i - 1 >= 0 && nums[i] == nums[i - 1]) {
                continue;
            }
            int left = i + 1;
            int right = nums.length - 1;
            while (left < right) {
                int sum = nums[i] + nums[left] + nums[right];
                if (sum > target) {
                    right--;
                } else if (sum < target){
                    left++;
                } else {
                    return sum;
                }
                int diffOld = Math.abs(closestSum - target);
                int diffNew = Math.abs(sum - target);
                if (diffNew < diffOld) {
                    closestSum = sum;
                }
            }
        }

        return closestSum;
    }
}
```

## 259. 3Sum Smaller

In this problem, we should count the numbers of tuples which is smaller than the `target`, and **we would not skip those duplicated tuples.**

```java
class Solution {
    public int threeSumSmaller(int[] nums, int target) {
        if (nums.length <= 2) {
            return 0;
        }

        Arrays.sort(nums);
        int count = 0;
        for (int i = 0; i < nums.length; i++) {
            int left = i + 1;
            int right = nums.length - 1;
            while (left < right) {  
                int sum = nums[i] + nums[left] + nums[right];
                if (sum < target) {
                    count += right - left;
                    left++;
                } else {
                    right--;
                }
            }
        }

        return count;
    }
}
```

## 18. 4Sum

In this problem, we use four pointers to get **no repeating tuples**, two for iteration and two for shrinking the solution space.

```java
class Solution {
    public List<List<Integer>> fourSum(int[] nums, int target) {
        // corner case
        List<List<Integer>> result = new ArrayList<>();
        if (nums == null || nums.length < 4) {
            return result;
        }

        Arrays.sort(nums);
        int length = nums.length;
        // the range of i is [0, length - 3), 
        // that is because there are always three elements
        // nums[j], nums[left] and nums[right] lining up on the right of nums[i],
        // thus the right excluding endpoint is (length - 3)
        for (int i = 0; i < length - 3; i++) {
            // skips duplicated i
            if (i > 0 && nums[i] == nums[i - 1]) {
                continue;
            }
            // if the minimum of i loops is larger than target, skips the rest
            int iMin = nums[i] + nums[i + 1] + nums[i + 2] + nums[i + 3];
            if (iMin > target) {
                break;
            }
            // if the maximum of i loops is smaller than target, ignore this round
            int iMax = nums[i] + nums[length - 3] + nums[length - 2] + nums[length - 1];
            if (iMax < target) {
                continue;
            }
            // the range of j is [i + 1, length - 2), 
            // that is because there are always two elements
            // nums[left] and nums[right] lining up on the right of nums[j],
            // thus the right excluding endpoint is (length - 2)
            for (int j = i + 1; j < length - 2; j++) {
                if (j > i + 1 && nums[j] == nums[j - 1]) {
                    continue;
                }
                int left = j + 1;
                int right = length - 1;
                // for a fixed nums[i],
                // if the minimum of j loops is larger than target, ignore this round
                int jMin = nums[i] + nums[j] + nums[left] + nums[left + 1];
                if (jMin > target) {
                    continue;
                }
                // for a fixed nums[i],
                // if the maximum of j loops is smaller than target, ignore this round
                int jMax = nums[i] + nums[j] + nums[right - 1] + nums[right];
                if (jMax < target) {
                    continue;
                }
                while (left < right) {
                    int sum = nums[i] + nums[j] + nums[left] + nums[right];
                    if (sum == target) {
                        result.add(
                            Arrays.asList(nums[i], nums[j], nums[left], nums[right]));
                        while (left < right && nums[left] == nums[left - 1]) {
                            left++;
                        }
                        while (left < right && nums[right] == nums[right + 1]) {
                            right--;
                        }
                        left++;
                        right--;
                    } else if (sum > target) {
                        right--;
                    } else {
                        left++;
                    }
                }
            }
        }
        return result;
    }
}
```

