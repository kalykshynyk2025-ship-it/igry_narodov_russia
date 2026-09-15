import React from 'react';
import { Home, Map, KeyRound, Trophy, User } from 'lucide-react';

export type TabType = 'games' | 'map' | 'progress' | 'profile';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenVerifyModal: () => void;
  completedCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  onOpenVerifyModal,
  completedCount
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 text-gray-500 shadow-lg safe-area-pb">
      <div className="max-w-lg mx-auto px-2 h-16 flex items-center justify-between relative">
        {/* 🏠 Игры */}
        <button
          onClick={() => onChangeTab('games')}
          id="nav-tab-games"
          className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] cursor-pointer ${
            currentTab === 'games' ? 'text-red-600 font-bold' : 'hover:text-gray-900'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[11px]">Игры</span>
        </button>

        {/* 🗺️ Карта */}
        <button
          onClick={() => onChangeTab('map')}
          id="nav-tab-map"
          className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] cursor-pointer ${
            currentTab === 'map' ? 'text-red-600 font-bold' : 'hover:text-gray-900'
          }`}
        >
          <Map className="w-5 h-5" />
          <span className="text-[11px]">Карта</span>
        </button>

        {/* 🎫 Ввести код (Центральная красная кнопка) */}
        <div className="relative -top-4 flex flex-col items-center">
          <button
            onClick={onOpenVerifyModal}
            id="nav-verify-code-fab"
            aria-label="Ввести проверочный код"
            className="w-13 h-13 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md border-4 border-white active:scale-95 transition-all cursor-pointer"
          >
            <KeyRound className="w-5 h-5 stroke-[2.5] text-white" />
          </button>
          <span className="text-[10px] font-bold text-red-600 mt-0.5 tracking-tight">
            Код
          </span>
        </div>

        {/* 🏆 Прогресс */}
        <button
          onClick={() => onChangeTab('progress')}
          id="nav-tab-progress"
          className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] relative cursor-pointer ${
            currentTab === 'progress' ? 'text-red-600 font-bold' : 'hover:text-gray-900'
          }`}
        >
          <div className="relative">
            <Trophy className="w-5 h-5" />
            {completedCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-red-600 text-white rounded-full font-bold text-[9px] min-w-[14px] text-center">
                {completedCount}
              </span>
            )}
          </div>
          <span className="text-[11px]">Прогресс</span>
        </button>

        {/* 👤 Профиль */}
        <button
          onClick={() => onChangeTab('profile')}
          id="nav-tab-profile"
          className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] cursor-pointer ${
            currentTab === 'profile' ? 'text-red-600 font-bold' : 'hover:text-gray-900'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[11px]">Профиль</span>
        </button>
      </div>
    </nav>
  );
};
