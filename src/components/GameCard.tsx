import React from 'react';
import { CheckCircle2, ChevronRight, MapPin, User, CircleDashed } from 'lucide-react';
import { Game, DEFAULT_GAME_CARD_IMAGE, cleanProhibitedPhrases } from '../types';

interface GameCardProps {
  game: Game;
  isCompleted: boolean;
  onSelect: (game: Game) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, isCompleted, onSelect }) => {
  const isInactive = game.status === 'inactive';

  return (
    <div
      onClick={() => onSelect(game)}
      id={`game-card-${game.id}`}
      className={`group relative flex flex-col justify-between rounded-2xl overflow-hidden transition-all duration-200 border cursor-pointer select-none ${
        isCompleted
          ? 'bg-white border-red-200 shadow-xs hover:border-red-400'
          : isInactive
          ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
          : 'bg-white border-gray-200 shadow-xs hover:shadow-md hover:border-red-500 hover:-translate-y-0.5'
      }`}
    >
      {/* Top Banner / Photo */}
      <div className="relative h-36 w-full bg-gray-100 overflow-hidden border-b border-gray-100">
        <img
          src={game.imageUrl || DEFAULT_GAME_CARD_IMAGE}
          alt={game.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_GAME_CARD_IMAGE;
          }}
        />

        {/* Gradient overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 via-gray-950/20 to-transparent" />

        {/* Badge: Number, Culture and Mythological creature */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap max-w-[70%]">
          <span className="px-2 py-0.5 rounded-md bg-white/95 text-gray-900 font-mono font-bold text-xs shadow-xs">
            #{game.number < 10 ? `0${game.number}` : game.number}
          </span>
          {game.people && (
            <span className="px-2 py-0.5 rounded-md bg-gray-900/85 text-white text-[11px] font-medium backdrop-blur-xs">
              {game.people}
            </span>
          )}
        </div>

        {/* Status Badge in Photo */}
        <div className="absolute top-3 right-3">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-600 text-white shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Пройдена ✓</span>
            </span>
          ) : isInactive ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-800/80 text-gray-300 backdrop-blur-xs">
              <CircleDashed className="w-3.5 h-3.5" />
              <span>Недоступна</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white text-red-600 border border-red-200 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <span>Свободна</span>
            </span>
          )}
        </div>

        {/* Title overlay at the bottom of the photo */}
        <div className="absolute bottom-2.5 left-3 right-3">
          <h3 className="text-base font-bold text-white tracking-tight font-serif drop-shadow-sm truncate">
            {game.name}
          </h3>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col justify-between flex-1">
        <div>
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-2.5">
            {game.description || game.rules}
          </p>

          {game.mythologyDescription && (
            <div className="mb-2.5 px-2.5 py-1.5 rounded-lg bg-amber-50/80 border border-amber-200/70 text-[11px] text-amber-950 flex items-center gap-1.5 truncate">
              <span className="text-amber-700 font-bold shrink-0">🎨 Миф:</span>
              <span className="truncate italic font-medium">{cleanProhibitedPhrases(game.mythologyDescription)}</span>
            </div>
          )}

          {/* Host of the station */}
          {game.hostName && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-2">
              <User className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="text-gray-500">Ведущий:</span>
              <span className="text-gray-900 font-semibold truncate">{game.hostName}</span>
            </div>
          )}
        </div>

        {/* Footer meta row and CTA button */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1.5 truncate max-w-[60%]">
            {game.location && (
              <span className="truncate flex items-center gap-1" title={game.location}>
                <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="truncate">{game.location.split(',')[0]}</span>
              </span>
            )}
          </div>

          <button
            type="button"
            className={`h-11 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all ${
              isCompleted
                ? 'text-red-700 hover:bg-red-50'
                : 'text-white bg-red-600 hover:bg-red-700 shadow-xs'
            }`}
          >
            <span>{isCompleted ? 'Результат' : 'Подробнее'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
