import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import 'package:ai_life_recorder/config/env.dart';

abstract class KeyRepository extends ChangeNotifier {
  Future<void> init();
  String? get apiKey;
  Future<void> saveApiKey(String key);
  Future<void> clearApiKey();
  Future<bool> testApiKey(String key);
}

class SharedPrefsKeyRepository extends ChangeNotifier implements KeyRepository {
  static const String kPrefsAiApiKey = 'ai_api_key';
  SharedPreferences? _prefs;
  String? _apiKey;
  SharedPrefsKeyRepository();
  @override
  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    _apiKey = _prefs!.getString(kPrefsAiApiKey);
    notifyListeners();
  }

  @override
  String? get apiKey => _apiKey;
  @override
  Future<void> saveApiKey(String key) async {
    if (_prefs == null) {
      await init();
    }
    await _prefs!.setString(kPrefsAiApiKey, key);
    _apiKey = key;
    notifyListeners();
  }

  @override
  Future<void> clearApiKey() async {
    if (_prefs == null) {
      await init();
    }
    await _prefs!.remove(kPrefsAiApiKey);
    _apiKey = null;
    notifyListeners();
  }

  @override
  Future<bool> testApiKey(String key) async {
    final base = Env.aiBaseUrl ?? 'https://api.deepseek.com';
    final dio = Dio(BaseOptions(
      baseUrl: base,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 20),
      headers: const {'Content-Type': 'application/json'},
    ));
    dio.options.headers['Authorization'] = 'Bearer $key';
    try {
      final resp = await dio.post('/chat/completions', data: {
        'model': Env.aiModel ?? 'deepseek-chat',
        'messages': [
          {'role': 'user', 'content': 'hi'}
        ],
        'max_tokens': 1
      });
      if (resp.statusCode == 200) {
        return true;
      } else if (resp.statusCode == 401 || resp.statusCode == 403) {
        return false;
      } else {
        return false;
      }
    } on DioException catch (e) {
      if (e.response != null) {
        final status = e.response?.statusCode;
        if (status == 401 || status == 403) {
          return false;
        }
      }
      return false;
    } catch (_) {
      return false;
    }
  }
}

class KeyStore {
  KeyStore._();
  static final SharedPrefsKeyRepository instance = SharedPrefsKeyRepository();
}
