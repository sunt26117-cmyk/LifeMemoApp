import 'package:supabase_flutter/supabase_flutter.dart';
import 'memory_repository.dart';
import 'photo_repository.dart';
import 'reflection_repository.dart';
import 'task_repository.dart';
import 'summary_repository.dart';
import 'trend_repository.dart';
import 'theme_repository.dart';
import 'check_in_type_repository.dart';
import 'check_in_record_repository.dart';
import 'note_repository.dart';

class Repositories {
  final MemoryRepository memories;
  final PhotoRepository photos;
  final ReflectionRepository reflections;
  final TaskRepository tasks;
  final SummaryRepository summaries;
  final TrendRepository trends;
  final ThemeRepository themes;
  final CheckInTypeRepository checkInTypes;
  final CheckInRecordRepository checkInRecords;
  final NoteRepository notes;
  Repositories({
    required this.memories,
    required this.photos,
    required this.reflections,
    required this.tasks,
    required this.summaries,
    required this.trends,
    required this.themes,
    required this.checkInTypes,
    required this.checkInRecords,
    required this.notes,
  });
  factory Repositories.supabase() {
    final client = Supabase.instance.client;
    return Repositories(
      memories: SupabaseMemoryRepository(client),
      photos: SupabasePhotoRepository(client),
      reflections: SupabaseReflectionRepository(client),
      tasks: SupabaseTaskRepository(client),
      summaries: SupabaseSummaryRepository(client),
      trends: SupabaseTrendRepository(client),
      themes: SupabaseThemeRepository(client),
      checkInTypes: SupabaseCheckInTypeRepository(client),
      checkInRecords: SupabaseCheckInRecordRepository(client),
      notes: SupabaseNoteRepository(client),
    );
  }
  factory Repositories.inMemory() {
    return Repositories(
      memories: InMemoryMemoryRepository(),
      photos: InMemoryPhotoRepository(),
      reflections: InMemoryReflectionRepository(),
      tasks: InMemoryTaskRepository(),
      summaries: InMemorySummaryRepository(),
      trends: InMemoryTrendRepository(),
      themes: InMemoryThemeRepository(),
      checkInTypes: InMemoryCheckInTypeRepository(),
      checkInRecords: InMemoryCheckInRecordRepository(),
      notes: InMemoryNoteRepository(),
    );
  }
}
