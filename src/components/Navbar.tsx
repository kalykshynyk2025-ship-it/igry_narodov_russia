import React from 'react';
import { Shield, User, Wifi, WifiOff, LogOut, LogIn } from 'lucide-react';
import { Participant } from '../types';

interface NavbarProps {
  currentParticipant: Participant | null;
  isAdmin: boolean;
  onToggleAdmin: () => void;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  isOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentParticipant,
  isAdmin,
  onToggleAdmin,
  onOpenProfile,
  onOpenAuth,
  isOnline
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200 text-gray-900 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & Logo */}
        <div
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => isAdmin && onToggleAdmin()}
        >
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-sm text-white font-bold text-lg tracking-wider border border-red-700">
            ИР
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base sm:text-lg tracking-tight font-serif text-gray-900">
                Игры народов России
              </span>
              <span className="hidden xs:inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-red-50 text-red-700 border border-red-200">
                Фестиваль
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-sans truncate max-w-[200px] sm:max-w-xs">
              Интерактивный квест традиционных игр
            </p>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Network status indicator */}
          <div
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isOnline
                ? 'bg-gray-50 text-gray-700 border-gray-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
            title={isOnline ? 'Соединение стабильно' : 'Автономный режим'}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-gray-600" /> : <WifiOff className="w-3.5 h-3.5 text-red-600" />}
            <span>{isOnline ? 'В сети' : 'Офлайн'}</span>
          </div>

          {/* Admin toggle button */}
          <button
            onClick={onToggleAdmin}
            id="admin-mode-toggle-btn"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isAdmin
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAdmin ? 'Выйти из админки' : 'Админ-панель'}</span>
            <span className="sm:hidden">{isAdmin ? 'Выход' : 'Админ'}</span>
          </button>

          {/* Participant Profile / Login Button */}
          {!isAdmin && currentParticipant ? (
            <button
              onClick={onOpenProfile}
              id="participant-profile-btn"
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-left transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                {currentParticipant.name.charAt(0)}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-bold text-gray-900 truncate max-w-[120px]">
                  {currentParticipant.name}
                </div>
                <div className="text-[10px] text-red-600 font-semibold">
                  {currentParticipant.completedGames.length} пройденных
                </div>
              </div>
            </button>
          ) : !isAdmin && (
            <button
              onClick={onOpenAuth}
              id="participant-login-btn"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-xs transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Войти</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
