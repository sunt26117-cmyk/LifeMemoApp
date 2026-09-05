// src/components/RecordsView.tsx
import React, { useState, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Memory, Note, Photo } from '../types';
import { fuzzySearch } from '../utils/fuzzySearch';
import { MemoryCard } from './records/MemoryCard';
import { NoteCard } from './records/NoteCard';
import { PhotoGrid } from './records/PhotoGrid';
import { DeleteConfirmationModal } from './records/DeleteConfirmationModal';
import { getThemeColors } from '../utils/themeStyles';

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
    deleteMemory,
    notes,
    deleteNote,
    photos,
    deletePhoto,
    offloadItem,
    permanentDeleteItem,
    theme,
  } = useApp();

  const themeColors = getThemeColors(theme);

  const [activeSubTab, setActiveSubTab] = useState<'all' | 'memories' | 'notes' | 'photos'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Dual-track deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'photo' | 'memory' | 'note';
    id: string;
    title: string;
    description?: string;
  } | null>(null);

  // All unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    memories.forEach((m) => m.tags.forEach((t) => set.add(t)));
    notes.forEach((n) => n.tags.forEach((t) => set.add(t)));
    photos.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [memories, notes, photos]);

  // Filtered Memories
  const filteredMemories: Memory[] = useMemo(() => {
    let list = memories;
    if (selectedTag) {
      list = list.filter((m) => m.tags.includes(selectedTag));
    }
    if (searchQuery.trim()) {
      return fuzzySearch<Memory>({
        items: list,
        query: searchQuery,
        getTexts: (m: Memory) => [m.title || '', m.content, m.aiSummary || '', ...m.tags],
      }).map((r) => r.item);
    }
    return list;
  }, [memories, searchQuery, selectedTag]);

  // Filtered Notes
  const filteredNotes: Note[] = useMemo(() => {
    let list = notes;
    if (selectedTag) {
      list = list.filter((n) => n.tags.includes(selectedTag));
    }
    if (searchQuery.trim()) {
      return fuzzySearch<Note>({
        items: list,
        query: searchQuery,
        getTexts: (n: Note) => [n.title, n.content, ...n.tags],
      }).map((r) => r.item);
    }
    return [...list].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }, [notes, searchQuery, selectedTag]);

  // Filtered Photos
  const filteredPhotos: Photo[] = useMemo(() => {
    let list = photos;
    if (selectedTag) {
      list = list.filter((p) => p.tags.includes(selectedTag));
    }
    if (searchQuery.trim()) {
      return fuzzySearch<Photo>({
        items: list,
        query: searchQuery,
        getTexts: (p: Photo) => [p.aiSummary || '', p.locationName || '', ...p.tags],
      }).map((r) => r.item);
    }
    return list;
  }, [photos, searchQuery, selectedTag]);

  return (
    <div className="space-y-4 pb-20">
      {/* Sub Tabs */}
      <div className="flex items-center justify-between">
        <div className={`flex gap-1 p-1 ${themeColors.segmentBg} rounded-2xl`}>
          {[
            { id: 'all', label: '全部' },
            { id: 'memories', label: `文字 (${memories.length})` },
            { id: 'notes', label: `便签 (${notes.length})` },
            { id: 'photos', label: `照片 (${photos.length})` },
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

        {/* Action Button */}
        <div className="flex gap-1.5">
          {activeSubTab === 'notes' && (
            <button
              onClick={onOpenNoteCreate}
              className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs transition-colors"
              title="新建便签"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          {activeSubTab === 'photos' && (
            <button
              onClick={onOpenMemoryCreate}
              className={`p-2 ${themeColors.actionBtn} text-white rounded-xl shadow-xs transition-colors flex items-center gap-1 text-xs font-medium`}
              title="写记录配图"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          {(activeSubTab === 'all' || activeSubTab === 'memories') && (
            <button
              onClick={onOpenMemoryCreate}
              className={`p-2 ${themeColors.actionBtn} text-white rounded-xl shadow-xs transition-colors`}
              title="写记录"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Fuzzy Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="模糊搜索记录内容、标题、标签或地点..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full text-xs py-2 px-3 pl-8 ${themeColors.cardBg} border ${themeColors.cardBorder} rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-400 shadow-xs ${themeColors.textMain}`}
        />
        <Search className={`w-3.5 h-3.5 ${themeColors.textSub} absolute left-2.5 top-3`} />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className={`text-xs ${themeColors.textSub} hover:${themeColors.textMain} absolute right-3 top-2`}
          >
            ×
          </button>
        )}
      </div>

      {/* Tag Chips */}
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
      <div className="space-y-3">
        {(activeSubTab === 'all' || activeSubTab === 'photos') && (
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
                title: '删除照片记录',
                description: p?.aiSummary || '包含照片文件与AI解析摘要',
              });
            }}
          />
        )}

        {(activeSubTab === 'all' || activeSubTab === 'notes') && filteredNotes.length > 0 && (
          <div className="space-y-2">
            {activeSubTab === 'all' && (
              <span className={`text-xs font-semibold ${themeColors.textMain} block px-1`}>
                便签备忘 ({filteredNotes.length})
              </span>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredNotes.map((note) => (
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
          </div>
        )}

        {(activeSubTab === 'all' || activeSubTab === 'memories') && (
          <div className="space-y-2.5">
            {activeSubTab === 'all' && (
              <span className={`text-xs font-semibold ${themeColors.textMain} block px-1`}>
                日记与事实记录 ({filteredMemories.length})
              </span>
            )}

            {filteredMemories.length === 0 ? (
              <div className={`${themeColors.cardBg} p-8 rounded-2xl border ${themeColors.cardBorder} text-center text-xs ${themeColors.textSub}`}>
                暂无匹配的记录内容
              </div>
            ) : (
              filteredMemories.map((mem) => (
                <MemoryCard
                  key={mem.id}
                  memory={mem}
                  onEdit={onOpenMemoryEdit}
                  onDelete={(id) => {
                    setDeleteTarget({
                      type: 'memory',
                      id,
                      title: '删除日记/事实记录',
                      description: mem.title ? `${mem.title} - ${mem.content}` : mem.content,
                    });
                  }}
                />
              ))
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
          }
        }}
      />
    </div>
  );
};
