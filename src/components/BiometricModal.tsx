// src/components/BiometricModal.tsx
import React, { useState } from 'react';
import { Lock, KeyRound, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface BiometricModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BiometricModal: React.FC<BiometricModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { unlockBiometric } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockBiometric(pin)) {
      setError(false);
      setPin('');
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-[#57B8E3] mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">反思隐私锁已启用</h3>
          <p className="text-xs text-slate-500 mt-1">
            请输入您设置的安全密码或 PIN 码以继续查看深度反思
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <input
                id="input-pin"
                type="password"
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(false);
                }}
                placeholder="输入访问 PIN 码"
                className="w-full text-center tracking-widest text-lg font-mono py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
                autoFocus
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            </div>
            {error && (
              <p className="text-xs text-rose-500 text-center mt-1.5 font-medium">
                密码不正确，请重新输入
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[#57B8E3] hover:bg-[#46a5d0] text-white font-medium text-sm rounded-xl transition-colors shadow-xs"
          >
            立即解锁
          </button>
        </form>
      </div>
    </div>
  );
};
