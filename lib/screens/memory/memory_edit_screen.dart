import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/providers/memory_provider.dart';
import 'package:ai_life_recorder/providers/photo_provider.dart';
import 'package:ai_life_recorder/services/location_service.dart';
import 'package:ai_life_recorder/services/reverse_geocode.dart';
import 'package:ai_life_recorder/widgets/tag_input_widget.dart';

class MemoryEditScreen extends StatefulWidget {
  final Memory? memory;
  const MemoryEditScreen({super.key, this.memory});
  @override
  State<MemoryEditScreen> createState() => _MemoryEditScreenState();
}

class _MemoryEditScreenState extends State<MemoryEditScreen> {
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _contentController = TextEditingController();
  List<String> _tags = <String>[];
  final List<Photo> _photos = <Photo>[];
  String? _address; // 发布位置（城市名/手输）
  bool _saving = false;
  bool _pickingPhoto = false;

  @override
  void initState() {
    super.initState();
    final m = widget.memory;
    if (m != null) {
      _titleController.text = m.title ?? '';
      _contentController.text = m.content;
      _tags = List<String>.from(m.tags);
      _address = (m.metadata['address'] as String?) ?? '';

      if (m.relatedMediaIds.isNotEmpty) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          final photoProvider = context.read<PhotoProvider>();
          final initialPhotos = <Photo>[];
          for (final id in m.relatedMediaIds) {
            final photo = photoProvider.byId(id);
            if (photo != null) {
              initialPhotos.add(photo);
            }
          }
          if (mounted && initialPhotos.isNotEmpty) {
            setState(() {
              _photos.addAll(initialPhotos);
            });
          }
        });
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto(ImageSource source) async {
    if (_photos.length >= 3) return;
    setState(() => _pickingPhoto = true);
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(source: source);
      if (pickedFile == null) return;

      final bytes = await pickedFile.readAsBytes();
      final decoded = img.decodeImage(bytes);
      if (decoded == null) return;

      img.Image resized = decoded;
      final maxSide =
          decoded.width > decoded.height ? decoded.width : decoded.height;
      if (maxSide > 512) {
        if (decoded.width >= decoded.height) {
          resized = img.copyResize(decoded, width: 512);
        } else {
          resized = img.copyResize(decoded, height: 512);
        }
      }

      final jpgBytes = img.encodeJpg(resized, quality: 80);
      final appDir = await getApplicationDocumentsDirectory();
      final photosDir = Directory('${appDir.path}/photos');
      if (!await photosDir.exists()) {
        await photosDir.create(recursive: true);
      }

      final photoId = const Uuid().v4();
      final filePath = '${photosDir.path}/$photoId.jpg';
      final file = File(filePath);
      await file.writeAsBytes(jpgBytes);

      final now = DateTime.now().toUtc();
      final photo = Photo(
        id: photoId,
        localPath: filePath,
        takenAt: now,
        aiSummary: null,
        summaryConfirmed: false,
        tags: const [],
        relatedMemoryIds: const [],
        metadata: const {},
        createdAt: now,
      );

      if (!mounted) return;
      await context.read<PhotoProvider>().addPhoto(photo);

      if (mounted) {
        setState(() {
          _photos.add(photo);
        });
      }
    } catch (e) {
      debugPrint('配图失败: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('添加图片失败，请重试')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _pickingPhoto = false);
      }
    }
  }

  void _showImageSourceSheet() {
    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined),
              title: const Text('拍照'),
              onTap: () {
                Navigator.of(ctx).pop();
                _pickPhoto(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('从相册选'),
              onTap: () {
                Navigator.of(ctx).pop();
                _pickPhoto(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPhotoPickerSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            ..._photos.map((photo) {
              final file = File(photo.localPath);
              return Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: SizedBox(
                      width: 80,
                      height: 80,
                      child: file.existsSync()
                          ? Image.file(file, fit: BoxFit.cover)
                          : const ColoredBox(
                              color: Color(0xFFF2F3F5),
                              child: Icon(Icons.broken_image_outlined,
                                  color: AppColors.neutral),
                            ),
                    ),
                  ),
                  Positioned(
                    top: 2,
                    right: 2,
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _photos.removeWhere((p) => p.id == photo.id);
                        });
                      },
                      child: Container(
                        decoration: const BoxDecoration(
                          color: Colors.black54,
                          shape: BoxShape.circle,
                        ),
                        padding: const EdgeInsets.all(2),
                        child: const Icon(Icons.close,
                            size: 14, color: Colors.white),
                      ),
                    ),
                  ),
                ],
              );
            }),
            if (_photos.length < 3)
              InkWell(
                onTap: _pickingPhoto ? null : _showImageSourceSheet,
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    border:
                        Border.all(color: AppColors.neutral.withOpacity(0.35)),
                    borderRadius: BorderRadius.circular(8),
                    color: Colors.black.withOpacity(0.02),
                  ),
                  child: _pickingPhoto
                      ? const Center(
                          child: SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      : const Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.add_photo_alternate_outlined,
                                color: AppColors.neutral, size: 26),
                            SizedBox(height: 4),
                            Text(
                              '添加照片',
                              style: TextStyle(
                                  fontSize: 11, color: AppColors.neutral),
                            ),
                          ],
                        ),
                ),
              ),
          ],
        ),
      ],
    );
  }

  /// 添加位置：只在用户点击时请求定位；成功后反查城市名；失败可手动输入。
  Future<void> _addLocation() async {
    final messenger = ScaffoldMessenger.of(context);
    final textController = TextEditingController(text: _address ?? '');
    final picked = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 16,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('添加位置（可选）',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              const Text('定位只在点击下方按钮时请求；也可手动输入。',
                  style: TextStyle(fontSize: 12, color: Colors.grey)),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () async {
                  final loc =
                      await GeolocatorLocationProvider().getCurrentLocation();
                  if (loc == null || !ctx.mounted) return;
                  final city = await ReverseGeocoder().reverseToCity(
                      latitude: loc.latitude, longitude: loc.longitude);
                  if (!ctx.mounted) return;
                  Navigator.of(ctx).pop(city ??
                      '${loc.latitude.toStringAsFixed(4)}, ${loc.longitude.toStringAsFixed(4)}');
                },
                icon: const Icon(Icons.my_location, size: 18),
                label: const Text('定位当前位置'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: textController,
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
                  onPressed: () =>
                      Navigator.of(ctx).pop(textController.text.trim()),
                  child: const Text('确定'),
                ),
              ),
            ],
          ),
        );
      },
    );
    textController.dispose();
    if (!mounted) return;
    if (picked == null || picked.isEmpty) return;
    setState(() {
      _address = picked;
    });
    messenger.showSnackBar(SnackBar(
        content: Text(_address!.isEmpty ? '未选择位置' : '位置：$_address'),
        duration: const Duration(seconds: 1)));
  }

  Future<void> _onSave() async {
    final content = _contentController.text.trim();
    if (content.isEmpty) return;
    setState(() {
      _saving = true;
    });
    final provider = context.read<MemoryProvider>();
    try {
      final saved = await provider.save(
        id: widget.memory?.id,
        title: _titleController.text.trim().isEmpty
            ? null
            : _titleController.text.trim(),
        content: content,
        tags: _tags,
        relatedMediaIds: _photos.map((p) => p.id).toList(),
        metadata: _address == null || _address!.isEmpty
            ? null
            : <String, dynamic>{'address': _address},
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('已保存')));
      Navigator.of(context).pop(saved);
    } catch (e) {
      debugPrint('保存失败: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('保存失败，请重试')));
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isContentEmpty = _contentController.text.trim().isEmpty;
    final titleText = widget.memory == null ? '新建记忆' : '编辑记忆';
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(titleText,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                hintText: '标题（可选）',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _contentController,
              decoration: const InputDecoration(
                hintText: '记录点什么…',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              keyboardType: TextInputType.multiline,
              maxLines: 6,
              minLines: 4,
              onChanged: (_) {
                setState(() {});
              },
            ),
            const SizedBox(height: 12),
            _buildPhotoPickerSection(),
            const SizedBox(height: 12),
            TagInputWidget(
              initialTags: _tags,
              onChanged: (newTags) {
                setState(() {
                  _tags = newTags;
                });
              },
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _saving ? null : _addLocation,
              icon: const Icon(Icons.place_outlined, size: 18),
              label: Text(_address == null || _address!.isEmpty
                  ? '添加位置'
                  : '📍 $_address'),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: isContentEmpty || _saving ? null : _onSave,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  disabledBackgroundColor: AppColors.neutral,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8)),
                ),
                child: _saving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('保存', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
