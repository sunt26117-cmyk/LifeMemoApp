# T06 上下文检索

实现 lib/utils/context_retrieval.dart 按 AGENTS.md §9.3。
输入：ReflectionDraft{eventDescription,emotion,actionTaken,result,tags[]} 
     + 各 repo 数据（注入列表，不直接依赖 repo）。
输出：ContextPack。

## 测试
1. 3 条记忆（标签全匹配/仅时间近/无关）→ 顺序与取舍正确
2. 无匹配 → 四类空数组，不报错
3. summary_confirmed=false 的照片永不出现
4. 每类超过 5 条时只留 top5
5. 关键词提取：中文"沟通准备" → 提取"沟通"、"准备"（过滤"了"、"是"等停用词）

## 验证
flutter analyze + flutter test 全绿
