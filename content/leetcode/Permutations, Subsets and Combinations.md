---
title: "Permutations, Subsets and Combinations"
date: 2020-02-23T19:12:29+08:00
draft: false
summary: "Classic backtracking problems"
categories: ["LeetCode"]
tags: ["Backtracking"]
---

## Template

```python
result = []
def backtrack(path, option_list):
    # base case
    if satisify the output formaT:
        result.add(path)
        return
    
    for option in option_list:
        make a decision
        backtrack(path, option_list)
        withdraw the decision
```

It is absolutely vital to **draw a backtracking tree** when solving a backtracking problem, which is helpful to get the condition of the base case.

## 46. Permutations

```c++
class Solution {
public:
    void backtrack(vector<int>& nums, vector<int>& path, vector<vector<int>>& res, vector<int>& visited) {
        if (path.size() == nums.size()) {
            res.push_back(path);
            return;
        }

        // No need to exclude used numbers, but need to exclude invalid combinations
        for (int i = 0; i < nums.size(); i++) {
            if (visited[i] == 1) continue;

            // make a decision
            path.push_back(nums[i]);
            visited[i] = 1;
            
            backtrack(nums, path, res, visited);
			
            // withdraw the decision
            visited[i] = 0;
            path.pop_back();
        }
    }

    vector<vector<int>> permute(vector<int>& nums) {
        vector<vector<int>> res;
        vector<int> path;
        vector<int> visited(nums.size(), 0);
        backtrack(nums, path, res, visited);
        return res;
    }
};
```



## 77. Combinations

```c++
class Solution {
public:
    void backtrack(int start, const int k, const int n, vector<int>& path, vector<vector<int>>& res) {
        if (path.size() == k) {
            res.push_back(path);
            return;
        }
        // Each cycle starts with "start" to exclude selected numbers
        for (int i = start; i <= n; i++) {
            // make a decision
            path.push_back(i);
            
            backtrack(i + 1, k, n, path, res);
            
            // withdraw the decision
            path.pop_back();
        }
    }

    vector<vector<int>> combine(int n, int k) {
        vector<vector<int>> res;
        if (n <= 0 || k <= 0) {
            return res;
        }
        vector<int> path;
        backtrack(1, k, n, path, res);
        return res;
    }
};
```



## 78. Subsets

```c++
class Solution {
public:
    void backtrack(int start, vector<int>& nums, vector<int>& path, vector<vector<int>>& res) {
        res.push_back(path);
        
        // Each cycle starts with "start" to exclude used numbers
        for (int i = start; i < nums.size(); i++) {
            // make a decision
            path.push_back(nums[i]);

            // backtracking
            backtrack(i + 1, nums, path, res);

            // withdraw the decision
            path.pop_back();
        }
    }

    vector<vector<int>> subsets(vector<int>& nums) {
        vector<vector<int>> res;
        vector<int> path;
        backtrack(0, nums, path, res);
        return res;
    }
};
```

## Reference

[回溯算法团灭排列/组合/子集问题](https://mp.weixin.qq.com/s?__biz=MzAxODQxMDM0Mw==&mid=2247485007&idx=1&sn=ceb42ba2f341af34953d158358c61f7c&chksm=9bd7f847aca071517fe0889d2679ead78b40caf6978ebc1d3d8355d6693acc7ec3aca60823f0&mpshare=1&scene=1&srcid=&sharer_sharetime=1582212599135&sharer_shareid=ce032d2ac3c0ffa094beb1f6c1188245&key=c18083f5f50f04278f8504d8b376af735b4bb212d64970c5510247d81a754ae750102df9fd15ea24ad1b826c72dc29cd80c60ad5f615cfdecc354ebbdbb38734f9287d9133dde49faf367804d9dd38e6&ascene=1&uin=NzkwNTU4NTYz&devicetype=Windows+10&version=62080079&lang=zh_CN&exportkey=AwG%2FcmXnZA8eYlk62IasoeM%3D&pass_ticket=Hl9XO%2Fo8jo8DSXyn7cTzYXk%2BE6KyZQIR19HKPx%2FdhbbpdgXdO0bwZOHeitc1xSdn)

