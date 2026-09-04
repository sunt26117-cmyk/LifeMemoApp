import 'package:flutter_dotenv/flutter_dotenv.dart';

class Env {
  static bool available = false;
  static Future<bool> load() async {
    try {
      await dotenv.load(fileName: '.env');
      available = true;
      return true;
    } catch (_) {
      available = false;
      return false;
    }
  }

  static String? get(String key) {
    // dotenv 未初始化时（如纯 Dart 测试环境）返回 null，不抛异常
    String? v;
    try {
      v = dotenv.env[key];
    } catch (_) {
      return null;
    }
    if (v == null) return null;
    return v.trim();
  }

  static String? get supabaseUrl => get('SUPABASE_URL');
  static String? get supabaseAnonKey => get('SUPABASE_ANON_KEY');
  static String? get aiBaseUrl => get('AI_BASE_URL');
  static String? get aiApiKey => get('AI_API_KEY');
  static String? get aiModel => get('AI_MODEL');
  static String? get aiMode => get('AI_MODE');
}
