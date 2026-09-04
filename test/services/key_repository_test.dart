import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:ai_life_recorder/services/key_repository.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  group('SharedPrefsKeyRepository', () {
    late SharedPrefsKeyRepository repo;
    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      repo = SharedPrefsKeyRepository();
      await repo.init();
    });
    test('初始 apiKey 为 null', () {
      expect(repo.apiKey, isNull);
    });
    test('saveApiKey 后能读取到', () async {
      await repo.saveApiKey('sk-test');
      expect(repo.apiKey, 'sk-test');
      final repo2 = SharedPrefsKeyRepository();
      await repo2.init();
      expect(repo2.apiKey, 'sk-test');
    });
    test('clearApiKey 后为 null', () async {
      await repo.saveApiKey('sk-test');
      expect(repo.apiKey, 'sk-test');
      await repo.clearApiKey();
      expect(repo.apiKey, isNull);
      final repo2 = SharedPrefsKeyRepository();
      await repo2.init();
      expect(repo2.apiKey, isNull);
    });
    test('testApiKey 方法存在并返回 bool（不进行真实网络请求）', () async {
      final result = await repo.testApiKey('sk-unknown');
      expect(result, isA<bool>());
    });
  });
}
