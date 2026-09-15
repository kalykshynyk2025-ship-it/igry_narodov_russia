import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight, Trophy } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  gameName: string;
  completedCount: number;
  totalCount: number;
  onClose: () => void;
  onSelectNextGame: () => void;
  onOpenProgress: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  gameName,
  completedCount,
  totalCount,
  onClose,
  onSelectNextGame,
  onOpenProgress
}) => {
  const [showPlusOne, setShowPlusOne] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowPlusOne(true);
      const timer = setTimeout(() => setShowPlusOne(false), 2600);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isFinishedAll = completedCount >= totalCount && totalCount > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden text-center p-6 sm:p-7 border border-red-200 animate-in zoom-in-95 duration-300 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating +1 Game badge */}
        {showPlusOne && (
          <div className="absolute top-6 right-6 px-3 py-1 bg-red-600 text-white font-bold text-xs rounded-full shadow-md animate-bounce">
            +1 игра зачтена!
          </div>
        )}

        {/* Celebration icon */}
        <div className="w-18 h-18 mx-auto rounded-full bg-red-50 border-2 border-red-200 text-red-600 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-serif">
          Испытание пройдено!
        </h2>

        {/* Game Name with checkmark */}
        <div className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 font-bold text-base">
          <span>«{gameName}»</span>
          <span className="text-red-600">✓</span>
        </div>

        <p className="text-gray-600 text-xs sm:text-sm mt-2 leading-relaxed">
          Прохождение зафиксировано. Ваш маршрутный лист обновлён.
        </p>

        {/* Progress Display */}
        <div className="my-5 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-left">
          <div className="flex justify-between items-center text-xs font-semibold text-gray-700 mb-2">
            <span>Маршрут фестиваля</span>
            <span className="text-red-600 font-bold text-sm">
              {completedCount} / {totalCount} ({percentage}%)
            </span>
          </div>

          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-red-600 transition-all duration-700 ease-out"
              style={{ width: `${Math.max(5, percentage)}%` }}
            />
          </div>

          {isFinishedAll && (
            <div className="mt-3 p-2.5 rounded-xl bg-white border border-red-200 text-gray-900 text-xs font-bold text-center flex items-center justify-center gap-1.5">
              <Trophy className="w-4 h-4 text-red-600" />
              <span>Поздравляем! Вы прошли абсолютно все испытания фестиваля!</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={() => {
              onClose();
              onSelectNextGame();
            }}
            id="choose-next-game-btn"
            className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <span>Выбрать следующую игру</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenProgress();
            }}
            id="view-my-progress-btn"
            className="w-full h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Мой прогресс и карта</span>
          </button>
        </div>
      </div>
    </div>
  );
};
