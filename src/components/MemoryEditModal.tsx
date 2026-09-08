// src/components/MemoryEditModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Plus, MapPin, Camera, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { Memory } from '../types';
import { useApp } from '../context/AppContext';
import { AiService } from '../services/aiService';
import { getCityNameFromCoords, requestAndGetCurrentPosition } from '../utils/geoUtil';
import { getThemeColors } from '../utils/themeStyles';

interface MemoryEditModalProps {
  isOpen: boolean;
  memory?: Memory | null;
  onClose: () => void;
}

const COMMON_CITIES = ['成都市', '北京市', '上海市', '深圳市', '广州市', '杭州市', '武汉市', '西安市'];

export const MemoryEditModal: React.FC<MemoryEditModalProps> = ({
  isOpen,
  memory,
  onClose,
}) => {
  const { addMemory, updateMemory, addPhoto, photos, theme } = useApp();
  const themeColors = getThemeColors(theme);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState(memory?.title || '');
  const [content, setContent] = useState(memory?.content || '');
  const [tags, setTags] = useState<string[]>(memory?.tags || ['记录']);
  const [newTag, setNewTag] = useState('');
  const [aiSummary, setAiSummary] = useState(memory?.aiSummary || '');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>(memory?.relatedMediaIds || []);
  const [directPhotos, setDirectPhotos] = useState<string[]>(memory?.photos || []);
  const [locationName, setLocationName] = useState(memory?.locationName || '');
  const [latitude, setLatitude] = useState<number | null>(memory?.latitude || null);
  const [longitude, setLongitude] = useState<number | null>(memory?.longitude || null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Explicitly reset form fields whenever modal opens or memory changes
  useEffect(() => {
    if (isOpen) {
      if (memory) {
        setTitle(memory.title || '');
        setContent(memory.content || '');
        setTags(memory.tags ? [...memory.tags] : ['记录']);
        setAiSummary(memory.aiSummary || '');
        setSelectedPhotos(memory.relatedMediaIds ? [...memory.relatedMediaIds] : []);
        setDirectPhotos(memory.photos ? [...memory.photos] : []);
        setLocationName(memory.locationName || '');
        setLatitude(memory.latitude || null);
        setLongitude(memory.longitude || null);
      } else {
        setTitle('');
        setContent('');
        setTags(['记录']);
        setAiSummary('');
        setSelectedPhotos([]);
        setDirectPhotos([]);
        setLocationName('');
        setLatitude(null);
        setLongitude(null);
      }
      setNewTag('');
      setLocationError(null);
      setLocating(false);
      setGenerating(false);
    }
  }, [isOpen, memory]);

  const resetAndClose = () => {
    setTitle('');
    setContent('');
    setTags(['记录']);
    setAiSummary('');
    setSelectedPhotos([]);
    setDirectPhotos([]);
    setLocationName('');
    setLatitude(null);
    setLongitude(null);
    setNewTag('');
    onClose();
  };

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleFetchLocation = async () => {
    setLocating(true);
    setLocationError(null);
    try {
      const coords = await requestAndGetCurrentPosition();
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
      try {
        const cityName = await getCityNameFromCoords(coords.latitude, coords.longitude);
        setLocationName(cityName);
      } catch {
        setLocationName('当前定位城市');
      }
    } catch (err: any) {
      console.warn('Geolocation failed:', err);
      setLocationError(err?.message || '未能获取到实时GPS，可点击下方城市快捷填入');
    } finally {
      setLocating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = event.target?.result as string;
        if (res) {
          setDirectPhotos((prev) => [...prev, res]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveDirectPhoto = (index: number) => {
    setDirectPhotos(directPhotos.filter((_, i) => i !== index));
  };

  const handleGenerateSummary = async () => {
    if (!content.trim()) return;
    setGenerating(true);
    try {
      const summary = await AiService.generateMemorySummary(content);
      setAiSummary(summary);
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const finalTitle = title.trim() || content.trim().slice(0, 15) + '...';

    // Also register newly uploaded direct photos into Photo store so they show up in PhotoGrid
    const newLinkedMediaIds = [...selectedPhotos];
    directPhotos.forEach((src) => {
      const exists = photos.find((p) => p.localPath === src);
      if (!exists) {
        const createdPhoto = addPhoto({
          localPath: src,
          takenAt: new Date().toISOString(),
          aiSummary: finalTitle,
          summaryConfirmed: true,
          tags: [...tags],
          relatedMemoryIds: [],
          locationName: locationName.trim() || null,
          latitude,
          longitude,
        });
        newLinkedMediaIds.push(createdPhoto.id);
      } else if (!newLinkedMediaIds.includes(exists.id)) {
        newLinkedMediaIds.push(exists.id);
      }
    });

    const memoryPayload = {
      title: finalTitle,
      content: content.trim(),
      tags,
      aiSummary: aiSummary.trim() || null,
      relatedMediaIds: newLinkedMediaIds,
      photos: directPhotos,
      locationName: locationName.trim() || null,
      latitude,
      longitude,
    };

    if (memory) {
      updateMemory({
        ...memory,
        ...memoryPayload,
      });
    } else {
      addMemory(memoryPayload);
    }
    resetAndClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className={`bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 relative max-h-[90vh] overflow-y-auto border ${themeColors.cardBorder}`}>
        <button
          onClick={resetAndClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-semibold text-slate-800 mb-4">
          {memory ? '编辑生活记录' : '写记录（图文配图 · 朋友圈式）'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">标题（选填）</label>
            <input
              type="text"
              placeholder="简要概括主题，留空自动提取"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none ${themeColors.focusRing}`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              内容 <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              placeholder="记录今天发生的事实、灵感或对话细节..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none ${themeColors.focusRing}`}
            />
          </div>

          {/* Location Picker (EXT-07 方案 A 统一规范) */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>所在位置 / 城市（可选）</span>
              </label>
              <button
                type="button"
                onClick={handleFetchLocation}
                disabled={locating}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 bg-emerald-100/70 hover:bg-emerald-100 px-2 py-0.5 rounded-lg transition-colors"
              >
                {locating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>定位中...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-3 h-3" />
                    <span>获取当前定位</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="直接显示所在城市名（如：成都市 / 北京市海淀区）"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="flex-1 text-xs py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-medium text-slate-800"
              />
              {locationName && (
                <button
                  type="button"
                  onClick={() => {
                    setLocationName('');
                    setLatitude(null);
                    setLongitude(null);
                  }}
                  className="text-xs text-slate-400 hover:text-rose-500 px-1"
                >
                  清除
                </button>
              )}
            </div>

            {/* Quick City Presets */}
            <div className="pt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-400">快捷城市:</span>
              {COMMON_CITIES.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => setLocationName(city)}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                    locationName === city
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>

            {locationError && (
              <p className="text-[10px] text-amber-600 pt-0.5">{locationError}</p>
            )}
          </div>

          {/* Photo Uploader (方案 A: 文字可配图，统一整合) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Camera className={`w-3.5 h-3.5 ${themeColors.primaryText}`} />
                <span>配图相册（支持多图上传）</span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`text-[11px] ${themeColors.primaryText} font-medium flex items-center gap-1 ${themeColors.subtleBg} px-2 py-0.5 rounded-lg hover:opacity-85`}
              >
                <Plus className="w-3 h-3" />
                <span>上传照片/拍照</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Direct photos preview grid */}
            {directPhotos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {directPhotos.map((src, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveDirectPhoto(idx)}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition-colors"
                      title="移除此图"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Summary */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600">AI 事实摘要（1-2句）</label>
              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={generating || !content.trim()}
                className="flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-700 disabled:opacity-50 font-medium"
              >
                <Sparkles className="w-3 h-3" />
                <span>{generating ? '生成中...' : '生成客观摘要'}</span>
              </button>
            </div>
            <input
              type="text"
              placeholder="点击右上角自动提炼，或手动编辑..."
              value={aiSummary}
              onChange={(e) => setAiSummary(e.target.value)}
              className={`w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none ${themeColors.focusRing}`}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">标签分类</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 ${themeColors.subtleBg} ${themeColors.primaryText} rounded-full font-medium border ${themeColors.subtleBorder}`}
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-rose-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="添加新标签..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className={`flex-1 text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none ${themeColors.focusRing}`}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加</span>
              </button>
            </div>
          </div>

          {/* Associate Existing Photos */}
          {photos.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">关联已有图库照片</label>
              <div className="grid grid-cols-4 gap-2">
                {photos.slice(0, 4).map((p) => {
                  const isSelected = selectedPhotos.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedPhotos(selectedPhotos.filter((id) => id !== p.id));
                        } else {
                          setSelectedPhotos([...selectedPhotos, p.id]);
                        }
                      }}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        isSelected ? 'scale-95 shadow-sm' : 'border-transparent'
                      }`}
                      style={{
                        borderColor: isSelected ? themeColors.primaryHex : 'transparent',
                      }}
                    >
                      <img src={p.localPath} alt="" className="w-full h-full object-cover" />
                      {isSelected && (
                        <div
                          className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs"
                          style={{ backgroundColor: `${themeColors.primaryHex}4D` }}
                        >
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className={`px-4 py-2 ${themeColors.actionBtn} text-white text-xs font-medium rounded-xl transition-colors shadow-xs`}
            >
              保存记录
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
