// src/components/SettingsModal.tsx
import React, { useState } from 'react';
import { X, Key, Shield, RefreshCw, Download, Upload, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppStorage } from '../services/storage';

export const SettingsModal: React.FC = () => {
  const { settingsOpen, setSettingsOpen, hasPin, setPin } = useApp();

  const [apiKey, setApiKey] = useState(() => AppStorage.getApiKey() || '');
  const [pinInput, setPinInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!settingsOpen) return null;

  const handleSaveApiKey = () => {
    AppStorage.setApiKey(apiKey.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleUpdatePin = () => {
    if (pinInput.trim()) {
      setPin(pinInput.trim());
      setPinInput('');
      alert('已成功设置反思安全锁 PIN 码');
    } else {
      setPin(null);
      alert('已清除安全锁');
    }
  };

  const handleResetData = () => {
    if (window.confirm('确定要重置所有记录为默认初始样例数据吗？')) {
      AppStorage.resetAll();
      alert('已成功重置数据');
      setSettingsOpen(false);
    }
  };

  const handleExportData = () => {
    const data = {
      memories: AppStorage.getMemories(),
      photos: AppStorage.getPhotos(),
      notes: AppStorage.getNotes(),
      tasks: AppStorage.getTasks(),
      reflections: AppStorage.getReflections(),
      checkInTypes: AppStorage.getCheckInTypes(),
      checkInRecords: AppStorage.getCheckInRecords(),
      trends: AppStorage.getTrends(),
      themes: AppStorage.getThemes(),
      summaries: AppStorage.getSummaries(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life_memo_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setSettingsOpen(false)}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-semibold text-slate-800 mb-4">系统设置</h3>

        <div className="space-y-5">
          {/* API Key */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-1.5">
              <Key className="w-4 h-4 text-[#57B8E3]" />
              <label className="text-xs font-semibold text-slate-800">
                DeepSeek / OpenAI API Key（可选）
              </label>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              配置真实 API 密钥以调用 DeepSeek 官方模型。若不填写，系统将自动使用合规内置启发式 AI 引擎。
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="flex-1 text-xs py-1.5 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#57B8E3]"
              />
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 bg-[#57B8E3] hover:bg-[#46a5d0] text-white text-xs font-medium rounded-lg flex items-center gap-1"
              >
                {saveSuccess ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{saveSuccess ? '已保存' : '保存'}</span>
              </button>
            </div>
          </div>

          {/* Biometric / PIN Lock */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-1.5">
              <Shield className="w-4 h-4 text-purple-600" />
              <label className="text-xs font-semibold text-slate-800">
                反思隐私安全锁（PIN）
              </label>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              当前状态：{hasPin ? '🔒 已开启密码保护' : '🔓 未开启（反思记录直接可见）'}
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder={hasPin ? '输入新密码覆盖，留空保存可解除' : '设置 4-8 位 PIN 码'}
                className="flex-1 text-xs py-1.5 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={handleUpdatePin}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg"
              >
                {pinInput ? '设置' : hasPin ? '解除锁定' : '设置'}
              </button>
            </div>
          </div>

          {/* Backup & Reset */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">数据导出备份</span>
              <button
                type="button"
                onClick={handleExportData}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>导出 JSON</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="text-xs text-rose-600 font-medium block">恢复初始样例数据</span>
                <span className="text-[10px] text-slate-400">重置并加载标准的完整测试样例</span>
              </div>
              <button
                type="button"
                onClick={handleResetData}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>重置数据</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
