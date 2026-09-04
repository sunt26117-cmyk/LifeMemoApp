// lib/screens/checkin/check_in_manage_screen.dart
// TASK-EXT-02：打卡类型管理（编辑/停用/启用）。
// 关键约束：无删除入口；label 限中文 1-3 字符（复用 CheckInType.isValidLabel）。
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import 'package:ai_life_recorder/models/check_in_type.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';

class CheckInManageScreen extends StatefulWidget {
  const CheckInManageScreen({super.key});

  @override
  State<CheckInManageScreen> createState() => _CheckInManageScreenState();
}

class _CheckInManageScreenState extends State<CheckInManageScreen> {
  bool _loading = true;
  List<CheckInType> _types = [];

  @override
  void initState() {
    super.initState();
    _reload();
  }

  Future<void> _reload() async {
    final types = await context.read<Repositories>().checkInTypes.listAll();
    if (!mounted) return;
    setState(() {
      _types = types;
      _loading = false;
    });
  }

  Future<void> _edit(CheckInType? type) async {
    final symbolController = TextEditingController(text: type?.symbol ?? '');
    final labelController = TextEditingController(text: type?.label ?? '');
    final formKey = GlobalKey<FormState>();
    final isNew = type == null;

    final repo = context.read<Repositories>().checkInTypes;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isNew ? '新增打卡类型' : '编辑打卡类型'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: symbolController,
                maxLength: 4,
                decoration: const InputDecoration(
                  labelText: '符号（emoji）',
                  border: OutlineInputBorder(),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? '请输入符号' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: labelController,
                decoration: const InputDecoration(
                  labelText: '名称（1-3 个中文字符）',
                  border: OutlineInputBorder(),
                ),
                validator: (v) {
                  final label = v?.trim() ?? '';
                  if (!CheckInType.isValidLabel(label)) {
                    return '请输入 1-3 个中文字符';
                  }
                  return null;
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('取消'),
          ),
          ElevatedButton(
            onPressed: () {
              if (formKey.currentState?.validate() ?? false) {
                Navigator.of(ctx).pop(true);
              }
            },
            child: const Text('保存'),
          ),
        ],
      ),
    );

    if (ok != true) return;
    final maxOrder = _types.isEmpty
        ? 0
        : _types.map((e) => e.sortOrder).reduce((a, b) => a > b ? a : b);
    final updated = CheckInType(
      id: type?.id ?? const Uuid().v4(),
      symbol: symbolController.text.trim(),
      label: labelController.text.trim(),
      sortOrder: type?.sortOrder ?? maxOrder + 1,
      enabled: type?.enabled ?? true,
      createdAt: type?.createdAt,
    );
    await repo.save(updated);
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(isNew ? '已新增' : '已保存')));
    await _reload();
  }

  Future<void> _toggle(CheckInType t) async {
    await context.read<Repositories>().checkInTypes.setEnabled(t.id, !t.enabled);
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(t.enabled ? '已停用' : '已启用')));
    await _reload();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('打卡类型管理'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: '新增类型',
            onPressed: () => _edit(null),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _types.isEmpty
              ? const Center(child: Text('暂无打卡类型，点击右上角添加'))
              : ListView.separated(
                  itemCount: _types.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, idx) {
                    final t = _types[idx];
                    return ListTile(
                      leading: Text(t.symbol,
                          style: const TextStyle(fontSize: 24)),
                      title: Text(t.label),
                      subtitle: Text(t.enabled ? '已启用' : '已停用',
                          style: TextStyle(
                              color: t.enabled
                                  ? Colors.green
                                  : Colors.grey)),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit_outlined),
                            tooltip: '编辑',
                            onPressed: () => _edit(t),
                          ),
                          Switch(
                            value: t.enabled,
                            onChanged: (_) => _toggle(t),
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
