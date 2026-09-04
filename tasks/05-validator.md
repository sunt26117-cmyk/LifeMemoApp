# T05 校验器（先写测试，R11）

实现 lib/utils/validator.dart 严格按 AGENTS.md §9.2。

## 测试用例（test/utils/validator_test.dart，≥15 条，逐条列出再实现）

1. 合法输出通过
2. 六字段任一为空触发 V1
3. 黑名单词每类至少 2 条触发 V2（心理类："安全感"、"疗愈"；人格类："性格"、"你总是"）
4. 编造 memoryId/photoId 触发 V3
5. 「要多沟通」触发 V4（非动词+太短）
6. 「制定沟通前确认清单」通过 V4
7. 含「可能因为」触发 V5
8. 含「也许是你」触发 V5
9. 合法 id 引用通过 V3
10. violations 返回正确的 rule 编号
11. suggestedTask=null 且其他合法 → 通过（suggestedTask 允许空）
12. citations 空对象 → 通过
13. nextSuggestion="你应该感到开心" → V5 触发
14. 多违规同时存在 → violations 包含全部
15. 无违规 → passed=true 且 violations 为空列表

## 验证
flutter analyze + flutter test 全绿，validator 测试 ≥15 条全过
