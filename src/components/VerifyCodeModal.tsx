import React, { useState, useEffect } from 'react';
import { X, KeyRound, Check, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { Game } from '../types';

interface VerifyCodeModalProps {
  isOpen: boolean;
  preselectedGame: Game | null;
  onClose: () => void;
  onSubmitCode: (code: string) => Promise<{ success: boolean; message: string; errorCode?: string }>;
}

export const VerifyCodeModal: React.FC<VerifyCodeModalProps> = ({
  isOpen,
  preselectedGame,
  onClose,
  onSubmitCode
}) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Participant must enter the code told by the host; never autofill
      setCode('');
      setErrorMessage(null);
    }
  }, [isOpen, preselectedGame]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setErrorMessage('Пожалуйста, введите проверочный код');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await onSubmitCode(trimmed);
      if (!result.success) {
        setErrorMessage(result.message || 'Ошибка проверки кода');
      } else {
        onClose();
      }
    } catch {
      setErrorMessage('Не удалось связаться с сервером. Попробуйте ещё раз.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gray-900 text-white flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center">
              <KeyRound className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-bold text-base font-serif text-white">
                Подтвердить прохождение
              </h2>
              {preselectedGame && (
                <p className="text-xs text-gray-300 truncate max-w-[220px]">
                  Точка #{preselectedGame.number}: {preselectedGame.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-verify-code-btn"
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
            Введите одноразовый код, который вам назвал ведущий игры. Каждый код уникален и действует для одного участника.
          </p>

          {/* Large Code Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              Проверочный код
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                id="verification-code-input"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Например: HAZYH-014"
                className="w-full h-14 px-4 text-center tracking-widest font-mono text-xl font-bold uppercase rounded-2xl bg-gray-50 border-2 border-gray-300 focus:border-red-600 focus:bg-white focus:outline-none transition-all placeholder:text-gray-400 placeholder:text-sm placeholder:tracking-normal placeholder:font-sans"
              />
            </div>
          </div>

          {/* Error Message banner */}
          {errorMessage && (
            <div
              id="verify-code-error-box"
              className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">
                  {errorMessage.includes('уже использован') ? 'Код уже использован' : 'Ошибка проверки'}
                </div>
                <div className="mt-0.5">{errorMessage}</div>
              </div>
            </div>
          )}

          {/* Submit CTA */}
          <button
            type="submit"
            id="submit-verify-code-btn"
            disabled={isLoading || !code.trim()}
            className="w-full h-13 rounded-2xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Проверка кода...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>Засчитать испытание</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
