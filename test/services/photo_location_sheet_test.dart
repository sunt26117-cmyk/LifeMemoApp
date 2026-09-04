import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ai_life_recorder/services/location_service.dart';
import 'package:ai_life_recorder/services/reverse_geocode.dart';
import 'package:ai_life_recorder/screens/photo/widgets/photo_location_sheet.dart';

class _OkLocation implements LocationProvider {
  @override
  Future<LocationResult?> getCurrentLocation() async {
    return const LocationResult(latitude: 31.2304, longitude: 121.4737);
  }
}

class _DeniedLocation implements LocationProvider {
  @override
  Future<LocationResult?> getCurrentLocation() async {
    return null; // 模拟用户拒绝定位
  }
}

class _FakeGeocoder implements ReverseGeocoder {
  @override
  Future<String?> reverseToCity(
      {required double latitude, required double longitude}) async {
    return '上海市';
  }
}

class _FailGeocoder implements ReverseGeocoder {
  @override
  Future<String?> reverseToCity(
      {required double latitude, required double longitude}) async {
    return null;
  }
}

void main() {
  testWidgets('直接发布（无文字无位置）→ 返回 null，照片无附加信息', (tester) async {
    Map<String, dynamic>? popped;
    await tester.pumpWidget(MaterialApp(
      home: Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: ElevatedButton(
              onPressed: () async {
                popped = await showModalBottomSheet<Map<String, dynamic>>(
                  context: context,
                  builder: (_) => PhotoLocationSheet(
                    locationProvider: _OkLocation(),
                    reverseGeocoder: _FakeGeocoder(),
                  ),
                );
              },
              child: const Text('打开'),
            ),
          ),
        ),
      ),
    ));
    await tester.tap(find.text('打开'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('发布'));
    await tester.pumpAndSettle();
    expect(popped, isNull);
  });

  testWidgets('定位成功 → 返回城市名地址 + 经纬度', (tester) async {
    Map<String, dynamic>? popped;
    await tester.pumpWidget(MaterialApp(
      home: Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: ElevatedButton(
              onPressed: () async {
                popped = await showModalBottomSheet<Map<String, dynamic>>(
                  context: context,
                  builder: (_) => PhotoLocationSheet(
                    locationProvider: _OkLocation(),
                    reverseGeocoder: _FakeGeocoder(),
                  ),
                );
              },
              child: const Text('打开'),
            ),
          ),
        ),
      ),
    ));
    await tester.tap(find.text('打开'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('添加位置'));
    await tester.pumpAndSettle();
    expect(find.text('上海市'), findsOneWidget); // 城市名可见
    await tester.tap(find.text('发布'));
    await tester.pumpAndSettle();
    expect(popped, isNotNull);
    expect(popped!['address'], '上海市');
    expect(popped!['latitude'], closeTo(31.2304, 0.0001));
  });

  testWidgets('城市名解析失败 → 经纬度兜底显示', (tester) async {
    Map<String, dynamic>? popped;
    await tester.pumpWidget(MaterialApp(
      home: Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: ElevatedButton(
              onPressed: () async {
                popped = await showModalBottomSheet<Map<String, dynamic>>(
                  context: context,
                  builder: (_) => PhotoLocationSheet(
                    locationProvider: _OkLocation(),
                    reverseGeocoder: _FailGeocoder(),
                  ),
                );
              },
              child: const Text('打开'),
            ),
          ),
        ),
      ),
    ));
    await tester.tap(find.text('打开'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('添加位置'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('发布'));
    await tester.pumpAndSettle();
    expect(popped, isNotNull);
    // 兜底：坐标文本包含 31.2304
    expect((popped!['address'] as String).contains('31.2304'), isTrue);
  });

  testWidgets('定位被拒 → 手动输入地点仍可完成 + 配文', (tester) async {
    Map<String, dynamic>? popped;
    await tester.pumpWidget(MaterialApp(
      home: Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: ElevatedButton(
              onPressed: () async {
                popped = await showModalBottomSheet<Map<String, dynamic>>(
                  context: context,
                  builder: (_) => PhotoLocationSheet(
                    locationProvider: _DeniedLocation(),
                    reverseGeocoder: _FakeGeocoder(),
                  ),
                );
              },
              child: const Text('打开'),
            ),
          ),
        ),
      ),
    ));
    await tester.tap(find.text('打开'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).at(0), '今天的落日真美');
    await tester.enterText(find.byType(TextField).at(1), '徐家汇公园');
    await tester.tap(find.text('发布'));
    await tester.pumpAndSettle();
    expect(popped, isNotNull);
    expect(popped!['caption'], '今天的落日真美');
    expect(popped!['address'], '徐家汇公园');
    expect(popped!['latitude'], isNull);
  });
}
