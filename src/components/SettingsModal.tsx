// src/components/SettingsModal.tsx
import React, { useState } from 'react';
import {
  X,
  Key,
  Shield,
  RefreshCw,
  Download,
  Upload,
  Check,
  Database,
  Cloud,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppStorage } from '../services/storage';
import { supabaseService } from '../services/supabaseService';

export const SettingsModal: React.FC = () => {
  const {
    settingsOpen,
    setSettingsOpen,
    hasPin,
    setPin,
    syncStatus,
    uploadToSupabase,
    pullFromSupabase,
  } = useApp();

  const [apiKey, setApiKey] = useState(() => AppStorage.getApiKey() || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Supabase state
  const [supabaseConfig, setSupabaseConfig] = useState(() => supabaseService.getConfig());
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseTestMsg, setSupabaseTestMsg] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [syncingAction, setSyncingAction] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!settingsOpen) return null;

  const handleSaveApiKey = () => {
    AppStorage.setApiKey(apiKey.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleSaveSupabaseConfig = async () => {
    supabaseService.setConfig(supabaseConfig);
    setTestingSupabase(true);
    setSupabaseTestMsg(null);
    const testRes = await supabaseService.testConnection();
    setTestingSupabase(false);
    setSupabaseTestMsg(testRes);
  };

  const handleManualUpload = async () => {
    if (!supabaseService.isConfigured()) {
      alert('请先配置 Supabase URL 和 Anon Key');
      return;
    }
    setSyncingAction('upload');
    setSyncFeedback(null);
    const res = await uploadToSupabase();
    setSyncingAction(null);
    setSyncFeedback(res.message);
  };

  const handleManualPull = async () => {
    if (!supabaseService.isConfigured()) {
      alert('请先配置 Supabase URL 和 Anon Key');
      return;
    }
    if (
      !window.confirm('从云端拉取将覆盖本地修改，确定拉取吗？')
    ) {
      return;
    }
    setSyncingAction('pull');
    setSyncFeedback(null);
    const res = await pullFromSupabase();
    setSyncingAction(null);
    setSyncFeedback(res.message);
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
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setSettingsOpen(false)}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-semibold text-slate-800 mb-4">系统设置与云同步</h3>

        <div className="space-y-5">
          {/* Supabase Cloud Storage */}
          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <label className="text-xs font-semibold text-slate-800">
                  Supabase 云端保存与同步
                </label>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  supabaseService.isConfigured()
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {supabaseService.isConfigured() ? '● 已配置云端' : '○ 本地单机模式'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              配置 Supabase 后，数据将实时增量持久化同步至 Postgres 云端，支持跨端与断网自动离线缓存。
            </p>

            <div className="space-y-2 mb-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Project URL:
                </label>
                <input
                  type="text"
                  value={supabaseConfig.url}
                  onChange={(e) =>
                    setSupabaseConfig({ ...supabaseConfig, url: e.target.value.trim() })
                  }
                  placeholder="https://your-project.supabase.co"
                  className="w-full text-xs py-1.5 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Anon Public Key:
                </label>
                <div className="relative">
                  <input
                    type={showAnonKey ? 'text' : 'password'}
                    value={supabaseConfig.anonKey}
                    onChange={(e) =>
                      setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value.trim() })
                    }
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full text-xs py-1.5 pl-3 pr-8 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAnonKey(!showAnonKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    title={showAnonKey ? '隐藏' : '显示'}
                  >
                    {showAnonKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={supabaseConfig.autoSync ?? true}
                    onChange={(e) =>
                      setSupabaseConfig({ ...supabaseConfig, autoSync: e.target.checked })
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                  />
                  <span>开启数据变更实时自动静默同步至云端</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              <button
                type="button"
                onClick={handleSaveSupabaseConfig}
                disabled={testingSupabase}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
              >
                {testingSupabase ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Cloud className="w-3.5 h-3.5" />
                )}
                <span>保存并测试连接</span>
              </button>

              <button
                type="button"
                onClick={handleManualUpload}
                disabled={!supabaseService.isConfigured() || syncingAction !== null}
                className="px-2.5 py-1.5 bg-white hover:bg-emerald-100/60 border border-emerald-300 text-emerald-800 disabled:opacity-40 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>立即推送到云端</span>
              </button>

              <button
                type="button"
                onClick={handleManualPull}
                disabled={!supabaseService.isConfigured() || syncingAction !== null}
                className="px-2.5 py-1.5 bg-white hover:bg-emerald-100/60 border border-emerald-300 text-emerald-800 disabled:opacity-40 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>从云端拉取</span>
              </button>
            </div>

            {/* Status messages */}
            {supabaseTestMsg && (
              <div
                className={`text-[11px] p-2 rounded-lg flex items-center gap-1.5 mt-2 ${
                  supabaseTestMsg.success
                    ? 'bg-emerald-100/80 text-emerald-800'
                    : 'bg-rose-100/80 text-rose-800'
                }`}
              >
                {supabaseTestMsg.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{supabaseTestMsg.message}</span>
              </div>
            )}

            {syncFeedback && (
              <div className="text-[11px] text-emerald-700 bg-emerald-100/60 p-2 rounded-lg mt-2">
                {syncFeedback}
              </div>
            )}

            {syncStatus.lastSyncedAt && (
              <div className="text-[10px] text-slate-400 mt-2">
                最近云端同步：{new Date(syncStatus.lastSyncedAt).toLocaleString('zh-CN')}
              </div>
            )}
          </div>

          {/* Android APK & PWA Package */}
          <div className="p-3.5 bg-sky-50/60 rounded-xl border border-sky-200/80">
            <div className="flex items-center gap-2 mb-1.5">
              <Smartphone className="w-4 h-4 text-sky-600" />
              <label className="text-xs font-semibold text-slate-800">
                安卓原生 APK / PWA 移动端运行
              </label>
            </div>
            <p className="text-[11px] text-slate-600 mb-2">
              本系统已配置 <strong>Capacitor Android</strong> 原生工程与 <strong>PWA 离线支持</strong>：
            </p>
            <div className="bg-white/80 border border-sky-100 rounded-lg p-2.5 text-[11px] text-slate-700 space-y-1">
              <div>
                <strong>方法 1（立即在手机使用）：</strong>手机浏览器打开本链接，点击菜单中「<strong>添加到主屏幕</strong>」即可秒变原生 App 全屏运行，支持离线记录。
              </div>
              <div>
                <strong>方法 2（编译 APK）：</strong>项目根目录下执行 <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700">npx cap sync android</code> 与 <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700">npx cap open android</code>，在 Android Studio 中点击 <em>Build APK</em> 即可输出 release/debug APK。
              </div>
            </div>
          </div>

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
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full text-xs py-1.5 pl-3 pr-8 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#57B8E3]"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title={showApiKey ? '隐藏' : '显示'}
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 bg-[#57B8E3] hover:bg-[#46a5d0] text-white text-xs font-medium rounded-lg flex items-center gap-1 shrink-0"
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
