import 'package:ai_life_recorder/models/photo.dart';

final List<Photo> photosFixture = [
  Photo(
    id: 'photo-1',
    localPath: '/storage/emulated/0/DCIM/photo1.jpg',
    takenAt: DateTime.now().toUtc().subtract(const Duration(hours: 2)),
    aiSummary: '白板上写着项目进度',
    summaryConfirmed: true,
    tags: <String>['会议', '项目'],
    relatedMemoryIds: <String>['mem-1'],
    metadata: <String, dynamic>{'camera': 'phone', 'resolution': '12MP'},
    createdAt: DateTime.now().toUtc().subtract(const Duration(hours: 2)),
  ),
  Photo(
    id: 'photo-2',
    localPath: '/storage/emulated/0/DCIM/photo2.jpg',
    takenAt: DateTime.now().toUtc().subtract(const Duration(days: 1)),
    aiSummary: '待确认摘要',
    summaryConfirmed: false,
    tags: <String>['学习'],
    relatedMemoryIds: <String>['mem-2'],
    metadata: <String, dynamic>{'camera': 'phone', 'resolution': '8MP'},
    createdAt: DateTime.now().toUtc().subtract(const Duration(days: 1)),
  ),
  Photo(
    id: 'photo-3',
    localPath: '/storage/emulated/0/DCIM/photo3.jpg',
    takenAt: DateTime.now().toUtc().subtract(const Duration(days: 3)),
    aiSummary: null,
    summaryConfirmed: false,
    tags: <String>[],
    relatedMemoryIds: <String>[],
    metadata: <String, dynamic>{},
    createdAt: DateTime.now().toUtc().subtract(const Duration(days: 3)),
  ),
];
