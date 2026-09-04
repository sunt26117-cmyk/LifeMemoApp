import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/models/summary.dart';

class SuggestionsSection extends StatelessWidget {
  const SuggestionsSection({
    super.key,
    required this.summary,
    required this.animate,
  });

  final Summary summary;
  final bool animate;

  @override
  Widget build(BuildContext context) {
    final List<String> suggestions = summary.taskSuggestions
        .where(
          (String item) => item.trim().isNotEmpty,
        )
        .map((String item) => item.trim())
        .toList();

    final Widget content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const Text(
          '下一年建议',
          style: TextStyle(
            fontSize: 21,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 14),
        if (suggestions.isEmpty)
          const _EmptySuggestions()
        else
          for (int index = 0; index < suggestions.length; index++)
            Padding(
              padding: const EdgeInsets.only(
                bottom: 10,
              ),
              child: _SuggestionCard(
                text: suggestions[index],
                index: index,
                animate: animate,
              ),
            ),
      ],
    );

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        16,
        8,
        16,
        8,
      ),
      child: animate
          ? content
              .animate()
              .fadeIn(
                duration: const Duration(
                  milliseconds: 250,
                ),
                delay: const Duration(
                  milliseconds: 50,
                ),
              )
              .slideX(
                begin: 0.1,
                duration: const Duration(
                  milliseconds: 300,
                ),
                curve: Curves.decelerate,
              )
              .scale(
                begin: const Offset(0.95, 0.95),
                duration: const Duration(
                  milliseconds: 200,
                ),
                curve: Curves.easeOutBack,
              )
          : content,
    );
  }
}

class _SuggestionCard extends StatelessWidget {
  const _SuggestionCard({
    required this.text,
    required this.index,
    required this.animate,
  });

  final String text;
  final int index;
  final bool animate;

  @override
  Widget build(BuildContext context) {
    final Widget card = Container(
      width: double.infinity,
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.primary.withOpacity(0.10),
        ),
        boxShadow: const <BoxShadow>[
          BoxShadow(
            color: Color(0x0E000000),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.10),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.lightbulb_outline,
              size: 19,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 14,
                height: 1.6,
              ),
            ),
          ),
        ],
      ),
    );

    return animate
        ? card
            .animate(
              delay: Duration(
                milliseconds: 40 * index,
              ),
            )
            .slideX(
              begin: 0.1,
              duration: const Duration(
                milliseconds: 300,
              ),
              curve: Curves.decelerate,
            )
        : card;
  }
}

class _EmptySuggestions extends StatelessWidget {
  const _EmptySuggestions();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: const Text(
        '暂无下一年建议',
        style: TextStyle(
          color: AppColors.neutral,
          fontSize: 13,
        ),
      ),
    );
  }
}
