import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:ai_life_recorder/providers/memory_provider.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';
import 'memory_edit_screen.dart';
import 'memory_detail_screen.dart';

class MemoryListScreen extends StatefulWidget {
  const MemoryListScreen({super.key});
  @override
  State<MemoryListScreen> createState() => _MemoryListScreenState();
}

class _MemoryListScreenState extends State<MemoryListScreen> {
  final TextEditingController _searchController = TextEditingController();
  final DateFormat _dateFmt = DateFormat('yyyy-MM-dd');
  final Set<String> _selectedTags = <String>{};
  final ScrollController _scrollController = ScrollController();
  Timer? _searchDebounce;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<MemoryProvider>();
      provider.load();
    });
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchDebounce?.cancel();
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final threshold = _scrollController.position.maxScrollExtent - 200;
    if (_scrollController.position.pixels >= threshold) {
      context.read<MemoryProvider>().loadMore();
    }
  }

  void _onToggleTag(String tag) {
    setState(() {
      if (_selectedTags.contains(tag)) {
        _selectedTags.remove(tag);
      } else {
        _selectedTags.add(tag);
      }
    });
    context.read<MemoryProvider>().toggleTag(tag);
  }

  void _onSearchChanged(String v, MemoryProvider provider) {
    if (_searchDebounce?.isActive ?? false) _searchDebounce!.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 300), () {
      provider.setKeyword(v);
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MemoryProvider>();
    final memories = provider.memories;
    final allTags = provider.allTags;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('记忆',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
        actions: [
          IconButton(
            tooltip: '清除筛选',
            icon: const Icon(Icons.clear),
            onPressed: () {
              setState(() {
                _selectedTags.clear();
                _searchController.clear();
              });
              provider.clearFilters();
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: '搜索记忆…',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8.0)),
                isDense: true,
              ),
              onChanged: (v) => _onSearchChanged(v, provider),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 40,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: allTags.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final tag = allTags[index];
                  final selected = _selectedTags.contains(tag);
                  return FilterChip(
                    label: Text(tag),
                    selected: selected,
                    onSelected: (_) => _onToggleTag(tag),
                    selectedColor: AppColors.primary,
                    checkmarkColor: Colors.white,
                    backgroundColor: Colors.white,
                    labelStyle: TextStyle(
                      color: selected ? Colors.white : AppColors.neutral,
                    ),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20)),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: memories.isEmpty
                  ? const Center(
                      child: Text(
                        '还没有记忆，点击右下角 + 新建',
                        style:
                            TextStyle(fontSize: 14, color: AppColors.neutral),
                      ),
                    )
                  : ListView.separated(
                      controller: _scrollController,
                      itemCount:
                          memories.length + (provider.isLoadingMore ? 1 : 0),
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        if (index >= memories.length) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(
                              child: SizedBox(
                                width: 20,
                                height: 20,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              ),
                            ),
                          );
                        }
                        final m = memories[index];
                        return _buildMemoryCard(context, m, provider);
                      },
                    ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'memory_fab',
        onPressed: () async {
          await Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const MemoryEditScreen()));
          await provider.load();
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
              end: Alignment.bottomRight,
            ),
          ),
          child: const Icon(Icons.add_rounded, color: Colors.white),
        ),
      ),
    );
  }

  Widget _buildMemoryCard(
      BuildContext context, Memory m, MemoryProvider provider) {
    final title = (m.title != null && m.title!.trim().isNotEmpty)
        ? m.title!
        : (m.content.length <= 20
            ? m.content
            : '${m.content.substring(0, 20)}...');
    final contentPreview = m.content;
    final dateStr = _dateFmt.format(m.createdAt.toLocal());
    final status = provider.summaryStatusOf(m.id);
    Widget summaryWidget;
    switch (status) {
      case MemorySummaryStatus.generating:
        summaryWidget = const SizedBox(
          height: 16,
          width: 16,
          child: CircularProgressIndicator(strokeWidth: 2),
        );
        break;
      case MemorySummaryStatus.failed:
        summaryWidget = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('摘要失败',
                style: TextStyle(color: AppColors.error, fontSize: 12)),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () => provider.retrySummary(m.id),
              child: const Text('重试',
                  style: TextStyle(color: AppColors.primary, fontSize: 12)),
            ),
          ],
        );
        break;
      case MemorySummaryStatus.success:
        if (m.aiSummary != null && m.aiSummary!.trim().isNotEmpty) {
          summaryWidget = Row(
            children: [
              const Icon(Icons.check_circle,
                  color: AppColors.success, size: 16),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  m.aiSummary!.split('\n').first,
                  style: const TextStyle(fontSize: 12),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          );
        } else {
          summaryWidget = const Text('暂无摘要',
              style: TextStyle(color: AppColors.neutral, fontSize: 12));
        }
        break;
      case MemorySummaryStatus.none:
      default:
        summaryWidget = const Text('暂无摘要',
            style: TextStyle(color: AppColors.neutral, fontSize: 12));
    }
    return InkWell(
      onTap: () async {
        await Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => MemoryDetailScreen(memory: m)));
        await provider.load();
      },
      child: Card(
        color: Colors.white,
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        surfaceTintColor: Colors.white,
        shadowColor: AppColors.memoryAccent.withOpacity(0.16),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(title,
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600)),
                  ),
                  Text(dateStr,
                      style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                contentPreview,
                style: const TextStyle(fontSize: 14),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: m.tags.map((t) {
                  return Chip(
                    label: Text(t, style: const TextStyle(fontSize: 12)),
                    backgroundColor: AppColors.background,
                  );
                }).toList(),
              ),
              const SizedBox(height: 8),
              Align(alignment: Alignment.centerLeft, child: summaryWidget),
            ],
          ),
        ),
      ),
    );
  }
}