// lib/services/location_service.dart
//
// 定位服务（TASK-EXT-07，对应需求 §26）。
// 关键约束：定位权限只在用户主动点击「添加位置」时请求；
// 拒绝时可手动输入地址文本；不添加地址也能正常保存照片。
import 'package:geolocator/geolocator.dart';

/// 一次定位结果。
class LocationResult {
  final double latitude;
  final double longitude;
  const LocationResult({required this.latitude, required this.longitude});
}

/// 可注入的定位器（测试用假实现替换）。
abstract class LocationProvider {
  /// 请求定位权限并取当前位置；用户拒绝/失败返回 null。
  Future<LocationResult?> getCurrentLocation();
}

class GeolocatorLocationProvider implements LocationProvider {
  @override
  Future<LocationResult?> getCurrentLocation() async {
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return null;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 15),
        ),
      );
      return LocationResult(
        latitude: pos.latitude,
        longitude: pos.longitude,
      );
    } catch (_) {
      return null;
    }
  }
}
