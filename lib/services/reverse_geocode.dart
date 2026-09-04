// lib/services/reverse_geocode.dart
//
// 反向地理编码：经纬度 → 可读位置（城市名）。用免费 BigDataCloud API（无需 key），
// 失败时兜底返回经纬度文本，保证 UI 始终能展示位置。
import 'package:dio/dio.dart';

class ReverseGeocoder {
  final Dio _dio;
  ReverseGeocoder({Dio? dio})
      : _dio = dio ??
            Dio(BaseOptions(
              baseUrl: 'https://api.bigdatacloud.net',
              connectTimeout: const Duration(seconds: 10),
              receiveTimeout: const Duration(seconds: 15),
            ));

  /// 反查城市名；失败返回 null（上层决定用经纬度兜底）。
  Future<String?> reverseToCity({
    required double latitude,
    required double longitude,
  }) async {
    try {
      final resp =
          await _dio.get('/data/reverse-geocode-client', queryParameters: {
        'latitude': latitude,
        'longitude': longitude,
        'localityLanguage': 'zh',
      });
      final data = resp.data;
      if (data is! Map) return null;
      // 优先级：city > locality > principalSubdivision > countryName
      for (final key in ['city', 'locality', 'principalSubdivision']) {
        final v = data[key];
        if (v is String && v.trim().isNotEmpty) return v.trim();
      }
      final country = data['countryName'];
      if (country is String && country.trim().isNotEmpty) {
        return country.trim();
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
