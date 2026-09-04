import 'dart:io';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/providers/memory_provider.dart';
import 'package:ai_life_recorder/providers/photo_provider.dart';
import 'package:ai_life_recorder/screens/memory/memory_edit_screen.dart';
import 'package:ai_life_recorder/screens/memory/memory_list_screen.dart';
import 'package:ai_life_recorder/screens/photo/photo_detail_screen.dart';
import 'package:ai_life_recorder/screens/memory/memory_detail_screen.dart';

class RecordsScreen extends StatefulWidget {
  const RecordsScreen({super.key});

  @override
  State<RecordsScreen> createState() => _RecordsScreenState();
}

class _RecordsScreenState extends State<RecordsScreen> {
  int _segment = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final memoryProvider = context.read<MemoryProvider>();
      final photoProvider = context.read<PhotoProvider>();
      await memoryProvider.load();
      await photoProvider.load();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('记录'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) async {
              final memoryProvider = context.read<MemoryProvider>();
              final navigator = Navigator.of(context);
              if (value == 'memory') {
                await navigator.push(MaterialPageRoute(
                    builder: (_) => const MemoryEditScreen()));
                if (!mounted) return;
                await memoryProvider.load();
              }
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'memory', child: Text('写记录')),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: SegmentedButton<int>(
              segments: const [
                ButtonSegment(
                    value: 0,
                    label: Text('全部'),
                    icon: Icon(Icons.all_inclusive_rounded)),
                ButtonSegment(
                    value: 1,
                    label: Text('文字'),
                    icon: Icon(Icons.edit_note_rounded)),
              ],
              selected: {_segment},
              onSelectionChanged: (value) =>
                  setState(() => _segment = value.first),
            ),
          ),
          const SizedBox(height: 4),
          Expanded(
            child: IndexedStack(
              index: _segment,
              children: const [
                _MixedRecordsView(),
                MemoryListScreen(),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'records_fab',
        onPressed: () async {
          final memoryProvider = context.read<MemoryProvider>();
          final photoProvider = context.read<PhotoProvider>();
          await Navigator.push(context,
              MaterialPageRoute(builder: (_) => const MemoryEditScreen()));
          if (!mounted) return;
          await memoryProvider.load();
          await photoProvider.load();
        },
        backgroundColor: Colors.transparent,
        elevation: 2,
        shape: const CircleBorder(),
        child: Container(
          width: 56,
          height: 56,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
                colors: AppColors.memoryGradient,
                begin: Alignment.topLeft,
                end: Alignment.bottomRight),
          ),
          child: const Icon(Icons.add_rounded, color: Colors.white),
        ),
      ),
    );
  }
}

class _MixedRecordsView extends StatelessWidget {
  const _MixedRecordsView();

  @override
  Widget build(BuildContext context) {
    final memories = context.watch<MemoryProvider>().memories;
    final photos = context.watch<PhotoProvider>().photos;

    final referencedPhotoIds = <String>{
      for (final m in memories) ...m.relatedMediaIds,
    };
    final standalonePhotos =
        photos.where((p) => !referencedPhotoIds.contains(p.id));

    final entries = <_RecordEntry>[
      ...memories.map(_RecordEntry.memory),
      ...standalonePhotos.map(_RecordEntry.photo),
    ]..sort((a, b) => b.time.compareTo(a.time));

    if (entries.isEmpty) {
      return const Center(
          child: Text('还没有生活记录',
              style: TextStyle(fontSize: 14, color: AppColors.neutral)));
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 90),
      itemCount: entries.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final entry = entries[index];
        if (entry.type == _RecordType.memory) {
          return _MemoryRecordTile(memory: entry.memory!);
        }
        return _PhotoRecordTile(photo: entry.photo!);
      },
    );
  }
}

class _MemoryRecordTile extends StatelessWidget {
  const _MemoryRecordTile({required this.memory});
  final Memory memory;

  @override
  Widget build(BuildContext context) {
    final preview = memory.content.trim();
    final display =
        preview.length <= 90 ? preview : '${preview.substring(0, 90)}...';

    Photo? firstPhoto;
    if (memory.relatedMediaIds.isNotEmpty) {
      firstPhoto =
          context.watch<PhotoProvider>().byId(memory.relatedMediaIds.first);
    }

    return Card(
      color: Colors.white,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () async {
          await Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) => MemoryDetailScreen(memory: memory)));
          if (context.mounted) await context.read<MemoryProvider>().load();
        },
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                    color: AppColors.memoryAccent.withOpacity(0.14),
                    shape: BoxShape.circle),
                child: const Icon(Icons.edit_note_rounded,
                    color: AppColors.memoryAccent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_dateText(memory.createdAt),
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.neutral)),
                    const SizedBox(height: 5),
                    Text(display,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 14,
                            height: 1.5,
                            color: Color(0xFF3A4557))),
                    if ((memory.metadata['address'] as String?)?.isNotEmpty ??
                        false) ...[
                      const SizedBox(height: 4),
                      Row(children: [
                        const Icon(Icons.place_rounded,
                            size: 13, color: AppColors.mutedIcon),
                        const SizedBox(width: 3),
                        Expanded(
                            child: Text(memory.metadata['address'] as String,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                    fontSize: 11, color: AppColors.neutral))),
                      ]),
                    ],
                    if (firstPhoto != null) ...[
                      const SizedBox(height: 10),
                      GestureDetector(
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) =>
                                  PhotoDetailScreen(photo: firstPhoto!),
                            ),
                          );
                          if (context.mounted) {
                            await context.read<PhotoProvider>().load();
                          }
                        },
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: SizedBox(
                            width: double.infinity,
                            height: 160,
                            child: _buildThumbnail(firstPhoto.localPath),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildThumbnail(String localPath) {
    final file = File(localPath);
    if (!file.existsSync()) {
      return const ColoredBox(
        color: Color(0xFFF2F3F5),
        child: Icon(Icons.broken_image_outlined, color: AppColors.neutral),
      );
    }
    return Image.file(
      file,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => const ColoredBox(
        color: Color(0xFFF2F3F5),
        child: Icon(Icons.broken_image_outlined, color: AppColors.neutral),
      ),
    );
  }
}

class _PhotoRecordTile extends StatelessWidget {
  const _PhotoRecordTile({required this.photo});
  final Photo photo;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.white,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () async {
          await Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) => PhotoDetailScreen(photo: photo)));
          if (context.mounted) await context.read<PhotoProvider>().load();
        },
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: SizedBox(width: 84, height: 84, child: _buildImage()),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('照片',
                        style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF3A4557))),
                    if ((photo.metadata['caption'] as String?)?.isNotEmpty ??
                        false) ...[
                      const SizedBox(height: 4),
                      Text(photo.metadata['caption'] as String,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 13,
                              height: 1.4,
                              color: Color(0xFF3A4557))),
                    ],
                    if ((photo.metadata['address'] as String?)?.isNotEmpty ??
                        false) ...[
                      const SizedBox(height: 4),
                      Row(children: [
                        const Icon(Icons.place_rounded,
                            size: 13, color: AppColors.mutedIcon),
                        const SizedBox(width: 3),
                        Expanded(
                            child: Text(photo.metadata['address'] as String,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                    fontSize: 11, color: AppColors.neutral))),
                      ]),
                    ],
                    const SizedBox(height: 6),
                    Text(_dateText(photo.takenAt),
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.neutral)),
                    if (photo.tags.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 5,
                        children: photo.tags.take(3).map((tag) {
                          return Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 7, vertical: 4),
                            decoration: BoxDecoration(
                                color: AppColors.photoAccent.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(12)),
                            child: Text(tag,
                                style: const TextStyle(
                                    fontSize: 10, color: Color(0xFF9B724D))),
                          );
                        }).toList(),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildImage() {
    final file = File(photo.localPath);
    if (!file.existsSync()) {
      return const ColoredBox(
          color: Color(0xFFF2F3F5),
          child: Icon(Icons.broken_image_outlined, color: AppColors.neutral));
    }
    return Image.file(file, fit: BoxFit.cover);
  }
}

String _dateText(DateTime value) {
  final local = value.toLocal();
  return '${local.year}年${local.month}月${local.day}日 ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
}

enum _RecordType { memory, photo }

class _RecordEntry {
  const _RecordEntry._(
      {required this.type, required this.time, this.memory, this.photo});
  factory _RecordEntry.memory(Memory memory) => _RecordEntry._(
      type: _RecordType.memory, time: memory.createdAt, memory: memory);
  factory _RecordEntry.photo(Photo photo) => _RecordEntry._(
      type: _RecordType.photo, time: photo.takenAt, photo: photo);
  final _RecordType type;
  final DateTime time;
  final Memory? memory;
  final Photo? photo;
}
