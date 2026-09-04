import 'dart:convert';
import 'package:ai_life_recorder/ai/ai_client.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockDio extends Mock implements Dio {}

void main() {
  group('extractJson', () {
    test('合法 JSON 解析成功（含嵌套花括号）', () {
      const raw = '前言 { "a": {"b": [1,2,{"c":3}]}, "d": 4 } 后记';
      final extracted = extractJson(raw);
      final decoded = json.decode(extracted);
      expect(decoded['a']['b'][2]['c'], 3);
      expect(decoded['d'], 4);
    });
    test('带 ```json 围栏的解析成功', () {
      const raw = '```json\n{"x":1,"y":{"z":2}}\n```';
      final extracted = extractJson(raw);
      final decoded = json.decode(extracted);
      expect(decoded['x'], 1);
      expect(decoded['y']['z'], 2);
    });
    test('围栏+前后说明文字解析成功', () {
      const raw = '说明：如下\n```json\n[{"id":1},{"id":2}]\n```\n结束';
      final extracted = extractJson(raw);
      final decoded = json.decode(extracted);
      expect(decoded is List, true);
      expect(decoded.length, 2);
    });
    test('非法输入抛 FormatException', () {
      const raw = '没有 JSON 的纯文本';
      expect(() => extractJson(raw), throwsA(isA<FormatException>()));
    });
  });
  group('chat', () {
    late MockDio mockDio;
    setUp(() {
      mockDio = MockDio();
      when(() => mockDio.options).thenReturn(BaseOptions());
    });
    test('正常响应返回 choices[0].message.content', () async {
      final ai = AiClient(
          dio: mockDio, baseUrl: 'https://api.test', apiKey: 'sk-test');
      final responseData = {
        'choices': [
          {
            'message': {'content': 'hello from ai'}
          }
        ]
      };
      when(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .thenAnswer((_) async => Response(
                data: responseData,
                statusCode: 200,
                requestOptions: RequestOptions(path: '/chat/completions'),
              ));
      final res = await ai.chat(
        systemPrompt: 'sys',
        userPrompt: 'usr',
        jsonMode: false,
      );
      expect(res, 'hello from ai');
      verify(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .called(1);
    });
    test('data 为 null 抛 AiApiException', () async {
      final ai = AiClient(
          dio: mockDio, baseUrl: 'https://api.test', apiKey: 'sk-test');
      when(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .thenAnswer((_) async => Response(
                data: null,
                statusCode: 200,
                requestOptions: RequestOptions(path: '/chat/completions'),
              ));
      expect(
          () => ai.chat(systemPrompt: 's', userPrompt: 'u'),
          throwsA(allOf(
            isA<AiApiException>(),
          )));
      verify(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .called(1);
    });
    test('402 -> 抛 AiApiException 且不重试', () async {
      final ai = AiClient(
          dio: mockDio, baseUrl: 'https://api.test', apiKey: 'sk-test');
      final req = RequestOptions(path: '/chat/completions');
      when(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .thenThrow(DioException(
        requestOptions: req,
        response: Response(statusCode: 402, requestOptions: req),
        type: DioExceptionType.badResponse,
      ));
      expect(
          () => ai.chat(systemPrompt: 's', userPrompt: 'u'),
          throwsA(allOf(
            isA<AiApiException>(),
            predicate((AiApiException e) => e.statusCode == 402),
          )));
      verify(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .called(1);
    });
    test('首次 500 第二次成功 -> 返回结果且调用 2 次', () async {
      final ai = AiClient(
          dio: mockDio, baseUrl: 'https://api.test', apiKey: 'sk-test');
      final req = RequestOptions(path: '/chat/completions');
      var calls = 0;
      when(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .thenAnswer((_) async {
        calls++;
        if (calls == 1) {
          throw DioException(
            requestOptions: req,
            response: Response(statusCode: 500, requestOptions: req),
            type: DioExceptionType.badResponse,
          );
        }
        return Response(
          data: {
            'choices': [
              {
                'message': {'content': 'recovered'}
              }
            ]
          },
          statusCode: 200,
          requestOptions: RequestOptions(path: '/chat/completions'),
        );
      });
      final res = await ai.chat(systemPrompt: 's', userPrompt: 'u');
      expect(res, 'recovered');
      verify(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .called(2);
    }, timeout: const Timeout(Duration(seconds: 10)));
    test('429 -> 重试后成功，调用 2 次', () async {
      final ai = AiClient(
          dio: mockDio, baseUrl: 'https://api.test', apiKey: 'sk-test');
      final req = RequestOptions(path: '/chat/completions');
      var calls = 0;
      when(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .thenAnswer((_) async {
        calls++;
        if (calls == 1) {
          throw DioException(
            requestOptions: req,
            response: Response(statusCode: 429, requestOptions: req),
            type: DioExceptionType.badResponse,
          );
        }
        return Response(
          data: {
            'choices': [
              {
                'message': {'content': 'ok after retry'}
              }
            ]
          },
          statusCode: 200,
          requestOptions: RequestOptions(path: '/chat/completions'),
        );
      });
      final res = await ai.chat(systemPrompt: 's', userPrompt: 'u');
      expect(res, 'ok after retry');
      verify(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .called(2);
    }, timeout: const Timeout(Duration(seconds: 10)));
    test('content 为数组时解析其中的 text 字段（兼容不同供应商）', () async {
      final ai = AiClient(
          dio: mockDio, baseUrl: 'https://api.test', apiKey: 'sk-test');
      final responseData = {
        'choices': [
          {
            'message': {
              'content': [
                {'type': 'text', 'text': 'array content reply'}
              ]
            }
          }
        ]
      };
      when(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .thenAnswer((_) async => Response(
                data: responseData,
                statusCode: 200,
                requestOptions: RequestOptions(path: '/chat/completions'),
              ));
      final res = await ai.chat(systemPrompt: 's', userPrompt: 'u');
      expect(res, 'array content reply');
    });
    test('401 -> AiApiException 带鉴权中文提示且不重试', () async {
      final ai = AiClient(
          dio: mockDio, baseUrl: 'https://api.test', apiKey: 'sk-test');
      final req = RequestOptions(path: '/chat/completions');
      when(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .thenThrow(DioException(
        requestOptions: req,
        response: Response(statusCode: 401, requestOptions: req),
        type: DioExceptionType.badResponse,
      ));
      expect(
          () => ai.chat(systemPrompt: 's', userPrompt: 'u'),
          throwsA(allOf(
            isA<AiApiException>(),
            predicate((AiApiException e) => e.message.contains('API Key')),
          )));
      verify(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .called(1);
    });
    test('400 -> AiApiException 带参数中文提示且不重试', () async {
      final ai = AiClient(
          dio: mockDio, baseUrl: 'https://api.test', apiKey: 'sk-test');
      final req = RequestOptions(path: '/chat/completions');
      when(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .thenThrow(DioException(
        requestOptions: req,
        response: Response(statusCode: 400, requestOptions: req),
        type: DioExceptionType.badResponse,
      ));
      expect(
          () => ai.chat(systemPrompt: 's', userPrompt: 'u'),
          throwsA(allOf(
            isA<AiApiException>(),
            predicate((AiApiException e) => e.message.contains('请求参数')),
          )));
      verify(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .called(1);
    });
    test('网络错误（connectionError）-> AiNetworkException', () async {
      final ai = AiClient(
          dio: mockDio, baseUrl: 'https://api.test', apiKey: 'sk-test');
      final req = RequestOptions(path: '/chat/completions');
      when(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .thenThrow(DioException(
        requestOptions: req,
        type: DioExceptionType.connectionError,
        error: 'socket error',
      ));
      expect(() => ai.chat(systemPrompt: 's', userPrompt: 'u'),
          throwsA(isA<AiNetworkException>()));
      verify(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .called(1);
    });
    test('连接超时 -> 重试后成功（超时也属可重试）', () async {
      final ai = AiClient(
          dio: mockDio, baseUrl: 'https://api.test', apiKey: 'sk-test');
      final req = RequestOptions(path: '/chat/completions');
      var calls = 0;
      when(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .thenAnswer((_) async {
        calls++;
        if (calls == 1) {
          throw DioException(
            requestOptions: req,
            type: DioExceptionType.connectionTimeout,
          );
        }
        return Response(
          data: {
            'choices': [
              {
                'message': {'content': 'ok after timeout retry'}
              }
            ]
          },
          statusCode: 200,
          requestOptions: RequestOptions(path: '/chat/completions'),
        );
      });
      final res = await ai.chat(systemPrompt: 's', userPrompt: 'u');
      expect(res, 'ok after timeout retry');
      verify(() => mockDio.post('/chat/completions', data: any(named: 'data')))
          .called(2);
    }, timeout: const Timeout(Duration(seconds: 10)));
  });
}
