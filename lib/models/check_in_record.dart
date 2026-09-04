// lib/models/check_in_record.dart
//
// 打卡记录模型（TASK-EXT-01，对应需求 §3-§8 / §37）。
// 覆盖式：同一天(date)同一类型(typeId)只保留一条最终记录。
// symbolSnapshot / labelSnapshot：写入时从 CheckInType 拷贝快照，
// 之后类型改名/改符号/停用都不影响历史记录的语义展示（防语义漂移）。
class CheckInRecord {
  final String id;

  /// 打卡的日历日（本地零点，仅年/月/日有意义）。
  final DateTime date;
  final String typeId;

  /// 来源任务标记（EXT-04 任务完成自动打卡用），与任务生命周期无关，
  /// 删除任务时该字段仅作来源标记保留（schema 不做外键级联）。
  final String? taskId;
  final String symbolSnapshot;
  final String labelSnapshot;
  final DateTime createdAt;
  final DateTime updatedAt;

  CheckInRecord({
    required this.id,
    required this.date,
    required this.typeId,
    this.taskId,
    required this.symbolSnapshot,
    required this.labelSnapshot,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : createdAt = createdAt ?? DateTime.now().toUtc(),
        updatedAt = updatedAt ?? DateTime.now().toUtc();

  /// 从打卡类型生成记录时自动带出快照（防历史语义漂移）。
  factory CheckInRecord.create({
    required String id,
    required DateTime date,
    required String typeId,
    String? taskId,
    required String symbol,
    required String label,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return CheckInRecord(
      id: id,
      date: date,
      typeId: typeId,
      taskId: taskId,
      symbolSnapshot: symbol,
      labelSnapshot: label,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  factory CheckInRecord.fromJson(Map<String, dynamic> json) {
    return CheckInRecord(
      id: json['id'] as String,
      date: DateTime.parse(json['date'] as String),
      typeId: json['type_id'] as String,
      taskId: json['task_id'] as String?,
      symbolSnapshot: json['symbol_snapshot'] as String? ?? '',
      labelSnapshot: json['label_snapshot'] as String? ?? '',
      createdAt: json['created_at'] == null
          ? DateTime.now().toUtc()
          : DateTime.parse(json['created_at'] as String).toUtc(),
      updatedAt: json['updated_at'] == null
          ? DateTime.now().toUtc()
          : DateTime.parse(json['updated_at'] as String).toUtc(),
    );
  }

  /// 与 Supabase date 列一致的纯日期 key。
  /// 决策：打卡的"同一天"按本地日历日界定（EXT-03 今天/过去/未来、同日覆盖都基于本地日），
  /// 故用 date 的本地年月日拼 key；时间戳字段仍按 R7 存 UTC。
  static String dateKey(DateTime d) {
    final y = d.year.toString().padLeft(4, '0');
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '$y-$m-$day';
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'date': dateKey(date),
      'type_id': typeId,
      'task_id': taskId,
      'symbol_snapshot': symbolSnapshot,
      'label_snapshot': labelSnapshot,
      'created_at': createdAt.toUtc().toIso8601String(),
      'updated_at': updatedAt.toUtc().toIso8601String(),
    };
  }

  CheckInRecord copyWith({
    String? id,
    DateTime? date,
    String? typeId,
    String? taskId,
    String? symbolSnapshot,
    String? labelSnapshot,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return CheckInRecord(
      id: id ?? this.id,
      date: date ?? this.date,
      typeId: typeId ?? this.typeId,
      taskId: taskId ?? this.taskId,
      symbolSnapshot: symbolSnapshot ?? this.symbolSnapshot,
      labelSnapshot: labelSnapshot ?? this.labelSnapshot,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? DateTime.now().toUtc(),
    );
  }
}
