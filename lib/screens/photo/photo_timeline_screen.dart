import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';
import 'package:ai_life_recorder/providers/photo_provider.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/utils/photo_timeline.dart';
import 'package:ai_life_recorder/screens/photo/photo_detail_screen.dart';
import 'package:ai_life_recorder/screens/photo/widgets/photo_location_sheet.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';

class PhotoTimelineScreen extends StatefulWidget {
  const PhotoTimelineScreen({super.key});
  @override
  State<PhotoTimelineScreen> createState() => _PhotoTimelineScreenState();
}

class _PhotoTimelineScreenState extends State<PhotoTimelineScreen> {
  TimelineGranularity _granularity = TimelineGranularity.day;
  final ImagePicker _picker = ImagePicker();
  final Uuid _uuid = const Uuid();
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PhotoProvider>().load();
    });
  }

  /// EXT-07 升级：弹「发布」面板——可写一句话配文 + 可选定位（城市名）/手动地址；
  /// 发布后才返回，位置与配文写入 photo.metadata，时间流/详情可见。
  Future<void> _maybeAttachLocation(String photoId) async {
    if (!mounted) return;
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const PhotoLocationSheet(),
    );
    if (result == null || !mounted) return; // 直接保存（无附加信息）
    final caption = result['caption'] as String?;
    final address = result['address'] as String?;
    final lat = result['latitude'] as double?;
    final lng = result['longitude'] as double?;
    if (caption == null &&
        (address == null || address.isEmpty) &&
        lat == null &&
        lng == null) {
      return;
    }
    final provider = context.read<PhotoProvider>();
    final current = provider.byId(photoId);
    if (current == null) return;
    final metadata = Map<String, dynamic>.from(current.metadata);
    if (caption != null) metadata['caption'] = caption;
    if (address != null && address.isNotEmpty) metadata['address'] = address;
    if (lat != null && lng != null) {
      metadata['latitude'] = lat;
      metadata['longitude'] = lng;
    }
    await provider.updatePhoto(current.copyWith(metadata: metadata));
  }

  Future<void> _capturePhoto(bool fromGallery) async {
    final provider = context.read<PhotoProvider>();
    try {
      final XFile? picked = await _picker.pickImage(
        source: fromGallery ? ImageSource.gallery : ImageSource.camera,
        maxWidth: fromGallery ? 1600 : null,
        maxHeight: fromGallery ? 1600 : null,
        imageQuality: fromGallery ? 85 : null,
      );
      if (picked == null) return;
      final bytes = await picked.readAsBytes();
      img.Image? decoded = img.decodeImage(bytes);
      if (decoded == null) {
        throw Exception('无法解码图片');
      }
      final int maxSide =
          decoded.width > decoded.height ? decoded.width : decoded.height;
      img.Image resized = decoded;
      if (maxSide > 512) {
        final ratio = 512 / maxSide;
        final newW = (decoded.width * ratio).round();
        final newH = (decoded.height * ratio).round();
        resized = img.copyResize(decoded, width: newW, height: newH);
      }
      final jpg = img.encodeJpg(resized, quality: 80);
      final dir = await getApplicationDocumentsDirectory();
      final photosDir = Directory('${dir.path}/photos');
      if (!await photosDir.exists()) {
        await photosDir.create(recursive: true);
      }
      final id = _uuid.v4();
      final filePath = '${photosDir.path}/$id.jpg';
      final file = File(filePath);
      await file.writeAsBytes(jpg);
      final photo = Photo(
        id: id,
        localPath: file.path,
        takenAt: DateTime.now().toUtc(),
        aiSummary: null,
        summaryConfirmed: false,
        tags: const [],
        relatedMemoryIds: const [],
        metadata: <String, dynamic>{},
        createdAt: DateTime.now().toUtc(),
      );
      await provider.addPhoto(photo);
      // EXT-07：发布后可选补充位置（权限只在用户主动点击时请求；跳过也 OK）
      await _maybeAttachLocation(photo.id);
    } catch (e) {
      debugPrint('添加照片失败: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('添加照片失败，请重试')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PhotoProvider>();
    final photos = provider.photos;
    final groups = groupPhotos(photos, _granularity);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('照片',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
        actions: [
          IconButton(
            icon: const Icon(Icons.photo_camera),
            tooltip: '拍照',
            onPressed: () => _capturePhoto(false),
          ),
          IconButton(
            icon: const Icon(Icons.photo_library),
            tooltip: '选图',
            onPressed: () => _capturePhoto(true),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            SegmentedButton<TimelineGranularity>(
              segments: const <ButtonSegment<TimelineGranularity>>[
                ButtonSegment(value: TimelineGranularity.day, label: Text('日')),
                ButtonSegment(
                    value: TimelineGranularity.week, label: Text('周')),
                ButtonSegment(
                    value: TimelineGranularity.month, label: Text('月')),
              ],
              selected: <TimelineGranularity>{_granularity},
              onSelectionChanged: (s) {
                setState(() {
                  _granularity = s.first;
                });
              },
            ),
            const SizedBox(height: 12),
            if (photos.isEmpty)
              const Expanded(
                child: Center(
                  child: Text('还没有照片，点击右上角添加',
                      style: TextStyle(color: AppColors.neutral)),
                ),
              )
            else
              Expanded(
                child: ListView.separated(
                  itemCount: groups.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, idx) {
                    final group = groups[idx];
                    final title = groupTitle(group.start, _granularity);
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title,
                            style: const TextStyle(
                                fontSize: 16, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 110,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: group.photos.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(width: 8),
                            itemBuilder: (context, i) {
                              final p = group.photos[i];
                              return GestureDetector(
                                onTap: () async {
                                  await Navigator.of(context)
                                      .push(MaterialPageRoute(
                                    builder: (_) => PhotoDetailScreen(photo: p),
                                  ));
                                  await provider.load();
                                },
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Container(
                                    width: 100,
                                    height: 100,
                                    color: Colors.grey.shade200,
                                    child: _buildImage(p),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildImage(Photo p) {
    try {
      final file = File(p.localPath);
      if (!file.existsSync()) {
        return const Center(
            child: Icon(Icons.broken_image, size: 40, color: Colors.grey));
      }
      return Image.file(file, fit: BoxFit.cover, width: 100, height: 100);
    } catch (e) {
      debugPrint('加载图片失败: $e');
      return const Center(
          child: Icon(Icons.broken_image, size: 40, color: Colors.grey));
    }
  }
}
