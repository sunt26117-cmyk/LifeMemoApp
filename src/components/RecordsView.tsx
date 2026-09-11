// src/components/RecordsView.tsx
import React, { useState, useMemo } from 'react';
import { Search, Plus, Sparkles, BookOpen, Camera, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Memory, Note, Photo } from '../types';
import { fuzzySearch } from '../utils/fuzzySearch';
import { MemoryCard } from './records/MemoryCard';
import { NoteCard } from './records/NoteCard';
import { PhotoGrid } from './records/PhotoGrid';
import { DeleteConfirmationModal } from './records/DeleteConfirmationModal';
import { getThemeColors } from '../utils/themeStyles';
import { ListPaginationControl } from './ListPaginationControl';
import { RecordsFootprintHeader } from './records/RecordsFootprintHeader';

interface RecordsViewProps {
  onOpenMemoryCreate: () => void;
  onOpenMemoryEdit: (m: Memory) => void;
  onOpenNoteCreate: () => void;
  onOpenNoteEdit: (n: Note) => void;
  onOpenPhotoCreate: () => void;
  onOpenPhotoEdit: (p: Photo) => void;
}

export const RecordsView: React.FC<RecordsViewProps> = ({
  onOpenMemoryCreate,
  onOpenMemoryEdit,
  onOpenNoteCreate,
  onOpenNoteEdit,
  onOpenPhotoCreate,
  onOpenPhotoEdit,
}) => {
  const {
    memories,
    notes,
    photos,
    offloadItem,
    permanentDeleteItem,
    theme,
  } = useApp();

  const themeColors = getThemeColors(theme);

  const [activeSubTab, setActiveSubTab] = useState<'all' | 'memories' | 'photos' | 'notes'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Pagination state: >10 items auto-hide with Show More / Collapse
  const [notesVisibleCount, setNotesVisibleCount] = useState(10);
  const [memoriesVisibleCount, setMemoriesVisibleCount] = useState(10);

  // Reset pagination when search, filter or tab changes
  React.useEffect(() => {
    setNotesVisibleCount(10);
    setMemoriesVisibleCount(10);
  }, [searchQuery, selectedTag, activeSubTab]);

  // Dual-track deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'memory' | 'note' | 'photo';
    id: string;
    title: string;
    description?: string;
  } | null>(null);

  // All unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    memories.forEach((m) => (m.tags || []).forEach((t) => set.add(t)));
    notes.forEach((n) => (n.tags || []).forEach((t) => set.add(t)));
    photos.forEach((p) => (p.tags || []).forEach((t) => set.add(t)));
    return Array.from(set);
  }, [memories, notes, photos]);

  // Filtered Memories
  const filteredMemories: Memory[] = useMemo(() => {
    let list = memories;
    if (selectedTag) {
      list = list.filter((m) => (m.tags || []).includes(selectedTag));
    }
    if (searchQuery.trim()) {
      return fuzzySearch<Memory>({
        items: list,
        query: searchQuery,
        getTexts: (m: Memory) => [m.title || '', m.content, m.aiSummary || '', ...(m.tags || [])],
      }).map((r) => r.item);
    }
    return list;
  }, [memories, searchQuery, selectedTag]);

  // Filtered Notes
  const filteredNotes: Note[] = useMemo(() => {
    let list = notes;
    if (selectedTag) {
      list = list.filter((n) => (n.tags || []).includes(selectedTag));
    }
    if (searchQuery.trim()) {
      return fuzzySearch<Note>({
        items: list,
        query: searchQuery,
        getTexts: (n: Note) => [n.title, n.content, ...(n.tags || [])],
      }).map((r) => r.item);
    }
    return [...list].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }, [notes, searchQuery, selectedTag]);

  // Filtered Photos
  const filteredPhotos: Photo[] = useMemo(() => {
    let list = photos;
    if (selectedTag) {
      list = list.filter((p) => (p.tags || []).includes(selectedTag));
    }
    if (searchQuery.trim()) {
      return fuzzySearch<Photo>({
        items: list,
        query: searchQuery,
        getTexts: (p: Photo) => [p.aiSummary || '', p.locationName || '', ...(p.tags || [])],
      }).map((r) => r.item);
    }
    return list;
  }, [photos, searchQuery, selectedTag]);

  return (
    <div className="space-y-4 pb-20">
      {/* Top Life Footprint Summary Card */}
      <RecordsFootprintHeader
        memoriesCount={memories.length}
        notesCount={notes.length}
        photosCount={photos.length}
        themeColors={themeColors}
        onOpenMemoryCreate={onOpenMemoryCreate}
        onOpenNoteCreate={onOpenNoteCreate}
      />

      {/* Segmented Sub Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
        <div className={`flex gap-1 p-1 ${themeColors.segmentBg} rounded-2xl shrink-0`}>
          {[
            { id: 'all', label: '全部' },
            { id: 'memories', label: `日记 (${memories.length})` },
            { id: 'photos', label: `相片 (${photos.length})` },
            { id: 'notes', label: `便签 (${notes.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
                activeSubTab === tab.id
                  ? `${themeColors.segmentActiveBg} ${themeColors.segmentActiveText} shadow-xs font-semibold`
                  : `${themeColors.textMuted} hover:${themeColors.textMain}`
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fuzzy Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="搜索日记内容、便签备忘、相片说明、标签或地点..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full text-xs py-2 px-3 pl-8.5 ${themeColors.cardBg} border ${themeColors.cardBorder} rounded-xl focus:outline-none ${themeColors.focusRing} shadow-xs ${themeColors.textMain}`}
        />
        <Search className={`w-3.5 h-3.5 ${themeColors.textSub} absolute left-3 top-2.5`} />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className={`text-xs ${themeColors.textSub} hover:${themeColors.textMain} absolute right-3 top-2 px-1`}
          >
            ×
          </button>
        )}
      </div>

      {/* Tag Filter Chips */}
      {allTags.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
              selectedTag === null
                ? `${themeColors.primaryBg} text-white shadow-xs`
                : `${themeColors.subtleBg} ${themeColors.textMuted} hover:${themeColors.textMain} border ${themeColors.subtleBorder}`
            }`}
          >
            全部标签
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                selectedTag === tag
                  ? `${themeColors.primaryBg} text-white shadow-xs`
                  : `${themeColors.subtleBg} ${themeColors.textMuted} hover:${themeColors.textMain} border ${themeColors.subtleBorder}`
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Content Stream */}
      <div className="space-y-4">
        {/* Photo Gallery Stream */}
        {(activeSubTab === 'all' || activeSubTab === 'photos') && filteredPhotos.length > 0 && (
          <PhotoGrid
            photos={filteredPhotos}
            activeSubTab={activeSubTab}
            onViewAll={() => setActiveSubTab('photos')}
            onEdit={onOpenPhotoEdit}
            onDelete={(id) => {
              const p = photos.find((x) => x.id === id);
              setDeleteTarget({
                type: 'photo',
                id,
                title: '删除生活相片',
                description: p?.aiSummary || '所选照片',
              });
            }}
          />
        )}

        {/* Sticky Notes Section */}
        {(activeSubTab === 'all' || activeSubTab === 'notes') && filteredNotes.length > 0 && (
          <div className="space-y-2">
            {activeSubTab === 'all' && (
              <div className="flex items-center justify-between px-1">
                <span className={`text-xs font-semibold ${themeColors.textMain} flex items-center gap-1`}>
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  <span>灵感便签墙 ({filteredNotes.length})</span>
                </span>
                <button
                  onClick={() => setActiveSubTab('notes')}
                  className={`text-[11px] ${themeColors.primaryText} hover:underline font-medium`}
                >
                  查看全部
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredNotes.slice(0, notesVisibleCount).map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={onOpenNoteEdit}
                  onDelete={(id) => {
                    setDeleteTarget({
                      type: 'note',
                      id,
                      title: '删除便签备忘',
                      description: note.title || note.content,
                    });
                  }}
                />
              ))}
            </div>

            {/* Pagination Controls for Notes */}
            <ListPaginationControl
              totalCount={filteredNotes.length}
              visibleCount={notesVisibleCount}
              onShowMore={() => setNotesVisibleCount((prev) => prev + 10)}
              onCollapse={() => setNotesVisibleCount(10)}
              itemName="条便签"
            />
          </div>
        )}

        {/* Empty Note State */}
        {activeSubTab === 'notes' && filteredNotes.length === 0 && (
          <div className={`${themeColors.cardBg} p-8 rounded-2xl border ${themeColors.cardBorder} text-center space-y-2`}>
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <div className={`text-xs font-medium ${themeColors.textMain}`}>暂无便签备忘</div>
            <p className={`text-[11px] ${themeColors.textSub}`}>
              点击上方「便签」快速记下灵感碎片
            </p>
          </div>
        )}

        {/* Empty Photo State */}
        {activeSubTab === 'photos' && filteredPhotos.length === 0 && (
          <div className={`${themeColors.cardBg} p-8 rounded-2xl border ${themeColors.cardBorder} text-center space-y-2`}>
            <Camera className="w-8 h-8 text-slate-300 mx-auto" />
            <div className={`text-xs font-medium ${themeColors.textMain}`}>暂无生活相片</div>
            <p className={`text-[11px] ${themeColors.textSub}`}>
              在写日记记录时上传配图，即可自动归档在此
            </p>
          </div>
        )}

        {/* Memories Stream */}
        {(activeSubTab === 'all' || activeSubTab === 'memories') && (
          <div className="space-y-2.5">
            {activeSubTab === 'all' && (
              <span className={`text-xs font-semibold ${themeColors.textMain} flex items-center gap-1 px-1`}>
                <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                <span>日记时光流 ({filteredMemories.length})</span>
              </span>
            )}

            {filteredMemories.length === 0 ? (
              <div className={`${themeColors.cardBg} p-8 rounded-2xl border ${themeColors.cardBorder} text-center space-y-2`}>
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                <div className={`text-xs font-medium ${themeColors.textMain}`}>暂无日记记录</div>
                <p className={`text-[11px] ${themeColors.textSub}`}>
                  点击上方「写记录」沉淀今天的客观事实
                </p>
              </div>
            ) : (
              <>
                {filteredMemories.slice(0, memoriesVisibleCount).map((mem) => (
                  <MemoryCard
                    key={mem.id}
                    memory={mem}
                    onEdit={onOpenMemoryEdit}
                    onDelete={(id) => {
                      setDeleteTarget({
                        type: 'memory',
                        id,
                        title: '删除日记记录',
                        description: mem.title ? `${mem.title} - ${mem.content}` : mem.content,
                      });
                    }}
                  />
                ))}

                {/* Pagination Controls for Memories */}
                <ListPaginationControl
                  totalCount={filteredMemories.length}
                  visibleCount={memoriesVisibleCount}
                  onShowMore={() => setMemoriesVisibleCount((prev) => prev + 10)}
                  onCollapse={() => setMemoriesVisibleCount(10)}
                  itemName="条日记记录"
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Dual-Track Delete / Offload Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget?.title || '删除记录'}
        itemDescription={deleteTarget?.description}
        onOffload={() => {
          if (deleteTarget) {
            const collectionMap = {
              memory: 'memories',
              photo: 'photos',
              note: 'notes',
            } as const;
            offloadItem(collectionMap[deleteTarget.type], deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onPermanentDelete={() => {
          if (deleteTarget) {
            const collectionMap = {
              memory: 'memories',
              photo: 'photos',
              note: 'notes',
            } as const;
            permanentDeleteItem(collectionMap[deleteTarget.type], deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};
