import 'package:flutter/material.dart';

import 'package:ai_life_recorder/models/summary.dart';
import 'package:ai_life_recorder/screens/annual/sections/charts_section.dart';
import 'package:ai_life_recorder/screens/annual/sections/cover_section.dart';
import 'package:ai_life_recorder/screens/annual/sections/suggestions_section.dart';
import 'package:ai_life_recorder/screens/annual/sections/theme_cards_section.dart';
import 'package:ai_life_recorder/screens/annual/sections/timeline_section.dart';

class AnnualScreen extends StatelessWidget {
  const AnnualScreen({
    super.key,
    required this.summary,
  });

  final Summary summary;

  @override
  Widget build(BuildContext context) {
    final bool animate = !MediaQuery.of(context).disableAnimations;

    return Scaffold(
      appBar: AppBar(
        title: const Text('年度总结'),
      ),
      body: CustomScrollView(
        slivers: <Widget>[
          SliverToBoxAdapter(
            child: CoverSection(
              summary: summary,
              animate: animate,
            ),
          ),
          SliverToBoxAdapter(
            child: ThemeCardsSection(
              summary: summary,
              animate: animate,
            ),
          ),
          SliverToBoxAdapter(
            child: ChartsSection(
              summary: summary,
              animate: animate,
            ),
          ),
          SliverToBoxAdapter(
            child: TimelineSection(
              summary: summary,
              animate: animate,
            ),
          ),
          SliverToBoxAdapter(
            child: SuggestionsSection(
              summary: summary,
              animate: animate,
            ),
          ),
          const SliverToBoxAdapter(
            child: SizedBox(height: 32),
          ),
        ],
      ),
    );
  }
}
