import React, { useState } from 'react';
import { X, CheckCircle2, MapPin, Users, PackageCheck, ScrollText, KeyRound, User, AlertCircle, Sparkles, Palette } from 'lucide-react';
import { Game, DEFAULT_GAME_CARD_IMAGE, cleanProhibitedPhrases } from '../types';

interface GameDetailModalProps {
  game: Game | null;
  isCompleted: boolean;
  onClose: () => void;
  onProceedToCode: (game: Game) => void;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  game,
  isCompleted,
  onClose,
  onProceedToCode
}) => {
  const [hasArrived, setHasArrived] = useState(false);

  if (!game) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner with Game Photo */}
        <div className="relative h-44 sm:h-52 w-full bg-gray-900 overflow-hidden border-b border-gray-200">
          <img
            src={game.imageUrl || DEFAULT_GAME_CARD_IMAGE}
            alt={game.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_GAME_CARD_IMAGE;
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            id="close-game-detail-btn"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-900/80 hover:bg-gray-800 text-white flex items-center justify-center transition-colors cursor-pointer border border-gray-700"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top badges */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-white text-gray-900 font-mono text-xs font-bold shadow-xs">
              Точка #{game.number < 10 ? `0${game.number}` : game.number}
            </span>
            <span className="px-3 py-0.5 rounded-full bg-gray-900/80 text-white text-xs font-medium border border-gray-700 backdrop-blur-xs">
              Народ: <strong>{game.people}</strong>
            </span>
            {isCompleted && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" /> Пройдена
              </span>
            )}
          </div>

          {/* Title on Banner */}
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-serif">
              {game.name}
            </h2>
            {game.description && (
              <p className="text-xs sm:text-sm text-gray-300 mt-0.5 line-clamp-2">
                {game.description}
              </p>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-gray-800 text-sm">
          {/* Host & Station Info Banner */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                  Ведущий точки
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {game.hostName || 'Назначенный судья площадки'}
                </div>
              </div>
            </div>

            {/* Station Reward badge (customizable per station) */}
            <div className="bg-white px-3.5 py-2 rounded-xl border border-gray-200 text-left sm:text-right w-full sm:w-auto space-y-0.5 shadow-2xs">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold flex items-center sm:justify-end gap-1">
                <span>Награда за победу</span>
              </div>
              <div className="text-sm font-bold text-red-600 flex items-center sm:justify-end gap-1.5 flex-wrap">
                <span>+{game.rewardPoints ?? 1} {game.rewardCurrency || 'балл в маршрутник'}</span>
              </div>
              {(game.showPhysicalReward ?? Boolean(game.physicalReward)) && game.physicalReward && (
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 mt-1">
                  <span>🎁 Приз:</span>
                  <span>{game.physicalReward}</span>
                </div>
              )}
            </div>
          </div>

          {/* Mythological / Custom Section (Mythology, Rules, Instructions, etc.) */}
          {(game.showMythology ?? Boolean(game.mythologyDescription)) && game.mythologyDescription && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl p-4 border border-amber-200/80 shadow-xs mb-6">
              <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm sm:text-base">
                  <Palette className="w-4 h-4 text-amber-700" />
                  <span>{cleanProhibitedPhrases(game.mythologyTitle) || 'Мифология и сказания'}</span>
                </div>
                {game.mythologyCulture && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-900 text-[11px] font-medium border border-amber-300/60">
                    {cleanProhibitedPhrases(game.mythologyCulture)}
                  </span>
                )}
              </div>

              {game.mythologyCreature && (
                <div className="mb-2 text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                  <span className="text-amber-700 font-medium">
                    {game.mythologyTitle && !game.mythologyTitle.toLowerCase().includes('мифолог') && !game.mythologyTitle.toLowerCase().includes('сказан')
                      ? 'Ориентир / образ:'
                      : 'Персонаж / образ:'}
                  </span>
                  <span>{cleanProhibitedPhrases(game.mythologyCreature)}</span>
                </div>
              )}

              <p className="text-amber-950/90 leading-relaxed text-xs sm:text-sm italic bg-white/70 p-3 rounded-xl border border-amber-200/50">
                «{cleanProhibitedPhrases(game.mythologyDescription)}»
              </p>
            </div>
          )}

          {/* Section: Что нужно делать */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2 text-gray-900 font-bold text-sm sm:text-base">
              <ScrollText className="w-4 h-4 text-red-600" />
              <span>Правила и цель испытания</span>
            </div>
            <p className="text-gray-700 leading-relaxed text-xs sm:text-sm whitespace-pre-line">
              {game.rules || 'Правила объясняются ведущим на площадке.'}
            </p>
          </div>

          {/* Grid: Участники, Реквизит, Место */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
              <div className="flex items-center gap-1.5 text-gray-900 font-semibold text-xs uppercase tracking-wider mb-1">
                <Users className="w-3.5 h-3.5 text-red-600" />
                <span>Участники</span>
              </div>
              <p className="text-gray-700 text-xs sm:text-sm font-medium">
                {game.participants || 'Свободный формат'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
              <div className="flex items-center gap-1.5 text-gray-900 font-semibold text-xs uppercase tracking-wider mb-1">
                <PackageCheck className="w-3.5 h-3.5 text-red-600" />
                <span>Реквизит</span>
              </div>
              <p className="text-gray-700 text-xs sm:text-sm">
                {game.equipment || 'Предоставляется ведущим'}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-gray-900 font-semibold text-xs uppercase tracking-wider mb-0.5">
                Место проведения
              </div>
              <p className="text-gray-700 text-xs sm:text-sm">
                {game.location || 'Поляна фестиваля'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200">
          {isCompleted ? (
            <div className="p-3.5 rounded-2xl bg-white border border-red-200 text-gray-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-red-600" />
                <span className="font-bold text-xs sm:text-sm">
                  Игра уже успешно пройдена вами!
                </span>
              </div>
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-black transition-colors"
              >
                Закрыть
              </button>
            </div>
          ) : !hasArrived ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setHasArrived(true)}
                id="arrived-at-point-btn"
                className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-white stroke-[2.5]" />
                <span>Я пришёл на эту точку</span>
              </button>
              <button
                onClick={() => onProceedToCode(game)}
                className="text-center text-xs text-gray-500 hover:text-gray-900 py-1"
              >
                У меня уже есть код от ведущего →
              </button>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>
                  Пройдите игру под руководством ведущего: <strong>{game.hostName}</strong>. После успешного прохождения ведущий назовёт вам одноразовый код.
                </span>
              </div>
              <button
                onClick={() => onProceedToCode(game)}
                id="proceed-to-enter-code-btn"
                className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <KeyRound className="w-5 h-5 text-white stroke-[2.5]" />
                <span>Ввести код ведущего</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
