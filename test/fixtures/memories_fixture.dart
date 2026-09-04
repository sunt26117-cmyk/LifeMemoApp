import 'package:ai_life_recorder/models/memory.dart';

final List<Memory> memoriesFixture = [
  Memory(
    id: 'mem-1',
    title: '与客户沟通记录',
    content: '今天与客户进行了深入沟通，讨论了项目需求、时间节点以及交付标准，双方达成初步共识，后续需要补充技术方案与验收标准。',
    tags: <String>['沟通', '项目'],
    aiSummary: '与客户达成初步共识，需补充技术方案与验收标准。',
    relatedMediaIds: <String>['photo-1'],
    createdAt: DateTime.now().toUtc(),
  ),
  Memory(
    id: 'mem-2',
    title: '学习笔记：Provider 用法',
    content:
        '复习了 Provider 的基本用法，记录了 ChangeNotifier 的实现细节与常见坑，计划在下周的迭代中实践并优化状态管理。',
    tags: <String>['学习'],
    aiSummary: '复习 Provider，记录实现细节与待实践项。',
    relatedMediaIds: <String>[],
    createdAt: DateTime.now().toUtc().subtract(const Duration(days: 1)),
  ),
  Memory(
    id: 'mem-3',
    title: '项目回顾',
    content: '回顾本次迭代发现沟通不及时导致需求反复，影响进度。建议下次明确验收标准并安排定期同步会议以减少误解。',
    tags: <String>['沟通', '准备不足'],
    aiSummary: null,
    relatedMediaIds: <String>['photo-2'],
    createdAt: DateTime.now().toUtc().subtract(const Duration(days: 3)),
  ),
  Memory(
    id: 'mem-4',
    title: null,
    content: '临时记录：今天早上感觉疲惫，可能是休息不足，计划今晚早点睡并减少咖啡摄入以改善睡眠质量。',
    tags: <String>[],
    aiSummary: null,
    relatedMediaIds: <String>[],
    createdAt: DateTime.now().toUtc().subtract(const Duration(days: 7)),
  ),
  Memory(
    id: 'mem-5',
    title: '月度总结',
    content: '本月完成多个里程碑，团队协作效率提升，但测试覆盖率与文档质量仍需改进，计划下月重点推进自动化测试与文档完善。',
    tags: <String>['沟通', '项目'],
    aiSummary: '完成里程碑，需提升测试覆盖率与文档质量，计划推进自动化测试。',
    relatedMediaIds: <String>[],
    createdAt: DateTime.now().toUtc().subtract(const Duration(days: 30)),
  ),
];
