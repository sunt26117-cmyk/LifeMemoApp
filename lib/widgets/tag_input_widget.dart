import 'package:flutter/material.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';

class TagInputWidget extends StatefulWidget {
  final List<String> initialTags;
  final ValueChanged<List<String>> onChanged;
  final String hint;
  const TagInputWidget({
    super.key,
    required this.initialTags,
    required this.onChanged,
    this.hint = '输入标签后回车添加',
  });
  @override
  State<TagInputWidget> createState() => _TagInputWidgetState();
}

class _TagInputWidgetState extends State<TagInputWidget> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  late List<String> _tags;
  @override
  void initState() {
    super.initState();
    _tags = List<String>.from(widget.initialTags);
  }

  @override
  void didUpdateWidget(covariant TagInputWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_listEquals(oldWidget.initialTags, widget.initialTags)) {
      setState(() {
        _tags = List<String>.from(widget.initialTags);
      });
    }
  }

  bool _listEquals(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  void _addTagFromInput() {
    final raw = _controller.text.trim();
    if (raw.isEmpty) return;
    if (raw.length > 20) return;
    if (_tags.contains(raw)) {
      _controller.clear();
      return;
    }
    setState(() {
      _tags.add(raw);
    });
    widget.onChanged(List<String>.from(_tags));
    _controller.clear();
    _focusNode.requestFocus();
  }

  void _removeTag(String tag) {
    setState(() {
      _tags.remove(tag);
    });
    widget.onChanged(List<String>.from(_tags));
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8.0,
          runSpacing: 8.0,
          children: _tags.map((t) {
            return InputChip(
              label: Text(
                t,
                style: const TextStyle(color: AppColors.primary),
              ),
              backgroundColor: AppColors.primary.withOpacity(0.1),
              onDeleted: () => _removeTag(t),
            );
          }).toList(),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _controller,
          focusNode: _focusNode,
          decoration: InputDecoration(
            hintText: widget.hint,
            border: const OutlineInputBorder(),
            isDense: true,
          ),
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _addTagFromInput(),
        ),
      ],
    );
  }
}
