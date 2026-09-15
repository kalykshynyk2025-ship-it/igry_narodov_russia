import React, { useState } from 'react';
import {
  RotateCcw,
  Download,
  FileSpreadsheet,
  FileCode,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  Loader2,
  Users,
  Check
} from 'lucide-react';
import { Participant, Game } from '../types';
import { downloadParticipantsJSON, downloadParticipantsCSV } from '../utils/exportParticipants';
import { api } from '../services/api';

interface ResetVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  games: Game[];
  onResetSuccess: () => Promise<void>;
}

export const ResetVenueModal: React.FC<ResetVenueModalProps> = ({
  isOpen,
  onClose,
  participants,
  games,
  onResetSuccess
}) => {
  const [resetMode, setResetMode] = useState<'cleanAll' | 'resetProgressOnly'>('cleanAll');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadedJSON, setDownloadedJSON] = useState(false);
  const [downloadedCSV, setDownloadedCSV] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadJSON = () => {
    downloadParticipantsJSON(participants, games);
    setDownloadedJSON(true);
    setTimeout(() => setDownloadedJSON(false), 3000);
  };

  const handleDownloadCSV = () => {
    downloadParticipantsCSV(participants, games);
    setDownloadedCSV(true);
    setTimeout(() => setDownloadedCSV(false), 3000);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMessage('Пожалуйста, введите пароль подтверждения сброса');
      return;
    }

    if (password.trim() !== 'kalyk2025shynyk') {
      setErrorMessage('Неверный пароль. Для сброса фестиваля требуется специальный пароль площадки.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await api.resetVenue(password.trim(), resetMode);
      if (!res.success) {
        setErrorMessage(res.error || 'Ошибка при выполнении сброса');
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(res.message || 'Данные фестиваля успешно сброшены для новой площадки!');
      await onResetSuccess();

      setTimeout(() => {
        setIsSubmitting(false);
        setSuccessMessage(null);
        setPassword('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Произошла непредвиденная ошибка при сбросе');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-gray-200 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-serif text-gray-900">
                Сброс фестиваля для новой площадки
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Обнуление прогресса всех 22 станций и перезапуск кодов с нулевой позиции
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMessage ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-900 font-serif">
              Сброс успешно выполнен!
            </h3>
            <p className="text-xs text-gray-600 max-w-md mx-auto">
              {successMessage}
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-6">
            {/* Step 1: Download Participants Data */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Шаг 1: Скачайте данные участников
                  </span>
                </div>
                <span className="text-xs font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full">
                  Всего: {participants.length} чел.
                </span>
              </div>
              <p className="text-xs text-amber-800/90 leading-relaxed">
                Перед обновлением сохраните имена, email, контакты и результаты участников в удобном формате:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadJSON}
                  id="btn-download-participants-json"
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-amber-100/50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
                >
                  {downloadedJSON ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">JSON скачан!</span>
                    </>
                  ) : (
                    <>
                      <FileCode className="w-4 h-4 text-amber-700" />
                      <span>Скачать файл JSON</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCSV}
                  id="btn-download-participants-csv"
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-amber-100/50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
                >
                  {downloadedCSV ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">CSV скачан!</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                      <span>Скачать файл CSV (Excel)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 2: Choose Reset Mode */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                Шаг 2: Выберите режим сброса для площадки
              </label>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Mode A: Clean All */}
                <label
                  onClick={() => setResetMode('cleanAll')}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    resetMode === 'cleanAll'
                      ? 'border-red-600 bg-red-50/40 ring-2 ring-red-500/20'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="resetMode"
                    value="cleanAll"
                    checked={resetMode === 'cleanAll'}
                    onChange={() => setResetMode('cleanAll')}
                    className="mt-0.5 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <span>Полный сброс для новой площадки</span>
                      <span className="text-[10px] bg-red-600 text-white font-semibold px-1.5 py-0.2 rounded">
                        Рекомендуется
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1 leading-normal">
                      Очищает базу участников и все отметки прохождений. Все 22 игры и коды возвращаются в исходное состояние (активны с №001). Участники на новой площадке регистрируются заново.
                    </p>
                  </div>
                </label>

                {/* Mode B: Reset Progress Only */}
                <label
                  onClick={() => setResetMode('resetProgressOnly')}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    resetMode === 'resetProgressOnly'
                      ? 'border-red-600 bg-red-50/40 ring-2 ring-red-500/20'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="resetMode"
                    value="resetProgressOnly"
                    checked={resetMode === 'resetProgressOnly'}
                    onChange={() => setResetMode('resetProgressOnly')}
                    className="mt-0.5 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-gray-900">
                      Сбросить только прогресс игр и коды (сохранить список участников)
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1 leading-normal">
                      Сохраняет учетные записи участников, но обнуляет их результат (0 из 22) и сбрасывает все коды станций к №001. Те же люди смогут заново проходить игры с нулевой позиции.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Step 3: Password Confirmation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Шаг 3: Введите пароль подтверждения сброса
                </label>
                <div className="flex items-center gap-1 text-[11px] text-red-600 font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Защищено паролем</span>
                </div>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  id="reset-password-input"
                  placeholder="Введите пароль подтверждения..."
                  className="w-full h-11 px-4 pr-12 rounded-xl bg-gray-50 border border-gray-300 focus:border-red-600 focus:bg-white focus:outline-none text-sm text-gray-900 font-mono transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs transition-colors cursor-pointer text-center"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !password.trim()}
                id="btn-confirm-reset-venue"
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Сброс данных...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Подтвердить и сбросить фестиваль</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
