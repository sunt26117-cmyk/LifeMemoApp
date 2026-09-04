// src/components/RecordsView.tsx
import React, { useState, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Memory, Note, Photo } from '../types';
import { fuzzySearch } from '../utils/fuzzySearch';
import { MemoryCard } from './records/MemoryCard';
import { NoteCard } from './records/NoteCard';
import { PhotoGrid } from './records/PhotoGrid';

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
  const { memories, deleteMemory, notes, deleteNote, photos, deletePhoto } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'all' | 'memories' | 'notes' | 'photos'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

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
        <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
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
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
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
              onClick={onOpenPhotoCreate}
              className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-xs transition-colors"
              title="添加照片"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          {(activeSubTab === 'all' || activeSubTab === 'memories') && (
            <button
              onClick={onOpenMemoryCreate}
              className="p-2 bg-[#4A90D9] hover:bg-[#3d7ec1] text-white rounded-xl shadow-xs transition-colors"
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
          className="w-full text-xs py-2 px-3 pl-8 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A90D9] shadow-xs"
        />
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-slate-400 hover:text-slate-600 absolute right-3 top-2"
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
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                  ? 'bg-[#4A90D9] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
            onDelete={deletePhoto}
          />
        )}

        {(activeSubTab === 'all' || activeSubTab === 'notes') && filteredNotes.length > 0 && (
          <div className="space-y-2">
            {activeSubTab === 'all' && (
              <span className="text-xs font-semibold text-slate-700 block px-1">
                便签备忘 ({filteredNotes.length})
              </span>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={onOpenNoteEdit}
                  onDelete={deleteNote}
                />
              ))}
            </div>
          </div>
        )}

        {(activeSubTab === 'all' || activeSubTab === 'memories') && (
          <div className="space-y-2.5">
            {activeSubTab === 'all' && (
              <span className="text-xs font-semibold text-slate-700 block px-1">
                日记与事实记录 ({filteredMemories.length})
              </span>
            )}

            {filteredMemories.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-xs text-slate-400">
                暂无匹配的记录内容
              </div>
            ) : (
              filteredMemories.map((mem) => (
                <MemoryCard
                  key={mem.id}
                  memory={mem}
                  onEdit={onOpenMemoryEdit}
                  onDelete={deleteMemory}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
