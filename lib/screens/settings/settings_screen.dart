import 'package:flutter/material.dart';
import 'package:ai_life_recorder/screens/checkin/check_in_manage_screen.dart';
import 'package:ai_life_recorder/screens/checkin/check_in_calendar_screen.dart';
import 'package:ai_life_recorder/screens/growth/growth_curve_screen.dart';
import 'package:ai_life_recorder/services/key_repository.dart';
import 'package:ai_life_recorder/screens/note/note_list_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late TextEditingController _apiKeyController;
  bool _testing = false;
  @override
  void initState() {
    super.initState();
    _apiKeyController =
        TextEditingController(text: KeyStore.instance.apiKey ?? '');
  }

  @override
  void dispose() {
    _apiKeyController.dispose();
    super.dispose();
  }

  void _showSnack(String text) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  Future<void> _onSave() async {
    final key = _apiKeyController.text.trim();
    await KeyStore.instance.saveApiKey(key);
    if (!mounted) return;
    _showSnack('已保存');
  }

  Future<void> _onTest() async {
    final key = _apiKeyController.text.trim();
    if (key.isEmpty) {
      _showSnack('请输入 Key 后再测试');
      return;
    }
    setState(() {
      _testing = true;
    });
    try {
      final ok = await KeyStore.instance.testApiKey(key);
      if (ok) {
        _showSnack('Key 有效');
      } else {
        _showSnack('Key 无效或网络错误');
      }
    } catch (_) {
      _showSnack('网络错误');
    } finally {
      if (mounted) {
        setState(() {
          _testing = false;
        });
      }
    }
  }

  Future<void> _onDelete() async {
    await KeyStore.instance.clearApiKey();
    if (!mounted) return;
    _apiKeyController.clear();
    _showSnack('已删除');
  }

  void _showHowToDialog() {
    showDialog<void>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('如何获取 DeepSeek Key'),
          content: const SingleChildScrollView(
            child: Text(
              '1. 打开 DeepSeek 平台（例如 platform.deepseek.com）并登录或注册账号。\n'
              '2. 在控制台或 API Keys 页面创建新的 API Key。\n'
              '3. 复制生成的 Key（形如 sk-...），在本页面粘贴并保存。\n\n'
              '注意：本应用仅将 Key 保存在本机应用沙箱（未加密），不会打包进 APK。请妥善保管，不要在不受信任的设备上保存。',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('知道了'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('设置'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _apiKeyController,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'DeepSeek API Key',
              hintText: 'sk-...',
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 48,
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: _onSave,
                    child: const Text('保存'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _testing ? null : _onTest,
                    child: _testing
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2))
                        : const Text('测试'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: _onDelete,
                    child: const Text('删除'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Key 仅保存在本机应用沙箱（非加密），不会打包进 APK。个人自用请妥善保管。',
            style: TextStyle(color: Colors.grey, fontSize: 12),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: _showHowToDialog,
            child: const Text('如何获取 DeepSeek Key'),
          ),
          const Divider(height: 32),
          ListTile(
            leading: const Icon(Icons.fact_check_outlined),
            title: const Text('打卡类型管理'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CheckInManageScreen()),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.calendar_month_outlined),
            title: const Text('日历打卡'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => const CheckInCalendarScreen()),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.edit_note_outlined),
            title: const Text('小记'),
            subtitle: const Text('随手记，AI 可选整理'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const NoteListScreen()),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.trending_up_rounded),
            title: const Text('成长曲线'),
            subtitle: const Text('周/月/年坡度 + AI 分析'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const GrowthCurveScreen()),
              );
            },
          ),
        ],
      ),
    );
  }
}
