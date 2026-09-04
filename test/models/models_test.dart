import 'package:flutter_test/flutter_test.dart';

import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/models/context_pack.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/models/reflection.dart';
import 'package:ai_life_recorder/models/reflection_summary.dart';
import 'package:ai_life_recorder/models/summary.dart';
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/models/task_prefill.dart';
import 'package:ai_life_recorder/models/theme.dart';
import 'package:ai_life_recorder/models/trend.dart';

void main() {
  group('Memory', () {
    final full = {
      'id': 'm1',
      'title': '会议记录',
      'content': '今天讨论了项目排期，确定了里程碑。',
      'tags': <String>['沟通', '项目'],
      'ai_summary': '会议确定了三个里程碑',
      'related_media_ids': <String>['p1'],
      'metadata': <String, dynamic>{'address': '上海'},
      'created_at': '2026-08-01T10:00:00.000Z',
    };
    test('完整字段 round-trip', () {
      final m = Memory.fromJson(full);
      expect(m.toJson(), full);
      expect(m.title, '会议记录');
      expect(m.tags, ['沟通', '项目']);
    });
    test('空数组 round-trip', () {
      final json = {
        'id': 'm2',
        'content': '无标签记忆',
        'tags': <String>[],
        'related_media_ids': <String>[],
        'created_at': '2026-08-02T10:00:00.000Z',
      };
      final m = Memory.fromJson(json);
      expect(m.toJson()['tags'], isEmpty);
      expect(m.toJson()['related_media_ids'], isEmpty);
      expect(m.toJson()['title'], isNull);
    });
    test('copyWith', () {
      final m = Memory.fromJson(full);
      final m2 = m.copyWith(content: '改过的内容');
      expect(m2.content, '改过的内容');
      expect(m2.id, 'm1');
    });
  });

  group('Photo', () {
    final full = {
      'id': 'p1',
      'local_path': '/photos/p1.jpg',
      'taken_at': '2026-08-01T12:00:00.000Z',
      'ai_summary': '白板上写着项目进度',
      'summary_confirmed': true,
      'tags': <String>['会议', '项目'],
      'related_memory_ids': <String>['m1'],
      'metadata': {'width': 512},
      'created_at': '2026-08-01T12:05:00.000Z',
    };
    test('完整字段 round-trip', () {
      final p = Photo.fromJson(full);
      expect(p.toJson(), full);
      expect(p.summaryConfirmed, isTrue);
      expect(p.metadata['width'], 512);
    });
    test('空数组 round-trip', () {
      final json = {
        'id': 'p2',
        'local_path': '/photos/p2.jpg',
        'taken_at': '2026-08-02T12:00:00.000Z',
        'summary_confirmed': false,
        'tags': <String>[],
        'related_memory_ids': <String>[],
        'metadata': <String, dynamic>{},
        'created_at': '2026-08-02T12:05:00.000Z',
      };
      final p = Photo.fromJson(json);
      expect(p.toJson()['tags'], isEmpty);
      expect(p.toJson()['ai_summary'], isNull);
    });
  });

  group('Reflection', () {
    final full = {
      'id': 'r1',
      'event_description': '开会时被问住了',
      'emotion': '紧张',
      'action_taken': '会后查了资料',
      'result': '补上了知识缺口',
      'ai_summary': {'eventSummary': '开会提问未答上'},
      'related_memory_ids': <String>['m1'],
      'related_photo_ids': <String>['p1'],
      'related_task_ids': <String>['t1'],
      'related_summary_ids': <String>['s1'],
      'is_user_confirmed': true,
      'created_at': '2026-08-01T10:00:00.000Z',
    };
    test('完整字段 round-trip', () {
      final r = Reflection.fromJson(full);
      expect(r.toJson(), full);
      expect(r.emotion, '紧张');
      expect(r.isUserConfirmed, isTrue);
    });
    test('空数组 round-trip', () {
      final json = {
        'id': 'r2',
        'event_description': '简单记录',
        'related_memory_ids': <String>[],
        'related_photo_ids': <String>[],
        'related_task_ids': <String>[],
        'related_summary_ids': <String>[],
        'is_user_confirmed': false,
        'created_at': '2026-08-02T10:00:00.000Z',
      };
      final r = Reflection.fromJson(json);
      expect(r.toJson()['related_memory_ids'], isEmpty);
      expect(r.toJson()['emotion'], isNull);
    });
  });

  group('ReflectionSummary', () {
    test('完整字段 round-trip（§9.1 camelCase 键）', () {
      final json = {
        'eventSummary': '开会时被问住了',
        'goodPoints': '诚实承认不知道',
        'ignoredFactors': '会上时间紧张',
        'improvementPoints': '提前准备材料',
        'nextSuggestion': '制定沟通前确认清单',
        'suggestedTask': '准备会议材料模板',
        'citations': {
          'memoryIds': <String>['m1'],
          'photoIds': <String>['p1'],
        },
      };
      final s = ReflectionSummary.fromJson(json);
      expect(s.toJson(), json);
      expect(s.goodPoints, '诚实承认不知道');
      expect(s.citations.memoryIds, ['m1']);
    });
    test('suggestedTask/citations 为空 round-trip', () {
      final json = {
        'eventSummary': '没有建议任务',
        'goodPoints': '',
        'ignoredFactors': '',
        'improvementPoints': '',
        'nextSuggestion': '完成今日复盘',
        'suggestedTask': null,
        'citations': {
          'memoryIds': <String>[],
          'photoIds': <String>[],
        },
      };
      final s = ReflectionSummary.fromJson(json);
      expect(s.toJson(), json);
      expect(s.suggestedTask, isNull);
    });
    test('copyWith 保留未改字段', () {
      final s = ReflectionSummary.fromJson({
        'eventSummary': 'A',
        'nextSuggestion': 'B',
      });
      final s2 = s.copyWith(eventSummary: 'A2');
      expect(s2.eventSummary, 'A2');
      expect(s2.nextSuggestion, 'B');
    });
  });

  group('Task', () {
    final full = {
      'id': 't1',
      'title': '准备周报',
      'description': '汇总本周进展',
      'category': '项目',
      'priority': '高',
      'start_time': '2026-08-01T09:00:00.000Z',
      'due_time': '2026-08-01T18:00:00.000Z',
      'reminder_time': '2026-08-01T17:00:00.000Z',
      'repeat_rule': '每周',
      'estimated_minutes': 60,
      'status': '进行中',
      'steps': <Map<String, dynamic>>[
        {'content': '收集数据', 'done': true},
        {'content': '撰写文档', 'done': false},
      ],
      'source_reflection_id': 'r1',
      'feedback': {
        'delay_type': '内部',
        'cancel_type': null,
        'reason': '会议冲突',
        'actual_start_time': '2026-08-01T09:30:00.000Z',
        'completed_time': null,
        'execution_duration_minutes': 45,
        'behavior_improvement': <String>['提前规划'],
      },
      'check_in_type_ids': <String>[],
      'created_at': '2026-08-01T08:00:00.000Z',
    };
    test('完整字段 round-trip', () {
      final t = Task.fromJson(full);
      expect(t.toJson(), full);
      expect(t.category, TaskCategory.project);
      expect(t.status, TaskStatus.inProgress);
      expect(t.repeatRule, RepeatRule.weekly);
      expect(t.steps.length, 2);
      expect(t.feedback.delayType, DelayType.internal);
      expect(t.feedback.behaviorImprovement, ['提前规划']);
    });
    test('空数组/空 feedback round-trip', () {
      final json = {
        'id': 't2',
        'title': '简单任务',
        'category': '规划',
        'priority': '中',
        'repeat_rule': '无',
        'status': '未开始',
        'steps': <Map<String, dynamic>>[],
        'feedback': <String, dynamic>{},
        'created_at': '2026-08-02T08:00:00.000Z',
      };
      final t = Task.fromJson(json);
      expect(t.toJson()['steps'], isEmpty);
      final fb = t.toJson()['feedback'] as Map<String, dynamic>;
      expect(fb['behavior_improvement'], isEmpty);
      expect(fb['delay_type'], isNull);
      expect(fb['cancel_type'], isNull);
      expect(fb['reason'], isNull);
      expect(fb['completed_time'], isNull);
      expect(t.feedback.delayType, isNull);
    });
  });

  group('Summary', () {
    final full = {
      'id': 's1',
      'type': '周',
      'period_start': '2026-08-01T00:00:00.000Z',
      'period_end': '2026-08-07T00:00:00.000Z',
      'content': '本周完成 3 项任务',
      'themes': <String>['沟通'],
      'trends': <String, dynamic>{'沟通': -3},
      'highlights': <String>['完成里程碑'],
      'task_suggestions': <String>['制定沟通前确认清单'],
      'chart_data': <String, dynamic>{
        'tags': <String>['沟通', '项目']
      },
      'created_at': '2026-08-08T00:00:00.000Z',
    };
    test('完整字段 round-trip', () {
      final s = Summary.fromJson(full);
      expect(s.toJson(), full);
      expect(s.type, SummaryType.weekly);
      expect(s.chartData['tags'], ['沟通', '项目']);
    });
    test('空数组 round-trip', () {
      final json = {
        'id': 's2',
        'type': '月',
        'period_start': '2026-08-01T00:00:00.000Z',
        'period_end': '2026-08-31T00:00:00.000Z',
        'themes': <String>[],
        'trends': <String, dynamic>{},
        'highlights': <String>[],
        'task_suggestions': <String>[],
        'chart_data': <String, dynamic>{},
        'created_at': '2026-09-01T00:00:00.000Z',
      };
      final s = Summary.fromJson(json);
      expect(s.toJson()['themes'], isEmpty);
      expect(s.toJson()['content'], isNull);
    });
  });

  group('Trend', () {
    test('完整字段 round-trip', () {
      final json = {
        'id': 'tr1',
        'trend_name': '沟通执行',
        'category': '沟通',
        'score': -3.0,
        'direction': '改善',
        'weight': 12.0,
        'evidence': <Map<String, dynamic>>[
          {
            'taskId': 't1',
            'event': '完成',
            'delta': -1,
            'time': '2026-08-01T00:00:00.000Z'
          },
        ],
        'cluster': '沟通类',
        'updated_at': '2026-08-02T00:00:00.000Z',
      };
      final t = Trend.fromJson(json);
      expect(t.toJson(), json);
      expect(t.direction, ThemeDirection.improving);
      expect(t.score, -3.0);
    });
    test('空数组 round-trip', () {
      final json = {
        'id': 'tr2',
        'trend_name': '空趋势',
        'category': '学习',
        'score': 0.0,
        'direction': '稳定',
        'weight': 0.0,
        'evidence': <Map<String, dynamic>>[],
        'updated_at': '2026-08-02T00:00:00.000Z',
      };
      final t = Trend.fromJson(json);
      expect(t.toJson()['evidence'], isEmpty);
      expect(t.toJson()['cluster'], isNull);
    });
  });

  group('ThemeItem', () {
    test('完整字段 round-trip', () {
      final json = {
        'id': 'th1',
        'theme_name': '沟通能力',
        'weight': 12.0,
        'direction': '改善',
        'evidence': <Map<String, dynamic>>[
          {
            'taskId': 't1',
            'event': '完成',
            'delta': -1,
            'time': '2026-08-01T00:00:00.000Z'
          },
        ],
        'cluster_names': <String>['沟通类'],
        'trend_names': <String>['沟通执行'],
        'updated_at': '2026-08-02T00:00:00.000Z',
      };
      final t = ThemeItem.fromJson(json);
      expect(t.toJson(), json);
      expect(t.direction, ThemeDirection.improving);
      expect(t.trendNames, ['沟通执行']);
    });
    test('空数组 round-trip', () {
      final json = {
        'id': 'th2',
        'theme_name': '空主题',
        'weight': 0.0,
        'direction': '稳定',
        'evidence': <Map<String, dynamic>>[],
        'cluster_names': <String>[],
        'trend_names': <String>[],
        'updated_at': '2026-08-02T00:00:00.000Z',
      };
      final t = ThemeItem.fromJson(json);
      expect(t.toJson()['cluster_names'], isEmpty);
      expect(t.toJson()['trend_names'], isEmpty);
    });
  });

  group('ContextPack', () {
    test('完整 round-trip', () {
      final json = {
        'memories': <Map<String, dynamic>>[
          {
            'id': 'm1',
            'title': '记忆1',
            'date': '2026-08-01T00:00:00.000Z',
            'tags': <String>['沟通']
          },
        ],
        'photos': <Map<String, dynamic>>[],
        'tasks': <Map<String, dynamic>>[],
        'summaries': <Map<String, dynamic>>[],
      };
      final c = ContextPack.fromJson(json);
      expect(c.toJson(), json);
      expect(c.memories.length, 1);
      expect(c.memories.first.title, '记忆1');
      expect(c.photos, isEmpty);
    });
    test('空列表 round-trip', () {
      final json = {
        'memories': <Map<String, dynamic>>[],
        'photos': <Map<String, dynamic>>[],
        'tasks': <Map<String, dynamic>>[],
        'summaries': <Map<String, dynamic>>[],
      };
      final c = ContextPack.fromJson(json);
      expect(c.toJson()['memories'], isEmpty);
      expect(c.toJson()['tasks'], isEmpty);
    });
  });

  group('TaskPrefill', () {
    test('完整字段 round-trip', () {
      final json = {
        'title': '准备会议材料',
        'description': '来自反思的事件总结',
        'source_reflection_id': 'r1',
        'default_category': '规划',
      };
      final p = TaskPrefill.fromJson(json);
      expect(p.toJson(), json);
      expect(p.defaultCategory, TaskCategory.planning);
    });
    test('copyWith', () {
      final p = TaskPrefill(
        title: 'A',
        description: 'B',
        sourceReflectionId: 'r1',
        defaultCategory: TaskCategory.planning,
      );
      final p2 = p.copyWith(title: 'A2');
      expect(p2.title, 'A2');
      expect(p2.defaultCategory, TaskCategory.planning);
    });
  });
}
