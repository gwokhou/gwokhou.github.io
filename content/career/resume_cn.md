---
title: "后端开发工程师"
date: 2020-04-16T14:14:04+08:00
draft: true
summary: "我的中文简历"
categories: ["career"]
---

## 个人资料

* 张国昊 / 1996.06 
* 东南大学成贤学院 / 软件工程 / 2016.09 - 2020.07
* 联系方式：📧 akidezhang@outlook.com / 📞 150-1313-3537 / 微信 judechangjc
* 技术博客：https://gwokhou.github.io

## 技能清单

* Java基础扎实，读过部分容器类和并发包的源代码，掌握JVM基础知识和并发机制原理
* 掌握Go语言，了解其基本类型和并发工具
* 熟悉MySQL的使用，了解索引优化、事务等等
* 掌握Redis的使用，了解其持久化的原理，也了解Bloom Filter等
* 熟悉MapReduce和Google File System，知道它们的架构和部分细节

## 项目经历

### MapReduce库

该项目是MIT分布式系统课程的项目，是个使用Go语言编写的迷你MapReduce库，实现了Google经典分布式系统论文*MapReduce* 中所描述的大部分features。

在这个项目中，我阅读论文并学习Go语言，完成了系统的几个核心部分：map和reduce阶段的执行流程、任务自动调度和并行化、worker failures容错处理。随后也编写了自己的map和reduce函数作为系统参数传入，用RPC模拟分布式计算，实现了分布式的英文文本词频统计。

### 教育教学成果管理系统

以往我校依靠人工方式收集学生竞赛获奖证明，费时费力难以归档统计，亟需数字化管理，于是我和同学共同帮助学校开发了这个信息管理系统。系统的主要业务有：上传图片、记录审核、批量下载等等。

在这个项目中，我主导了需求分析和数据库Schema设计，使用Spring Boot和MyBatis实现了用户管理和记录管理的后端API，并查阅MySQL技术书籍对主要的查询语句做了索引优化，使其速度大大提高。最后项目成功上线，为全校数千名师生提供服务：http://eta.cxxy.seu.edu.cn