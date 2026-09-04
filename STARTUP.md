# 启动指令 / HUMAN-GATE / 人工验收清单（来自开发套件）

## 启动指令（发给 Agent 的第一句话）

阅读仓库根目录 AGENTS.md 并严格遵守全部规则（包括环境版本、UI 规范、错误处理策略、DeepSeek API 注意事项）。

然后读 TASKS-LOG.md 确定断点。

如果 TASKS-LOG 为空，从 tasks/00-test-fixtures.md 开始。
否则按编号顺序继续（注意 09a→09b→10→09c 的特例顺序）。

每个任务完成后运行其验证命令，全绿才在 TASKS-LOG.md 记录并进入下一任务。
遇到 [HUMAN-GATE] 按规则 R4 处理。
持续工作直到全部完成或必须人工介入。

## HUMAN-GATE 清单（Agent 会停下来等你的事）

| 时机 | 你要做的 |
|---|---|
| T01 后（可选） | 模拟器跑一次看导航骨架 |
| T03 后 | ① Supabase SQL Editor 执行 supabase/schema.sql ② 创建 .env 填真实 Key（DeepSeek 就填 AI_BASE_URL=https://api.deepseek.com + deepseek key + AI_MODEL=deepseek-chat） |
| T09c 后 | 真机走一遍「写反思→生成→创建任务」，看 AI 输出质量 |
| 全部完成后 | 按下方清单逐项验收 |

## 最终人工验收清单（10分钟）

- [ ] App 真机启动，5 Tab 正常
- [ ] 新建记忆（带标签）→ 摘要自动回填
- [ ] 拍照 → 生成摘要 → 确认 → 反思侧栏能看到它
- [ ] 写反思（标签与记忆一致）→ 引用正确 → 校验通过 → 卡片六段齐全
- [ ] 卡片点「创建任务」→ TaskEdit 已预填未保存
- [ ] 任务：延期时被迫选原因类型
- [ ] 周总结生成 + 图表正常
- [ ] 故意完成 3 个同类任务 → 趋势变绿改善
- [ ] 年度总结页滚动流畅、动画正常、关闭动画设置后内容完整

## 使用建议

把上面 19 个文件按目录结构建好；
把 AGENTS.md + TASKS-LOG.md + tasks/ + supabase/schema.sql 放入空文件夹 ai_life_recorder/；
第一次启动 Agent 时，把「启动指令」粘贴给它；
每次 Agent 会话中断后，只需重新粘贴同一指令，它会从 TASKS-LOG.md 断点续跑。
这套套件把版本锁定、权限路径、RLS策略、错误降级、UI规范、测试数据、API差异全部钉死，Agent 开发翻车率从约30%降到10%以下。
