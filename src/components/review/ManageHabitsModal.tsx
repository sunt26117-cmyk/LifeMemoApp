// src/components/review/ManageHabitsModal.tsx
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

interface ManageHabitsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManageHabitsModal: React.FC<ManageHabitsModalProps> = ({ isOpen, onClose }) => {
  const { checkInTypes, addCheckInType } = useApp();
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeSymbol, setNewTypeSymbol] = useState('⭐');

  if (!isOpen) return null;

  const handleCreateCheckInType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    const name = newTypeName.trim().slice(0, 4);
    addCheckInType({
      name,
      symbol: newTypeSymbol || '⭐',
      colorHex: '#4A90D9',
      sortOrder: checkInTypes.length + 1,
      enabled: true,
    });
    setNewTypeName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 relative">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">管理打卡习惯</h3>

        <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
          {checkInTypes.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs"
            >
              <span className="flex items-center gap-1.5">
                <span>{t.symbol}</span>
                <span>{t.name}</span>
              </span>
              <span className="text-[10px] text-slate-400">已启用</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleCreateCheckInType} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={2}
              value={newTypeSymbol}
              onChange={(e) => setNewTypeSymbol(e.target.value)}
              placeholder="图标"
              className="w-12 text-center text-sm py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            />
            <input
              type="text"
              maxLength={4}
              required
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="习惯名称（如早起）"
              className="flex-1 text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              关闭
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#4A90D9] hover:bg-[#3d7ec1] text-white text-xs font-medium rounded-lg transition-colors"
            >
              新增习惯
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
