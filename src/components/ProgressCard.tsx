import React from 'react';
import { KeyRound, CheckCircle2, ChevronRight, Trophy, MapPin } from 'lucide-react';
import { Participant } from '../types';

interface ProgressCardProps {
  participant: Participant;
  totalGamesCount: number;
  onOpenVerifyModal: () => void;
  onOpenFinalModal?: () => void;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  participant,
  totalGamesCount,
  onOpenVerifyModal,
  onOpenFinalModal
}) => {
  const completedCount = participant.completedGames.length;
  const percentage = totalGamesCount > 0 ? Math.min(100, Math.round((completedCount / totalGamesCount) * 100)) : 0;
  const isFinished = completedCount >= totalGamesCount && totalGamesCount > 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white text-gray-900 p-5 sm:p-6 shadow-sm border border-gray-200">
      {/* Top row */}
      <div className="flex items-center justify-between gap-3 mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wider border border-red-200">
            Маршрутный лист
          </span>
          {participant.name && (
            <span className="text-xs font-semibold text-gray-700 truncate max-w-[160px] sm:max-w-xs">
              {participant.name}
            </span>
          )}
        </div>

        {isFinished ? (
          <button
            onClick={onOpenFinalModal}
            className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
          >
            <Trophy className="w-4 h-4 text-red-600" />
            <span>Сертификат финалиста</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="text-xs font-medium text-gray-500">
            Свободный выбор точек
          </div>
        )}
      </div>

      {/* Main big metric row */}
      <div className="relative z-10 mb-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-baseline gap-2 font-serif">
          Пройдено <span className="text-red-600 font-extrabold">{completedCount}</span> из {totalGamesCount} игр
        </h2>
        <p className="text-gray-600 text-xs sm:text-sm mt-1">
          {isFinished ? (
            <span className="text-red-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 inline stroke-[2.5]" /> Все точки пройдены! Вы стали мастером народных игр!
            </span>
          ) : completedCount === 0 ? (
            'Выберите любую свободную точку на карте или в списке и подойдите к ведущему.'
          ) : (
            `Отличный темп! Пройдено ${percentage}% испытаний. Выбирайте следующую точку!`
          )}
        </p>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 mb-5">
        <div className="flex justify-between items-center text-xs text-gray-500 mb-1.5 font-medium">
          <span>Прогресс фестиваля</span>
          <span className="text-red-600 font-bold">{percentage}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200">
          <div
            className="h-full rounded-full bg-red-600 transition-all duration-700 ease-out"
            style={{ width: `${Math.max(4, percentage)}%` }}
          />
        </div>
      </div>

      {/* Action CTA Button */}
      <div className="relative z-10 pt-1 flex flex-col sm:flex-row gap-2.5">
        <button
          onClick={onOpenVerifyModal}
          id="hero-verify-code-btn"
          className="flex-1 py-3 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-sm transition-all transform active:scale-[0.99] cursor-pointer"
        >
          <KeyRound className="w-5 h-5 text-white stroke-[2.5]" />
          <span>Ввести проверочный код</span>
        </button>

        {isFinished && (
          <button
            onClick={onOpenFinalModal}
            className="py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 border border-gray-300 transition-colors"
          >
            <Trophy className="w-4 h-4 text-red-600" />
            <span>Сертификат</span>
          </button>
        )}
      </div>
    </div>
  );
};
