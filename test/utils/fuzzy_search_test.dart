import 'package:flutter_test/flutter_test.dart';
import 'package:ai_life_recorder/utils/fuzzy_search.dart';

void main() {
  final now = DateTime.now().toUtc();

  group('normalizeSearchText', () {
    test('trim + lowercase', () {
      expect(normalizeSearchText('  Hello  '), 'hello');
      expect(normalizeSearchText('Apple'), 'apple');
    });
    test('多空格合并 + 标点归一', () {
      expect(normalizeSearchText('a   b'), 'a b');
      expect(normalizeSearchText('会议， 项目！'), '会议 项目');
      expect(normalizeSearchText('你好，世界'), '你好 世界');
    });
  });

  group('tokenizeQuery', () {
    test('英文按空格分词', () {
      expect(tokenizeQuery('meeting notes'), ['meeting', 'notes']);
    });
    test('中文连续词拆 2 字滑窗：苹果手机 → 含苹果与手机', () {
      final tokens = tokenizeQuery('苹果手机');
      expect(tokens.contains('苹果'), isTrue);
      expect(tokens.contains('手机'), isTrue);
      expect(tokens.contains('苹果手机'), isTrue);
    });
    test('空查询返回空 token', () {
      expect(tokenizeQuery('   '), isEmpty);
    });
  });

  group('scoreSearch 评分优先级', () {
    test('单词搜索：内容命中 > 0', () {
      final s = scoreSearch(
        title: '',
        content: '今天讨论了项目排期',
        tags: <String>[],
        query: '排期',
        createdAt: now,
      );
      expect(s, greaterThan(0));
    });
    test('多词 OR：命中任一即可（不需要全部）', () {
      final hitOne = scoreSearch(
        title: '',
        content: '今天讨论了项目排期',
        tags: <String>[],
        query: '排期 买菜',
        createdAt: now,
      );
      expect(hitOne, greaterThan(0)); // 只命中「排期」也通过
      final missAll = scoreSearch(
        title: '',
        content: '今天看书',
        tags: <String>[],
        query: '排期 买菜',
        createdAt: now,
      );
      expect(missAll, 0);
    });
    test('中文连续词拆分：苹果手机分别匹配苹果/手机', () {
      final a = scoreSearch(
          title: '',
          content: '买了新手机',
          tags: <String>[],
          query: '苹果手机',
          createdAt: now);
      final b = scoreSearch(
          title: '',
          content: '苹果很好吃',
          tags: <String>[],
          query: '苹果手机',
          createdAt: now);
      expect(a, greaterThan(0));
      expect(b, greaterThan(0));
    });
    test('标题匹配优先于内容匹配', () {
      final inTitle = scoreSearch(
          title: '周报',
          content: '随便',
          tags: <String>[],
          query: '周报',
          createdAt: now);
      final inContent = scoreSearch(
          title: '其他',
          content: '周报内容',
          tags: <String>[],
          query: '周报',
          createdAt: now);
      expect(inTitle, greaterThan(inContent));
    });
    test('标签命中也算（低于内容）', () {
      final tagHit = scoreSearch(
          title: '',
          content: '无',
          tags: <String>['项目'],
          query: '项目',
          createdAt: now);
      final contentHit = scoreSearch(
          title: '',
          content: '项目进展',
          tags: <String>[],
          query: '项目',
          createdAt: now);
      expect(tagHit, greaterThan(0));
      expect(contentHit, greaterThan(tagHit));
    });
    test('空搜索：返回 1（不参与过滤，全部保留）', () {
      final s = scoreSearch(
          title: '',
          content: '任意内容',
          tags: <String>[],
          query: '   ',
          createdAt: now);
      expect(s, 1);
    });
  });

  group('fuzzyMatches', () {
    test('任一关键词命中即 true', () {
      expect(
          fuzzyMatches(
              title: '', content: 'abc', tags: <String>[], query: 'xyz abc'),
          isTrue);
      expect(
          fuzzyMatches(
              title: '', content: 'abc', tags: <String>[], query: 'xyz def'),
          isFalse);
    });
    test('空查询全保留', () {
      expect(fuzzyMatches(title: '', content: 'x', tags: <String>[], query: ''),
          isTrue);
    });
  });
}
