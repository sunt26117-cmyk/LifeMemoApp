// src/components/Navigation.tsx
import React from 'react';
import {
  CalendarDays,
  CheckSquare,
  Sparkles,
  BookOpen,
  Settings,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabaseService } from '../services/supabaseService';
import { getThemeColors } from '../utils/themeStyles';

interface NavigationProps {
  onQuickAction?: () => void;
}

export const Navigation: React.FC<NavigationProps> = () => {
  const { activeTab, setActiveTab, setSettingsOpen, syncStatus, theme } = useApp();
  const themeColors = getThemeColors(theme);

  const isConfigured = supabaseService.isConfigured();

  const tabs = [
    { id: 'today', label: '今日', icon: CalendarDays },
    { id: 'records', label: '记录', icon: BookOpen },
    { id: 'tasks', label: '待办', icon: CheckSquare },
    { id: 'review', label: '复盘', icon: Sparkles },
  ] as const;

  return (
    <>
      {/* Top Header */}
      <header
        className={`sticky top-0 z-30 backdrop-blur-md border-b shadow-xs px-4 py-3 flex items-center justify-between transition-colors ${themeColors.headerBg}`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${themeColors.logoGradient} flex items-center justify-center text-white font-bold shadow-xs text-sm transition-all`}
          >
            限
          </div>
          <div>
            <h1 className={`text-base font-semibold ${themeColors.textMain} leading-tight flex items-center gap-1.5`}>
              <span>人生不设限</span>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                title={
                  syncStatus.state === 'syncing'
                    ? '正在与 Supabase 同步...'
                    : isConfigured
                    ? 'Supabase 云端已连接'
                    : '本地单机模式（点击配置 Supabase）'
                }
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-normal transition-colors ${
                  syncStatus.state === 'syncing'
                    ? 'bg-amber-100 text-amber-700'
                    : isConfigured
                    ? 'bg-emerald-100 text-emerald-700'
                    : `${themeColors.subtleBg} ${themeColors.textSub}`
                }`}
              >
                {syncStatus.state === 'syncing' ? (
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <Cloud className="w-2.5 h-2.5" />
                )}
                <span>{syncStatus.state === 'syncing' ? '同步中' : isConfigured ? '云端' : '本地'}</span>
              </button>
            </h1>
            <p className={`text-xs ${themeColors.textSub}`}>自律 · 洞察 · 闭环</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-open-settings"
            onClick={() => setSettingsOpen(true)}
            className={`p-2 ${themeColors.textSub} hover:${themeColors.textMain} ${themeColors.subtleHoverBg} rounded-full transition-colors`}
            title="系统设置与偏好"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Bottom 4-Tab Navigation */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-30 backdrop-blur-md border-t py-1.5 px-6 flex items-center justify-around shadow-lg max-w-md mx-auto sm:max-w-xl transition-colors ${themeColors.navBg}`}
      >
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
                  ? `${themeColors.activeTabText} font-semibold scale-105`
                  : `${themeColors.textSub} hover:${themeColors.textMain}`
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-colors ${
                  isActive ? themeColors.activeTabBg : 'bg-transparent'
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
