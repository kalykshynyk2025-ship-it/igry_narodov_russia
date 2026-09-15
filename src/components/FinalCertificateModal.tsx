import React from 'react';
import { X, Trophy, Award, CheckCircle2 } from 'lucide-react';
import { Participant } from '../types';

interface FinalCertificateModalProps {
  isOpen: boolean;
  participant: Participant;
  totalGames: number;
  onClose: () => void;
}

export const FinalCertificateModal: React.FC<FinalCertificateModalProps> = ({
  isOpen,
  participant,
  totalGames,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-red-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Certificate Frame */}
        <div className="p-6 sm:p-8 bg-white border-8 border-double border-red-600/30 relative">
          <button
            onClick={onClose}
            id="close-certificate-btn"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Badge icon */}
          <div className="text-center mb-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg border-2 border-white mb-2">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="text-xs uppercase tracking-widest text-red-600 font-bold">
              Сертификат финалиста
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-serif tracking-tight">
              Поздравляем!
            </h2>
            <p className="text-red-600 font-bold text-base mt-1">
              Все игры фестиваля успешно пройдены!
            </p>
          </div>

          {/* Recipient */}
          <div className="my-5 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center shadow-xs">
            <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">
              Настоящим подтверждается, что
            </span>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 font-serif">
              {participant.name || 'Участник квеста'}
            </div>
            {participant.cityOrTeam && (
              <div className="text-xs text-red-600 font-semibold mt-0.5">
                {participant.cityOrTeam}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              продемонстрировал ловкость, силу и знание традиций народов России
            </div>
          </div>

          {/* Stats Breakdown */}
          <div className="grid grid-cols-3 gap-2.5 my-5 text-center">
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
              <div className="text-xs text-gray-500">Всего игр</div>
              <div className="text-lg font-bold text-gray-900">{totalGames}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200">
              <div className="text-xs text-gray-500">Пройдено</div>
              <div className="text-lg font-bold text-red-600">{totalGames}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
              <div className="text-xs text-gray-500">Прогресс</div>
              <div className="text-lg font-bold text-gray-900">100%</div>
            </div>
          </div>

          {/* Seal / Date */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-xs text-gray-500">
            <div>
              <div className="font-semibold text-gray-800">Фестиваль народных игр России</div>
              <div>Дата: {new Date().toLocaleDateString('ru-RU')}</div>
            </div>
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-red-600 flex flex-col items-center justify-center text-[9px] font-bold text-red-600 text-center uppercase leading-tight rotate-6">
              <span>Печать</span>
              <span>Судья</span>
            </div>
          </div>

          {/* Action button */}
          <div className="mt-6 pt-3">
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors text-center cursor-pointer shadow-xs"
            >
              Отлично, закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
