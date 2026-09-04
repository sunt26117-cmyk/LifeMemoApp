// lib/screens/photo/widgets/photo_location_sheet.dart
//
// 照片发布面板（TASK-EXT-07 升级）：一句话配文（可选）+ 定位城市（可选）+ 手动地址。
// 定位权限只在用户点击「添加位置」时请求；不加文字/位置也能保存。
import 'package:flutter/material.dart';
import 'package:ai_life_recorder/services/location_service.dart';
import 'package:ai_life_recorder/services/reverse_geocode.dart';

/// 返回 null = 用户直接完成（不带附加信息）；否则 {caption?, address?, latitude?, longitude?}。
class PhotoLocationSheet extends StatefulWidget {
  final LocationProvider? locationProvider;
  final ReverseGeocoder? reverseGeocoder;
  const PhotoLocationSheet(
      {super.key, this.locationProvider, this.reverseGeocoder});
  @override
  State<PhotoLocationSheet> createState() => _PhotoLocationSheetState();
}

class _PhotoLocationSheetState extends State<PhotoLocationSheet> {
  final TextEditingController _captionController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  LocationResult? _location;
  String? _cityName; // 反查出的城市名（优先展示）
  bool _locating = false;
  late final LocationProvider _loc =
      widget.locationProvider ?? GeolocatorLocationProvider();
  late final ReverseGeocoder _geo = widget.reverseGeocoder ?? ReverseGeocoder();

  @override
  void dispose() {
    _captionController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _onLocate() async {
    setState(() => _locating = true);
    final result = await _loc.getCurrentLocation();
    String? city;
    if (result != null) {
      city = await _geo.reverseToCity(
        latitude: result.latitude,
        longitude: result.longitude,
      );
    }
    if (!mounted) return;
    setState(() {
      _locating = false;
      if (result != null) {
        _location = result;
        _cityName = city;
      }
    });
    if (!mounted) return;
    if (result == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('未获取到定位，可手动输入地址'), duration: Duration(seconds: 1)));
    } else if (city == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('已获取定位（城市名解析失败，仅保存坐标）'),
          duration: Duration(seconds: 1)));
    }
  }

  void _onDone() {
    final caption = _captionController.text.trim();
    final address = _addressController.text.trim();
    if (caption.isEmpty && address.isEmpty && _location == null) {
      Navigator.of(context).pop(null); // 直接保存，无附加信息
      return;
    }
    // 展示用地址：手动输入优先，否则用城市名，否则用坐标兜底
    String? displayAddress =
        address.isEmpty ? (_cityName ?? _locationText()) : address;
    Navigator.of(context).pop(<String, dynamic>{
      'caption': caption.isEmpty ? null : caption,
      'address': displayAddress,
      'latitude': _location?.latitude,
      'longitude': _location?.longitude,
    });
  }

  String? _locationText() {
    final l = _location;
    if (l == null) return null;
    return '${l.latitude.toStringAsFixed(4)}, ${l.longitude.toStringAsFixed(4)}';
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('发布照片',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            TextField(
              controller: _captionController,
              minLines: 1,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: '写点什么…（可选）',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _locating ? null : _onLocate,
              icon: _locating
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.location_on_outlined, size: 18),
              label: Text(_location == null ? '添加位置' : '重新定位'),
            ),
            if (_location != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.place_rounded,
                      size: 14, color: Color(0xFF4A90D9)),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      _cityName ?? _locationText() ?? '',
                      style: const TextStyle(fontSize: 13),
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 12),
            TextField(
              controller: _addressController,
              decoration: const InputDecoration(
                labelText: '或手动输入地点',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 48,
              child: ElevatedButton(
                onPressed: _onDone,
                child: const Text('发布'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
