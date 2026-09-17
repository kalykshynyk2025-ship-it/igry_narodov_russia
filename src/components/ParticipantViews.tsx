import React from 'react';
import { Game, Participant } from '../types';
import { CheckCircle2, Trophy, Award, ArrowRight, Shield, LogOut, MapPin, User, Phone, Mail, Gift, Coins, Sparkles } from 'lucide-react';

interface ProgressViewProps {
  participant: Participant;
  games: Game[];
  onOpenVerifyModal: () => void;
  onSelectGame: (game: Game) => void;
  onOpenFinalModal?: () => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  participant,
  games,
  onOpenVerifyModal,
  onSelectGame,
  onOpenFinalModal
}) => {
  const completedCount = participant.completedGames.length;
  const totalCount = games.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isFinishedAll = completedCount >= totalCount && totalCount > 0;

  const completedGamesList = games.filter(g => participant.completedGames.includes(g.id));
  const remainingGamesList = games.filter(g => !participant.completedGames.includes(g.id) && g.status === 'active');

  // Calculate total score and find common currency
  const totalScore = completedGamesList.reduce((acc, g) => acc + (g.rewardPoints ?? 1), 0);
  const sampleGameWithCurrency = games.find(g => g.rewardCurrency?.trim());
  const currencyUnit = sampleGameWithCurrency?.rewardCurrency?.trim() || 'баллов';

  // Games that offer a physical prize / merch
  const physicalRewardGames = completedGamesList.filter(
    g => (g.showPhysicalReward ?? Boolean(g.physicalReward)) && g.physicalReward
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header card */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold text-gray-900 font-serif">Статистика маршрута</h2>
          </div>
          <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
            {percentage}% пройдено
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-center">
            <div className="text-xs text-gray-500 font-medium">Пройдено точек</div>
            <div className="text-2xl font-bold text-red-600 mt-0.5">{completedCount}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-center">
            <div className="text-xs text-amber-800 font-medium">Набрано очков</div>
            <div className="text-2xl font-bold text-amber-900 mt-0.5">{totalScore}</div>
            <div className="text-[10px] text-amber-700 font-medium truncate">{currencyUnit}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-center">
            <div className="text-xs text-gray-500 font-medium">Осталось точек</div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{remainingGamesList.length}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-center">
            <div className="text-xs text-gray-500 font-medium">Всего точек</div>
            <div className="text-2xl font-bold text-gray-800 mt-0.5">{totalCount}</div>
          </div>
        </div>

        {/* Big Certificate CTA if finished */}
        {isFinishedAll ? (
          <button
            onClick={onOpenFinalModal}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Award className="w-5 h-5" />
            <span>Посмотреть электронный сертификат финалиста</span>
          </button>
        ) : (
          <button
            onClick={onOpenVerifyModal}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <span>Ввести код следующей пройденной игры</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Physical Rewards & Merch Section */}
      {physicalRewardGames.length > 0 && (
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-gray-900 font-serif">
                Призы и сувениры за прохождение ({physicalRewardGames.length})
              </h3>
            </div>
          </div>
          <div className="space-y-2.5">
            {physicalRewardGames.map((g) => {
              const claim = participant.claimedRewards?.[g.id];
              const isClaimed = Boolean(claim);

              return (
                <div
                  key={`reward-${g.id}`}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isClaimed
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-gradient-to-r from-amber-50 to-orange-50/50 border-amber-300/80 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isClaimed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-white shadow-xs'
                      }`}
                    >
                      {isClaimed ? <CheckCircle2 className="w-4 h-4" /> : <Gift className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                        <span>{claim?.rewardName || g.physicalReward}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            isClaimed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-200/80 text-amber-900'
                          }`}
                        >
                          {isClaimed ? 'Выдано ✓' : 'Готов к выдаче'}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-600 mt-0.5">
                        Станция #{g.number}: {g.name}
                        {isClaimed && claim && (
                          <span className="text-emerald-700 font-medium ml-1">
                            • Отметка судьи: {claim.claimedAt} ({claim.claimedBy || 'Организатор'})
                          </span>
                        )}
                        {!isClaimed && (
                          <span className="text-amber-800 font-medium ml-1 block sm:inline">
                            • Покажите этот экран судье или на инфостойке для получения
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-center">
                    {isClaimed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-white px-3 py-1 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Получено
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-white px-3 py-1 rounded-xl border border-amber-300 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        К получению
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Games List */}
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2 font-serif">
          <CheckCircle2 className="w-4 h-4 text-red-600" />
          <span>Пройденные игры ({completedGamesList.length})</span>
        </h3>

        {completedGamesList.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border border-dashed border-gray-300 text-center text-gray-500 text-sm">
            Вы пока не подтвердили ни одной пройденной точки. Выберите свободную игру на карте или в списке!
          </div>
        ) : (
          <div className="space-y-2">
            {completedGamesList.map((g, index) => (
              <div
                key={g.id}
                onClick={() => onSelectGame(g)}
                className="p-3.5 rounded-2xl bg-white border border-gray-200 flex items-center justify-between cursor-pointer hover:border-red-400 transition-colors shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{g.name}</div>
                    <div className="text-xs text-gray-500">Народ: {g.people}</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                  Пройдена ✓
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Remaining Games List */}
      {remainingGamesList.length > 0 && (
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2 font-serif">
            <span>Доступные свободные игры ({remainingGamesList.length})</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {remainingGamesList.map((g) => (
              <div
                key={g.id}
                onClick={() => onSelectGame(g)}
                className="p-3.5 rounded-2xl bg-white border border-gray-200 hover:border-red-500 flex items-center justify-between cursor-pointer transition-colors shadow-xs"
              >
                <div className="truncate pr-2">
                  <div className="text-xs font-bold text-gray-900 truncate">
                    #{g.number} {g.name}
                  </div>
                  <div className="text-[11px] text-gray-500">{g.people}</div>
                </div>
                <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md shrink-0 border border-red-200">
                  Перейти →
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface ProfileViewProps {
  participant: Participant;
  onLogout: () => void;
  onOpenAdmin: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  participant,
  onLogout,
  onOpenAdmin
}) => {
  return (
    <div className="max-w-md mx-auto space-y-5 pb-8">
      {/* Profile Card */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-200 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold text-2xl mb-3 shadow-sm font-serif">
          {participant.name.charAt(0)}
        </div>
        <h2 className="text-xl font-bold text-gray-900 font-serif">
          {participant.name}
        </h2>
        {participant.email && (
          <p className="text-xs text-gray-600 mt-1 flex items-center justify-center gap-1">
            <Mail className="w-3.5 h-3.5 text-gray-400" />
            <span>{participant.email}</span>
          </p>
        )}
        {participant.phone && (
          <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <span>{participant.phone}</span>
          </p>
        )}
        {participant.cityOrTeam && (
          <p className="text-xs text-red-600 font-semibold mt-0.5 flex items-center justify-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            <span>{participant.cityOrTeam}</span>
          </p>
        )}
        <div className="mt-3 inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-mono">
          ID участника: {participant.id}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t border-gray-100 text-center">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
            <div className="text-[11px] text-gray-500">Пройдено</div>
            <div className="text-xl font-bold text-red-600 mt-0.5">
              {participant.completedGames.length}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200">
            <div className="text-[11px] text-amber-800">Призов выдано</div>
            <div className="text-xl font-bold text-amber-900 mt-0.5">
              {Object.keys(participant.claimedRewards || {}).length}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
            <div className="text-[11px] text-gray-500">Последняя</div>
            <div className="text-xs font-bold text-gray-800 mt-1.5 truncate" title={participant.lastCompletedGame || '—'}>
              {participant.lastCompletedGame || '—'}
            </div>
          </div>
        </div>

        {/* Data safety guarantee */}
        <div className="mt-4 p-3 rounded-2xl bg-red-50/70 border border-red-100 text-left text-xs text-gray-700 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-gray-900 block">Данные в безопасности:</span>
            Все ваши отметки и баллы сохранены на сервере. При входе с любого устройства используйте ваше имя ({participant.name}) и {participant.email ? 'почту ' + participant.email : (participant.phone ? 'телефон ' + participant.phone : 'ID')}.
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-2.5">
        <button
          onClick={onLogout}
          id="profile-switch-user-btn"
          className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Войти под другим профилем / Сменить участника</span>
        </button>

        <button
          onClick={onOpenAdmin}
          className="w-full h-12 rounded-xl bg-gray-900 hover:bg-black text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Shield className="w-4 h-4 text-red-500" />
          <span>Вход в панель администратора</span>
        </button>
      </div>
    </div>
  );
};
