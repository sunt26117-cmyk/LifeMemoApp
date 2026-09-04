import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/repositories/photo_repository.dart';

class PhotoProvider extends ChangeNotifier {
  final PhotoRepository repository;
  final Future<String> Function(Photo photo)? summaryGenerator;
  PhotoProvider({required this.repository, this.summaryGenerator});
  final List<Photo> _photos = [];
  List<Photo> get photos => List.unmodifiable(_photos);
  Future<List<Photo>> photosInRange(DateTime from, DateTime to) async {
    try {
      return await repository.listByRange(from, to);
    } catch (e) {
      debugPrint('PhotoProvider.photosInRange error: $e');
      return <Photo>[];
    }
  }

  Photo? byId(String id) {
    try {
      return _photos.firstWhere((p) => p.id == id);
    } catch (_) {
      return null;
    }
  }

  Future<void> load() async {
    try {
      final from = DateTime.utc(2000, 1, 1);
      final to = DateTime.now().toUtc().add(const Duration(days: 1));
      final list = await repository.listByRange(from, to);
      _photos
        ..clear()
        ..addAll(list);
      _photos.sort((a, b) => b.takenAt.compareTo(a.takenAt));
      notifyListeners();
    } catch (e) {
      debugPrint('PhotoProvider.load error: $e');
    }
  }

  Future<void> addPhoto(Photo p) async {
    try {
      await repository.upsert(p);
      _insertLocal(p);
      notifyListeners();
    } catch (e) {
      debugPrint('PhotoProvider.addPhoto error: $e');
    }
  }

  Future<void> updatePhoto(Photo p) async {
    try {
      await repository.upsert(p);
      final idx = _photos.indexWhere((x) => x.id == p.id);
      if (idx != -1) {
        _photos[idx] = p;
      } else {
        _insertLocal(p);
      }
      _photos.sort((a, b) => b.takenAt.compareTo(a.takenAt));
      notifyListeners();
    } catch (e) {
      debugPrint('PhotoProvider.updatePhoto error: $e');
    }
  }

  Future<void> deletePhoto(String id) async {
    final existing = byId(id);
    try {
      _photos.removeWhere((p) => p.id == id);
      notifyListeners();
      await repository.delete(id);
      if (existing != null) {
        await _tryDeleteLocalFile(existing.localPath);
      }
    } catch (e) {
      debugPrint('PhotoProvider.deletePhoto error: $e');
    }
  }

  Future<void> _tryDeleteLocalFile(String localPath) async {
    try {
      if (localPath.startsWith('content://')) {
        return;
      }
      final docsDir = await getApplicationDocumentsDirectory();
      final supportDir = await getApplicationSupportDirectory();
      final isInAppDir = localPath.startsWith(docsDir.path) ||
          localPath.startsWith(supportDir.path);
      if (!isInAppDir) {
        return;
      }
      final file = File(localPath);
      if (await file.exists()) {
        await file.delete();
      }
    } catch (e) {
      debugPrint('PhotoProvider._tryDeleteLocalFile error: $e');
    }
  }

  Future<void> setSummary(String id, String summary) async {
    try {
      final idx = _photos.indexWhere((p) => p.id == id);
      if (idx == -1) return;
      final updated =
          _photos[idx].copyWith(aiSummary: summary, summaryConfirmed: false);
      _photos[idx] = updated;
      try {
        await repository.upsert(updated);
      } catch (e) {
        debugPrint('PhotoProvider.setSummary upsert error: $e');
      }
      notifyListeners();
    } catch (e) {
      debugPrint('PhotoProvider.setSummary error: $e');
    }
  }

  Future<void> confirmSummary(String id) async {
    try {
      await repository.confirmSummary(id);
      final idx = _photos.indexWhere((p) => p.id == id);
      if (idx != -1) {
        _photos[idx] = _photos[idx].copyWith(summaryConfirmed: true);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('PhotoProvider.confirmSummary error: $e');
    }
  }

  Future<void> generateSummary(Photo p) async {
    if (summaryGenerator == null) return;
    try {
      String? result;
      try {
        result = await summaryGenerator!(p);
      } catch (e) {
        debugPrint('PhotoProvider.generateSummary generator error: $e');
        result = null;
      }
      final updated = p.copyWith(aiSummary: result, summaryConfirmed: false);
      final idx = _photos.indexWhere((x) => x.id == p.id);
      if (idx != -1) {
        _photos[idx] = updated;
      } else {
        _insertLocal(updated);
      }
      try {
        await repository.upsert(updated);
      } catch (e) {
        debugPrint('PhotoProvider.generateSummary upsert error: $e');
      }
      notifyListeners();
    } catch (e) {
      debugPrint('PhotoProvider.generateSummary error: $e');
    }
  }

  void _insertLocal(Photo p) {
    _photos.add(p);
    _photos.sort((a, b) => b.takenAt.compareTo(a.takenAt));
  }
}