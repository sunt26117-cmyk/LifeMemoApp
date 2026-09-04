// src/components/Navigation.tsx
import React from 'react';
import {
  CalendarDays,
  CheckSquare,
  Sparkles,
  BookOpen,
  Settings,
  Plus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface NavigationProps {
  onQuickAction: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ onQuickAction }) => {
  const { activeTab, setActiveTab, setSettingsOpen } = useApp();

  const tabs = [
    { id: 'today', label: '今日', icon: CalendarDays },
    { id: 'records', label: '记录', icon: BookOpen },
    { id: 'tasks', label: '待办', icon: CheckSquare },
    { id: 'review', label: '复盘', icon: Sparkles },
  ] as const;

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-xs px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#57B8E3] to-[#AEE3F5] flex items-center justify-center text-white font-bold shadow-xs">
            忆
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-800 leading-tight">
              AI 生活记录系统
            </h1>
            <p className="text-xs text-slate-400">自律 · 洞察 · 闭环</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-quick-create"
            onClick={onQuickAction}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#57B8E3] hover:bg-[#46a5d0] text-white text-xs font-medium rounded-full shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>记录</span>
          </button>
          <button
            id="btn-open-settings"
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
            title="系统设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Bottom 4-Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-100 py-1.5 px-6 flex items-center justify-around shadow-lg max-w-md mx-auto sm:max-w-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
                isActive
                  ? 'text-[#57B8E3] font-semibold scale-105'
                  : 'text-[#B9C4D6] hover:text-slate-600'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-colors ${
                  isActive ? 'bg-sky-50' : 'bg-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
