// src/components/review/ManageHabitsModal.tsx
import React, { useState } from 'react';
import { X, Check, Power, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ManageHabitsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManageHabitsModal: React.FC<ManageHabitsModalProps> = ({ isOpen, onClose }) => {
  const { checkInTypes, addCheckInType, updateCheckInType } = useApp();
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeSymbol, setNewTypeSymbol] = useState('⭐');

  if (!isOpen) return null;

  const handleToggleHabitEnabled = (type: typeof checkInTypes[0]) => {
    updateCheckInType({
      ...type,
      enabled: !type.enabled,
    });
  };

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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 relative">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800">管理打卡习惯</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-slate-500 mb-2">
          点击右侧开关可快速启用或禁用对应习惯。禁用的习惯不会出现在每日打卡清单中。
        </p>

        <div className="space-y-2 max-h-56 overflow-y-auto mb-4 divide-y divide-slate-100 pr-1">
          {checkInTypes.map((t) => (
            <div
              key={t.id}
              className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
                t.enabled
                  ? 'bg-slate-50 border border-slate-200/80'
                  : 'bg-slate-100/60 border border-slate-200/40 opacity-65'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{t.symbol}</span>
                <div>
                  <span
                    className={`font-medium ${
                      t.enabled ? 'text-slate-800' : 'text-slate-400 line-through'
                    }`}
                  >
                    {t.name}
                  </span>
                  <span
                    className={`text-[10px] ml-2 px-1.5 py-0.5 rounded-full ${
                      t.enabled
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {t.enabled ? '已启用' : '已禁用'}
                  </span>
                </div>
              </div>

              {/* Toggle Switch / Button */}
              <button
                type="button"
                onClick={() => handleToggleHabitEnabled(t)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  t.enabled
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300 border border-slate-300'
                }`}
                title={t.enabled ? '点击禁用该习惯' : '点击启用该习惯'}
              >
                <Power className="w-3 h-3" />
                <span>{t.enabled ? '禁用' : '启用'}</span>
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleCreateCheckInType} className="space-y-3 pt-2 border-t border-slate-100">
          <label className="block text-[11px] font-semibold text-slate-700">新增自定义习惯</label>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={2}
              value={newTypeSymbol}
              onChange={(e) => setNewTypeSymbol(e.target.value)}
              placeholder="图标"
              className="w-12 text-center text-sm py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#4A90D9]"
            />
            <input
              type="text"
              maxLength={4}
              required
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="习惯名称（如早起）"
              className="flex-1 text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#4A90D9]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#4A90D9] hover:bg-[#3d7ec1] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加</span>
            </button>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              完成
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

