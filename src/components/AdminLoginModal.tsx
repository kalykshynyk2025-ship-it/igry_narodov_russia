import React, { useState } from 'react';
import { Lock, Shield, ArrowRight, X, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.adminLogin(username.trim(), password);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Неверный логин или пароль');
      }
    } catch {
      setError('Ошибка при проверке авторизации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gray-900 text-white relative border-b border-gray-800 text-center">
          <button
            onClick={onClose}
            id="close-admin-login-btn"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-800 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 mx-auto rounded-xl bg-red-600 flex items-center justify-center shadow-lg text-white mb-3 border border-red-400">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Вход для администратора
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Управление игровыми точками, ведущими и кодами фестиваля
          </p>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              Логин
            </label>
            <input
              type="text"
              required
              id="admin-login-username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Логин администратора"
              className="w-full h-11 px-3.5 rounded-xl bg-gray-50 border border-gray-300 focus:border-red-600 focus:bg-white focus:outline-none text-sm text-gray-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              Пароль
            </label>
            <div className="relative">
              <input
                type="password"
                required
                autoFocus
                id="admin-login-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Введите пароль"
                className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-gray-50 border border-gray-300 focus:border-red-600 focus:bg-white focus:outline-none text-sm text-gray-900 transition-colors"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            id="admin-submit-login-btn"
            disabled={isLoading || !username || !password}
            className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer mt-2"
          >
            <span>{isLoading ? 'Проверка...' : 'Войти в панель'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-gray-500 text-center pt-2">
            Доступ только для организаторов и судейской коллегии фестиваля
          </p>
        </form>
      </div>
    </div>
  );
};
