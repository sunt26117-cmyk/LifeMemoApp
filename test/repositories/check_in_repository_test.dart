import 'package:flutter_test/flutter_test.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/models/check_in_type.dart';
import 'package:ai_life_recorder/models/check_in_record.dart';

void main() {
  late Repositories repos;
  setUp(() {
    repos = Repositories.inMemory();
  });

  // 需求：系统初始化 5 个默认类型
  test('seedDefaults 初始化 5 个默认类型且可查', () async {
    await repos.checkInTypes.seedDefaults();
    final all = await repos.checkInTypes.listAll();
    expect(all.length, 5);
    expect(all.map((e) => e.symbol).toList(), ['📖', '🏃', '🚶', '🧘', '📚']);
    expect(all.map((e) => e.label).toList(), ['学习', '运动', '散步', '冥想', '阅读']);
    final enabled = await repos.checkInTypes.listEnabled();
    expect(enabled.length, 5);
  });
  test('seedDefaults 幂等：重复调用不产生重复行', () async {
    await repos.checkInTypes.seedDefaults();
    await repos.checkInTypes.seedDefaults();
    final all = await repos.checkInTypes.listAll();
    expect(all.length, 5);
  });

  // 需求：类型不允许物理删除，只能编辑/停用/启用
  test('类型停用后 listEnabled 不再返回，但 listAll 仍保留（无物理删除）', () async {
    await repos.checkInTypes.seedDefaults();
    final studyId = CheckInType.defaults().first.id;
    await repos.checkInTypes.setEnabled(studyId, false);
    final enabled = await repos.checkInTypes.listEnabled();
    expect(enabled.any((e) => e.id == studyId), isFalse);
    final all = await repos.checkInTypes.listAll();
    expect(all.length, 5);
    final got = await repos.checkInTypes.getById(studyId);
    expect(got, isNotNull);
    expect(got!.enabled, isFalse);
  });
  test('重新启用后再次可选', () async {
    await repos.checkInTypes.seedDefaults();
    final studyId = CheckInType.defaults().first.id;
    await repos.checkInTypes.setEnabled(studyId, false);
    await repos.checkInTypes.setEnabled(studyId, true);
    final enabled = await repos.checkInTypes.listEnabled();
    expect(enabled.any((e) => e.id == studyId), isTrue);
  });

  // 需求：停用后类型仍可通过历史记录查到 symbolSnapshot（快照防语义漂移）
  test('类型停用后历史打卡记录仍可查到 symbolSnapshot/labelSnapshot', () async {
    await repos.checkInTypes.seedDefaults();
    final study = CheckInType.defaults().first;
    final day = DateTime(2026, 8, 1);
    await repos.checkInRecords.upsert(CheckInRecord.create(
      id: 'rec-1',
      date: day,
      typeId: study.id,
      symbol: study.symbol,
      label: study.label,
    ));
    // 停用该类型
    await repos.checkInTypes.setEnabled(study.id, false);
    // 历史记录按类型/按日期仍可查到，快照字段完整
    final byType = await repos.checkInRecords.listByType(study.id);
    expect(byType.length, 1);
    expect(byType.first.symbolSnapshot, '📖');
    expect(byType.first.labelSnapshot, '学习');
    final byDate = await repos.checkInRecords.listByDate(day);
    expect(byDate.length, 1);
    expect(byDate.first.labelSnapshot, '学习');
  });

  // 需求：同一天同一类型只能有一条最终记录（覆盖式，不追加）
  test('同一天同类型二次写入覆盖而非新增行', () async {
    final day = DateTime(2026, 8, 1);
    const typeId = '00000000-0000-4000-8000-000000000001';
    await repos.checkInRecords.upsert(CheckInRecord.create(
      id: 'rec-a',
      date: day,
      typeId: typeId,
      symbol: '📖',
      label: '学习',
    ));
    await repos.checkInRecords.upsert(CheckInRecord.create(
      id: 'rec-b',
      date: day,
      typeId: typeId,
      symbol: '📚',
      label: '阅读',
    ));
    final byDate = await repos.checkInRecords.listByDate(day);
    expect(byDate.length, 1);
    final got = await repos.checkInRecords.getByDateAndType(day, typeId);
    expect(got, isNotNull);
    expect(got!.id, 'rec-b'); // 最新一次覆盖
    expect(got.symbolSnapshot, '📚');
  });
  test('不同日期同一类型各自独立保留', () async {
    const typeId = '00000000-0000-4000-8000-000000000001';
    await repos.checkInRecords.upsert(CheckInRecord.create(
      id: 'rec-d1',
      date: DateTime(2026, 8, 1),
      typeId: typeId,
      symbol: '📖',
      label: '学习',
    ));
    await repos.checkInRecords.upsert(CheckInRecord.create(
      id: 'rec-d2',
      date: DateTime(2026, 8, 2),
      typeId: typeId,
      symbol: '📖',
      label: '学习',
    ));
    final byDate = await repos.checkInRecords.listByDate(DateTime(2026, 8, 1));
    expect(byDate.length, 1);
    final all = await repos.checkInRecords.listByType(typeId);
    expect(all.length, 2);
  });

  // 记录删除（清空当天）与范围查询
  test('deleteByDateAndType 只删除目标日的目标类型', () async {
    const typeId = '00000000-0000-4000-8000-000000000001';
    await repos.checkInRecords.upsert(CheckInRecord.create(
      id: 'rec-1',
      date: DateTime(2026, 8, 1),
      typeId: typeId,
      symbol: '📖',
      label: '学习',
    ));
    await repos.checkInRecords.upsert(CheckInRecord.create(
      id: 'rec-2',
      date: DateTime(2026, 8, 1),
      typeId: '00000000-0000-4000-8000-000000000002',
      symbol: '🏃',
      label: '运动',
    ));
    await repos.checkInRecords
        .deleteByDateAndType(DateTime(2026, 8, 1), typeId);
    final byDate = await repos.checkInRecords.listByDate(DateTime(2026, 8, 1));
    expect(byDate.length, 1);
    expect(byDate.first.labelSnapshot, '运动');
  });
  test('listByRange 闭区间命中', () async {
    const typeId = '00000000-0000-4000-8000-000000000001';
    for (final d in [DateTime(2026, 8, 1), DateTime(2026, 8, 3)]) {
      await repos.checkInRecords.upsert(CheckInRecord.create(
        id: 'rec-${d.day}',
        date: d,
        typeId: typeId,
        symbol: '📖',
        label: '学习',
      ));
    }
    final res = await repos.checkInRecords
        .listByRange(DateTime(2026, 8, 1), DateTime(2026, 8, 2));
    expect(res.length, 1);
    expect(res.first.date, DateTime(2026, 8, 1));
  });
}
