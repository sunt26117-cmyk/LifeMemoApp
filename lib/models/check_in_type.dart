// lib/models/check_in_type.dart
//
// 打卡类型模型（TASK-EXT-01，对应需求 §3-§8 / §37）。
// 类型只能 编辑/停用/启用，不允许物理删除（无 delete 语义，停用用 enabled=false）。
// label 限中文 3 字符：数据层（本文件构造校验）与 UI 层（后续 EXT-02）都要校验。
class CheckInType {
  final String id;
  final String symbol; // emoji 符号，如 📖
  final String label; // 中文名称，最多 3 个中文字符
  final int sortOrder;
  final bool enabled;
  final DateTime createdAt;
  final DateTime updatedAt;

  /// label 最大长度（中文字符个数）。
  static const int maxLabelLength = 3;

  CheckInType({
    required this.id,
    required this.symbol,
    required String label,
    this.sortOrder = 0,
    this.enabled = true,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : label = label.trim(),
        createdAt = createdAt ?? DateTime.now().toUtc(),
        updatedAt = updatedAt ?? DateTime.now().toUtc() {
    final trimmed = this.label;
    if (!isValidLabel(trimmed)) {
      throw ArgumentError('打卡类型名称必须为 1-$maxLabelLength 个中文字符（当前："$label"）');
    }
  }

  /// 数据层校验：1-3 个字符且全部为中文字符（CJK 统一表意文字区）。
  /// UI 层（EXT-02 打卡管理页）也必须用同一规则校验输入。
  static bool isValidLabel(String label) {
    final trimmed = label.trim();
    if (trimmed.isEmpty || trimmed.length > maxLabelLength) return false;
    // 中文字符范围：\u4e00-\u9fff（CJK Unified Ideographs）。
    final chinese = RegExp(r'^[\u4e00-\u9fff]+$');
    return chinese.hasMatch(trimmed);
  }

  /// 系统默认的 5 个初始类型（首次启动 / InMemory 工厂初始化时 seed）。
  /// id 使用固定 UUID，保证 Supabase 侧 upsert 幂等（重复 seed 不产生重复行）。
  static List<CheckInType> defaults() {
    final now = DateTime.now().toUtc();
    return [
      CheckInType(
          id: '00000000-0000-4000-8000-000000000001',
          symbol: '📖',
          label: '学习',
          sortOrder: 0,
          createdAt: now,
          updatedAt: now),
      CheckInType(
          id: '00000000-0000-4000-8000-000000000002',
          symbol: '🏃',
          label: '运动',
          sortOrder: 1,
          createdAt: now,
          updatedAt: now),
      CheckInType(
          id: '00000000-0000-4000-8000-000000000003',
          symbol: '🚶',
          label: '散步',
          sortOrder: 2,
          createdAt: now,
          updatedAt: now),
      CheckInType(
          id: '00000000-0000-4000-8000-000000000004',
          symbol: '🧘',
          label: '冥想',
          sortOrder: 3,
          createdAt: now,
          updatedAt: now),
      CheckInType(
          id: '00000000-0000-4000-8000-000000000005',
          symbol: '📚',
          label: '阅读',
          sortOrder: 4,
          createdAt: now,
          updatedAt: now),
    ];
  }

  factory CheckInType.fromJson(Map<String, dynamic> json) {
    return CheckInType(
      id: json['id'] as String,
      symbol: json['symbol'] as String,
      label: json['label'] as String,
      sortOrder: (json['sort_order'] as num?)?.toInt() ?? 0,
      enabled: json['enabled'] as bool? ?? true,
      createdAt: json['created_at'] == null
          ? DateTime.now().toUtc()
          : DateTime.parse(json['created_at'] as String).toUtc(),
      updatedAt: json['updated_at'] == null
          ? DateTime.now().toUtc()
          : DateTime.parse(json['updated_at'] as String).toUtc(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'symbol': symbol,
      'label': label,
      'sort_order': sortOrder,
      'enabled': enabled,
      'created_at': createdAt.toUtc().toIso8601String(),
      'updated_at': updatedAt.toUtc().toIso8601String(),
    };
  }

  CheckInType copyWith({
    String? symbol,
    String? label,
    int? sortOrder,
    bool? enabled,
    DateTime? updatedAt,
  }) {
    return CheckInType(
      id: id,
      symbol: symbol ?? this.symbol,
      label: label ?? this.label,
      sortOrder: sortOrder ?? this.sortOrder,
      enabled: enabled ?? this.enabled,
      createdAt: createdAt,
      updatedAt: updatedAt ?? DateTime.now().toUtc(),
    );
  }
}
