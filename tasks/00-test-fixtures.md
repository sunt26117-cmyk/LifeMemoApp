# T00 测试 Fixture 数据

在 test/fixtures/ 下创建以下文件，供 T11-T13 及全链路测试使用。

## memories_fixture.dart

5 条记忆，覆盖：
- 2 条带标签 ["沟通","项目"]
- 1 条带标签 ["学习"]
- 1 条无标签
- 1 条带标签 ["沟通","准备不足"]
时间分布：今天/昨天/3天前/1周前/1月前
content 长度 20-200 字不等，至少 2 条含 ai_summary

## photos_fixture.dart

3 条照片：
- 1 条 summary_confirmed=true, ai_summary="白板上写着项目进度", tags=["会议","项目"]
- 1 条 summary_confirmed=false, ai_summary="待确认摘要"
- 1 条无摘要, summary_confirmed=false

## reflections_fixture.dart

3 条反思，含完整 ai_summary JSON，其中：
- 1 条 citations.memoryIds 非空
- 1 条 suggestedTask 非空
- 1 条 is_user_confirmed=true

## tasks_fixture.dart

8 条任务，覆盖：
- 各状态各至少 1 条（未开始、进行中、已完成、延期、取消）
- 各分类各至少 1 条（沟通、学习、健康、项目、情绪、习惯、规划）
- 2 条含 feedback（1完成+1延期）
- 1 条含 steps JSON
- 3 条同 category="沟通"，用于趋势测试

## 使用规则

所有测试文件统一 `import '../fixtures/xxx_fixture.dart'`
禁止在测试中硬编码数据，必须用 fixture
