import 'dart:async';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:ai_life_recorder/config/env.dart';

class AiException implements Exception {
  final String message;
  AiException(this.message);
  @override
  String toString() => 'AiException: $message';
}

class AiNetworkException extends AiException {
  AiNetworkException(super.message);
}

class AiApiException extends AiException {
  final int? statusCode;
  AiApiException(super.message, {this.statusCode});
  @override
  String toString() => 'AiApiException(statusCode:$statusCode): $message';
}

class AiKeyMissingException extends AiException {
  AiKeyMissingException(super.message);
  @override
  String toString() => 'AiKeyMissingException: $message';
}

class AiParseException extends AiException {
  final String rawText;
  AiParseException(super.message, this.rawText);
  @override
  String toString() => 'AiParseException: $message\nraw: $rawText';
}

class AiClient {
  final Dio _dio;
  String? _apiKey;
  final String _model;
  AiClient({Dio? dio, String? baseUrl, String? apiKey, String? model})
      : _dio = dio ??
            Dio(BaseOptions(
              baseUrl: baseUrl ?? Env.aiBaseUrl ?? 'https://api.deepseek.com',
              connectTimeout: const Duration(seconds: 30),
              receiveTimeout: const Duration(seconds: 60),
              headers: const {'Content-Type': 'application/json'},
            )),
        _apiKey = apiKey ?? Env.aiApiKey,
        _model = model ?? Env.aiModel ?? 'deepseek-chat' {
    if (_apiKey != null && _apiKey!.isNotEmpty) {
      _dio.options.headers['Authorization'] = 'Bearer $_apiKey';
    }
  }
  void setApiKey(String? apiKey) {
    _apiKey = apiKey;
    if (_apiKey != null && _apiKey!.isNotEmpty) {
      _dio.options.headers['Authorization'] = 'Bearer $_apiKey';
    } else {
      _dio.options.headers.remove('Authorization');
    }
  }

  bool get hasApiKey => _apiKey != null && _apiKey!.isNotEmpty;

  Future<String> chat({
    required String systemPrompt,
    required String userPrompt,
    bool jsonMode = false,
  }) async {
    if (!hasApiKey) {
      throw AiKeyMissingException('AI API key not set');
    }
    // 节流已移除（2026-08-31：DeepSeek 改为并发+429 退避模型，固定 2s sleep 不再必要）
    final payload = <String, dynamic>{
      'model': _model,
      'messages': [
        {'role': 'system', 'content': systemPrompt},
        {'role': 'user', 'content': userPrompt},
      ],
      'temperature': 0.7,
      if (jsonMode) 'response_format': {'type': 'json_object'},
    };

    int attempts = 0;
    while (true) {
      attempts += 1;
      try {
        final response = await _dio.post('/chat/completions', data: payload);
        final data = response.data;
        if (data == null) {
          throw AiApiException('Empty response from AI',
              statusCode: response.statusCode);
        }
        try {
          final choices = data['choices'];
          if (choices is List && choices.isNotEmpty) {
            final first = choices[0];
            final message = first['message'];
            final content = message != null ? message['content'] : null;
            if (content is String) {
              return content;
            }
            // EXT-09：content 为数组（部分供应商返回分段内容）→ 拼接 text 段
            if (content is List) {
              final parts = content
                  .whereType<Map>()
                  .map((m) => m['text'])
                  .whereType<String>()
                  .toList();
              if (parts.isNotEmpty) return parts.join('\n');
            }
          }
        } catch (_) {}
        if (data is Map && data.containsKey('choices')) {
          final choices = data['choices'];
          if (choices is List && choices.isNotEmpty) {
            final first = choices[0];
            if (first is Map) {
              final content = first['message']?['content'];
              if (content is String) return content;
              if (content is List) {
                final parts = content
                    .whereType<Map>()
                    .map((m) => m['text'])
                    .whereType<String>()
                    .toList();
                if (parts.isNotEmpty) return parts.join('\n');
              }
            }
          }
        }
        return data.toString();
      } on DioException catch (e) {
        final isTimeout = e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.receiveTimeout ||
            e.type == DioExceptionType.sendTimeout;
        final isConn = e.type == DioExceptionType.connectionError ||
            e.type == DioExceptionType.unknown;
        final status = e.response?.statusCode;
        // EXT-09：日志可打印 status/endpoint/错误类型，禁止打印 key（payload 中不含 key）
        if (status != null || isTimeout || isConn) {
          debugPrint('AiClient: status=$status type=${e.type} ');
        }
        // 超时与 5xx/429 都重试（最多 3 次尝试）
        final isServerError = (status != null && status >= 500 && status < 600);
        final shouldRetry = (status == 429) || isServerError || isTimeout;
        if (shouldRetry && attempts < 3) {
          final rawWait = 1 << (attempts - 1); // 1, 2, 4...
          final waitSeconds = rawWait > 4 ? 4 : rawWait;
          await Future.delayed(Duration(seconds: waitSeconds));
          continue;
        }
        if (status == 401 || status == 403) {
          throw AiApiException('AI 鉴权失败（status=$status）：请检查 API Key 是否正确',
              statusCode: status);
        }
        if (status == 400) {
          throw AiApiException('AI 请求参数错误（400）：请稍后重试或检查输入', statusCode: status);
        }
        if (status == 402) {
          throw AiApiException('AI 服务账户余额不足（402）', statusCode: status);
        }
        if (isConn || isTimeout) {
          throw AiNetworkException('AI 服务连接失败：${e.message}');
        }
        throw AiApiException('AI 请求失败（status=$status）：${e.message}',
            statusCode: status);
      } catch (e) {
        if (e is AiException) rethrow;
        throw AiException('Unexpected AI error: $e');
      }
    }
  }
}

String extractJson(String rawText) {
  var text = rawText.trim();
  final fenceStart = RegExp(r'```json', caseSensitive: false);
  if (fenceStart.hasMatch(text)) {
    text = text.replaceFirst(fenceStart, '');
    if (text.contains('```')) {
      final last = text.lastIndexOf('```');
      if (last >= 0) {
        text = text.substring(0, last);
      }
    }
  }
  text = text.trim();
  int startIndex = -1;
  int braceCount = 0;
  for (int i = 0; i < text.length; i++) {
    final ch = text[i];
    if (startIndex == -1 && (ch == '{' || ch == '[')) {
      startIndex = i;
      braceCount = 1;
      continue;
    } else if (startIndex != -1) {
      if (ch == '{' || ch == '[') {
        braceCount += 1;
      } else if (ch == '}' || ch == ']') {
        braceCount -= 1;
        if (braceCount == 0) {
          final candidate = text.substring(startIndex, i + 1).trim();
          try {
            json.decode(candidate);
            return candidate;
          } catch (_) {
            startIndex = -1;
            braceCount = 0;
          }
        }
      }
    }
  }
  try {
    json.decode(text);
    return text;
  } catch (_) {
    throw const FormatException('No valid JSON found in text');
  }
}
