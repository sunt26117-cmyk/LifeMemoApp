import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/models/summary.dart';

class ThemeCardsSection extends StatelessWidget {
  const ThemeCardsSection({
    super.key,
    required this.summary,
    required this.animate,
  });

  final Summary summary;
  final bool animate;

  @override
  Widget build(BuildContext context) {
    final Map<String, dynamic> trends = summary.trends;

    final String annualTheme = _readString(trends['annualTheme']);

    final String behaviorTrend = _readString(trends['behaviorTrend']);

    final String moodTrend = _readString(trends['moodTrend']);

    final String lifeRhythm = _readString(trends['lifeRhythm']);

    final String displayTheme =
        annualTheme.isEmpty ? '这一年还没有形成明确主题' : annualTheme;

    final Widget content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const Text(
          '年度主题',
          style: TextStyle(
            fontSize: 21,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 12),
        Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: () {
              _showDetails(
                context,
                annualTheme: displayTheme,
                behaviorTrend: behaviorTrend,
                moodTrend: moodTrend,
                lifeRhythm: lifeRhythm,
              );
            },
            child: Ink(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: AppColors.primary.withOpacity(0.12),
                ),
                boxShadow: const <BoxShadow>[
                  BoxShadow(
                    color: Color(0x12000000),
                    blurRadius: 14,
                    offset: Offset(0, 5),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(18),
              child: Row(
                children: <Widget>[
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.10),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(
                      Icons.auto_awesome,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      displayTheme,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        height: 1.4,
                      ),
                    ),
                  ),
                  const Icon(
                    Icons.chevron_right,
                    color: Colors.grey,
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: animate
          ? content
              .animate()
              .fadeIn(
                duration: const Duration(milliseconds: 250),
                delay: const Duration(milliseconds: 50),
              )
              .slideX(
                begin: 0.1,
                duration: const Duration(milliseconds: 300),
                curve: Curves.decelerate,
              )
              .scale(
                begin: const Offset(0.95, 0.95),
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOutBack,
              )
          : content,
    );
  }

  void _showDetails(
    BuildContext context, {
    required String annualTheme,
    required String behaviorTrend,
    required String moodTrend,
    required String lifeRhythm,
  }) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (BuildContext context) {
        return SafeArea(
          child: FractionallySizedBox(
            heightFactor: 0.86,
            child: Material(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(24),
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  20,
                  20,
                  20,
                  16,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      '年度主题详情',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Expanded(
                      child: ListView(
                        children: <Widget>[
                          _DetailBlock(
                            title: '年度主题',
                            content: annualTheme,
                          ),
                          _DetailBlock(
                            title: '行为趋势',
                            content: behaviorTrend,
                          ),
                          _DetailBlock(
                            title: '情绪趋势',
                            content: moodTrend,
                          ),
                          _DetailBlock(
                            title: '生活节奏',
                            content: lifeRhythm,
                          ),
                        ],
                      ),
                    ),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.of(context).pop();
                        },
                        child: const Text('关闭'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  String _readString(dynamic value) {
    if (value is! String) {
      return '';
    }

    return value.trim();
  }
}

class _DetailBlock extends StatelessWidget {
  const _DetailBlock({
    required this.title,
    required this.content,
  });

  final String title;
  final String content;

  @override
  Widget build(BuildContext context) {
    final String display = content.isEmpty ? '暂无相关分析' : content;

    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            display,
            style: const TextStyle(
              fontSize: 14,
              height: 1.7,
              color: Colors.black87,
            ),
          ),
        ],
      ),
    );
  }
}
