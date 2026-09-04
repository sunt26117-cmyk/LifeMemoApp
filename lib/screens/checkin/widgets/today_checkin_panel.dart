// lib/screens/checkin/widgets/today_checkin_panel.dart
import 'package:flutter/material.dart';
import 'package:ai_life_recorder/models/check_in_type.dart';

/// 今天打卡底部多选面板（TASK-EXT-03）。
/// 只显示 symbol（emoji），多个类型 chip 可多选；提交为覆盖式集合。
class TodayCheckInPanel extends StatefulWidget {
  final List<CheckInType> types;
  final List<String> initialSelectedTypeIds;
  final ValueChanged<List<String>> onSubmit;
  const TodayCheckInPanel({
    super.key,
    required this.types,
    required this.initialSelectedTypeIds,
    required this.onSubmit,
  });

  @override
  State<TodayCheckInPanel> createState() => _TodayCheckInPanelState();
}

class _TodayCheckInPanelState extends State<TodayCheckInPanel> {
  late final Set<String> _selected;

  @override
  void initState() {
    super.initState();
    _selected = widget.initialSelectedTypeIds.toSet();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              '选择打卡类型',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 12,
              runSpacing: 12,
              children: widget.types.map((t) {
                final selected = _selected.contains(t.id);
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      if (selected) {
                        _selected.remove(t.id);
                      } else {
                        _selected.add(t.id);
                      }
                    });
                  },
                  child: Container(
                    width: 56,
                    height: 56,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: selected
                          ? Theme.of(context).colorScheme.primary
                          : Colors.grey.shade100,
                      border: Border.all(
                        color: selected
                            ? Theme.of(context).colorScheme.primary
                            : Colors.transparent,
                      ),
                    ),
                    child: Text(
                      t.symbol,
                      style: const TextStyle(fontSize: 24),
                    ),
                  ),
                );
              }).toList(),
            ),
            if (widget.types.isEmpty) ...[
              const SizedBox(height: 12),
              const Center(
                child: Text(
                  '暂无启用的打卡类型，请先到「打卡类型管理」添加',
                  style: TextStyle(color: Colors.grey, fontSize: 13),
                ),
              ),
            ],
            const SizedBox(height: 16),
            SizedBox(
              height: 48,
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('取消'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        widget.onSubmit(_selected.toList());
                        Navigator.of(context).pop();
                      },
                      child: const Text('保存'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
