import React, { useState, useEffect, useMemo } from 'react';
import { Game, Participant, VerifyCodeResponse, MapCircleSettings, DEFAULT_MAP_CIRCLE_SETTINGS } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { ProgressCard } from './components/ProgressCard';
import { GameCard } from './components/GameCard';
import { GameDetailModal } from './components/GameDetailModal';
import { VerifyCodeModal } from './components/VerifyCodeModal';
import { SuccessModal } from './components/SuccessModal';
import { FinalCertificateModal } from './components/FinalCertificateModal';
import { AuthModal } from './components/AuthModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { BottomNav, TabType } from './components/BottomNav';
import { ProgressView, ProfileView } from './components/ParticipantViews';
import { AdminDashboard } from './components/AdminDashboard';
import { SchematicFestivalMap } from './components/SchematicFestivalMap';
import { RussianOrnamentsBackground } from './components/RussianOrnamentsBackground';
import { Search, Map as MapIcon, Grid, RotateCcw, AlertTriangle, UserCheck, Eye, UserPlus, LogIn } from 'lucide-react';

export default function App() {
  // Core State
  const [games, setGames] = useState<Game[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [mapBackgroundUrl, setMapBackgroundUrl] = useState<string>('');
  const [circleSettings, setCircleSettings] = useState<MapCircleSettings>(DEFAULT_MAP_CIRCLE_SETTINGS);

  // View / Navigation State
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<TabType>('games');

  // Modal States
  const [selectedGameForDetail, setSelectedGameForDetail] = useState<Game | null>(null);
  const [selectedGameForVerify, setSelectedGameForVerify] = useState<Game | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isFinalModalOpen, setIsFinalModalOpen] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<{
    gameName: string;
    completedCount: number;
    totalCount: number;
  } | null>(null);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'free' | 'completed'>('all');
  const [selectedPeopleFilter, setSelectedPeopleFilter] = useState<string>('all');

  // Load initial data
  useEffect(() => {
    loadData();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedGames, fetchedParticipants, mapSettings] = await Promise.all([
        api.getGames(),
        api.getParticipants(),
        api.getMapSettings()
      ]);

      setGames(fetchedGames);
      setParticipants(fetchedParticipants);
      if (mapSettings.mapBackgroundUrl) {
        setMapBackgroundUrl(mapSettings.mapBackgroundUrl);
      }
      if (mapSettings.circleSettings) {
        setCircleSettings(mapSettings.circleSettings);
      }

      // Check current participant from localStorage (both ID and data backup)
      const savedParticipantId = api.getCurrentParticipantId();
      const savedParticipantData = api.getCurrentParticipantData();
      if (savedParticipantId) {
        let found = fetchedParticipants.find(p => p.id === savedParticipantId);
        // If not found in server list (e.g. cold start / server restart), auto re-sync from backup!
        if (!found && savedParticipantData && savedParticipantData.id === savedParticipantId) {
          try {
            found = await api.syncParticipant(savedParticipantData);
            setParticipants(prev => [found!, ...prev.filter(p => p.id !== found!.id)]);
          } catch (e) {
            console.warn('Failed to sync participant with server:', e);
            found = savedParticipantData;
          }
        }
        if (found) {
          setCurrentParticipant(found);
          api.setCurrentParticipant(found);
        } else {
          // If previous ID cannot be resolved, prompt login/registration
          setIsAuthModalOpen(true);
        }
      } else {
        // Prompt visitor to log in or register
        setIsAuthModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (
    name: string,
    email?: string,
    phone?: string,
    cityOrTeam?: string,
    options?: { forceNew?: boolean }
  ): Promise<Participant> => {
    const res = await api.registerParticipant(name, email, phone, cityOrTeam, options);
    const participant = res.participant;
    setCurrentParticipant(participant);
    api.setCurrentParticipant(participant);
    setParticipants(prev => [participant, ...prev.filter(p => p.id !== participant.id)]);
    setIsAuthModalOpen(false);
    return participant;
  };

  const handleSelectParticipant = (p: Participant) => {
    setCurrentParticipant(p);
    api.setCurrentParticipant(p);
    setIsAuthModalOpen(false);
  };

  const handleLogoutParticipant = () => {
    api.setCurrentParticipant(null);
    setCurrentParticipant(null);
    setIsAuthModalOpen(true);
  };

  // Toggle Admin flow with password modal
  const handleToggleAdmin = () => {
    if (isAdmin) {
      setIsAdmin(false);
    } else {
      if (api.isAdminLoggedIn()) {
        setIsAdmin(true);
      } else {
        setIsAdminLoginOpen(true);
      }
    }
  };

  // Verification Handler
  const handleVerifyCode = async (code: string): Promise<VerifyCodeResponse> => {
    if (!currentParticipant) {
      setIsAuthModalOpen(true);
      return {
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Сначала зарегистрируйтесь как участник фестиваля'
      };
    }

    const res = await api.verifyCode(currentParticipant.id, code);

    if (res.success && res.gameId) {
      const updatedGames = currentParticipant.completedGames.includes(res.gameId)
        ? currentParticipant.completedGames
        : [...currentParticipant.completedGames, res.gameId];

      const updatedParticipant: Participant = {
        ...currentParticipant,
        completedGames: updatedGames,
        lastCompletedGame: res.gameName,
        lastCompletedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      };

      setCurrentParticipant(updatedParticipant);
      api.setCurrentParticipant(updatedParticipant);
      setParticipants(prev => prev.map(p => p.id === updatedParticipant.id ? updatedParticipant : p));

      // Refresh games to get updated nextSequentialCode
      const refreshedGames = await api.getGames();
      setGames(refreshedGames);

      // Close game detail modal if open
      setSelectedGameForDetail(null);

      // Trigger Celebration Success Modal
      setSuccessData({
        gameName: res.gameName || 'Игра',
        completedCount: updatedGames.length,
        totalCount: refreshedGames.filter(g => g.status === 'active').length
      });

      // Check if all completed
      const totalActive = refreshedGames.filter(g => g.status === 'active').length;
      if (updatedGames.length >= totalActive && totalActive > 0) {
        setTimeout(() => {
          setIsFinalModalOpen(true);
        }, 1200);
      }
    }

    return res;
  };

  // Open Verify modal with optional game pre-selected
  const handleOpenVerifyWithGame = (game: Game) => {
    setSelectedGameForDetail(null);
    setSelectedGameForVerify(game);
    setIsVerifyModalOpen(true);
  };

  // Filtered games calculation
  const uniquePeoples = useMemo(() => {
    const list = Array.from(new Set(games.map(g => g.people))).filter(Boolean);
    return list.sort();
  }, [games]);

  const filteredGames = useMemo(() => {
    const completedIds = new Set(currentParticipant?.completedGames || []);

    return games.filter(game => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = game.name.toLowerCase().includes(q);
        const matchPeople = game.people.toLowerCase().includes(q);
        const matchHost = (game.hostName || '').toLowerCase().includes(q);
        const matchDesc = (game.description || '').toLowerCase().includes(q);
        const matchRules = (game.rules || '').toLowerCase().includes(q);
        if (!matchName && !matchPeople && !matchHost && !matchDesc && !matchRules) {
          return false;
        }
      }

      // People filter
      if (selectedPeopleFilter !== 'all' && game.people !== selectedPeopleFilter) {
        return false;
      }

      // Status filter
      if (filterStatus === 'completed') {
        return completedIds.has(game.id);
      }
      if (filterStatus === 'free') {
        return !completedIds.has(game.id) && game.status === 'active';
      }

      return true;
    });
  }, [games, currentParticipant, searchQuery, selectedPeopleFilter, filterStatus]);

  const completedCount = currentParticipant?.completedGames.length || 0;
  const totalGamesCount = games.length;

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col selection:bg-red-600 selection:text-white relative">
      {/* Animated Folk Ornaments Background (White, Red, Gray) */}
      <RussianOrnamentsBackground />

      {/* Top Navigation Bar */}
      <Navbar
        currentParticipant={currentParticipant}
        isAdmin={isAdmin}
        onToggleAdmin={handleToggleAdmin}
        onOpenProfile={() => setCurrentTab('profile')}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        isOnline={isOnline}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7 mb-20 relative z-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold text-xl animate-spin">
              ИР
            </div>
            <p className="text-sm font-semibold text-gray-600">
              Загрузка фестиваля народных игр...
            </p>
          </div>
        ) : isAdmin ? (
          /* Admin Dashboard Mode */
          <AdminDashboard
            games={games}
            participants={participants}
            onRefreshData={loadData}
            onCloseAdmin={() => setIsAdmin(false)}
            mapBackgroundUrl={mapBackgroundUrl}
            onUpdateMapBackground={(url) => setMapBackgroundUrl(url)}
            circleSettings={circleSettings}
            onUpdateCircleSettings={(newSettings) => setCircleSettings(prev => ({ ...prev, ...newSettings }))}
          />
        ) : currentTab === 'map' ? (
          /* Tab: Schematic Festival Map */
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold font-serif text-gray-900 tracking-tight">
                  Интерактивная карта фестиваля
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Нажмите на любую метку на карте поляны, чтобы открыть описание игры и правила
                </p>
              </div>
            </div>

            {!currentParticipant && (
              <div className="rounded-2xl bg-gradient-to-r from-red-50 to-white p-3.5 border border-red-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">
                      Режим ознакомления со схемой точек фестиваля
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Нажимайте на любые точки на схеме, чтобы изучить условия игр. Для прохождения — зарегистрируйтесь.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shrink-0 cursor-pointer shadow-2xs"
                >
                  Зарегистрироваться
                </button>
              </div>
            )}

            <SchematicFestivalMap
              games={games}
              completedGameIds={currentParticipant?.completedGames || []}
              onSelectGame={(g) => setSelectedGameForDetail(g)}
              mapBackgroundUrl={mapBackgroundUrl}
              circleSettings={circleSettings}
            />
          </div>
        ) : (currentTab === 'progress' || currentTab === 'profile') && !currentParticipant ? (
          /* Tab: Guest prompt for Progress / Profile */
          <div className="bg-white rounded-3xl p-8 border border-gray-200 text-center max-w-md mx-auto space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
              <UserCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-serif">
                {currentTab === 'progress' ? 'Маршрутный лист и сертификат' : 'Личный профиль участника'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Чтобы отслеживать прогресс прохождения 22 игр, вводить коды станций и получить именной сертификат, войдите или зарегистрируйтесь.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Войти или Зарегистрироваться</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentTab('games')}
                className="w-full h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
              >
                Посмотреть карточки игр
              </button>
            </div>
          </div>
        ) : currentTab === 'progress' && currentParticipant ? (
          /* Tab: Progress Screen */
          <ProgressView
            participant={currentParticipant}
            games={games}
            onOpenVerifyModal={() => {
              setSelectedGameForVerify(null);
              setIsVerifyModalOpen(true);
            }}
            onSelectGame={(g) => setSelectedGameForDetail(g)}
            onOpenFinalModal={() => setIsFinalModalOpen(true)}
          />
        ) : currentTab === 'profile' && currentParticipant ? (
          /* Tab: Profile Screen */
          <ProfileView
            participant={currentParticipant}
            onLogout={handleLogoutParticipant}
            onOpenAdmin={handleToggleAdmin}
          />
        ) : (
          /* Tab: Games Hub (Default Main View) */
          <div className="space-y-6">
            {/* Guest Welcome Banner when not registered */}
            {!currentParticipant && (
              <div className="rounded-3xl bg-gradient-to-r from-red-50 via-amber-50/40 to-white p-4 sm:p-5 border border-red-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-2xs font-bold text-sm">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-gray-900">
                        Режим ознакомления с играми фестиваля
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                        Гость
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-gray-600 mt-0.5">
                      Изучайте правила всех {games.length} игр и схему точек. Чтобы отмечать станции и получать сертификат мастера — зарегистрируйтесь.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  id="guest-banner-open-auth-btn"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Зарегистрироваться / Войти</span>
                </button>
              </div>
            )}

            {/* Prominent Progress Card */}
            {currentParticipant && (
              <ProgressCard
                participant={currentParticipant}
                totalGamesCount={totalGamesCount}
                onOpenVerifyModal={() => {
                  setSelectedGameForVerify(null);
                  setIsVerifyModalOpen(true);
                }}
                onOpenFinalModal={() => setIsFinalModalOpen(true)}
              />
            )}

            {/* Schematic Map Mini Preview */}
            <div className="rounded-3xl bg-white border border-gray-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-red-600" />
                  <span className="font-bold text-sm text-gray-900">
                    Карта фестивальной поляны
                  </span>
                </div>
                <button
                  onClick={() => setCurrentTab('map')}
                  className="text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer"
                >
                  Развернуть карту →
                </button>
              </div>
              <div className="p-2">
                <SchematicFestivalMap
                  games={games}
                  completedGameIds={currentParticipant?.completedGames || []}
                  onSelectGame={(g) => setSelectedGameForDetail(g)}
                  mapBackgroundUrl={mapBackgroundUrl}
                  circleSettings={circleSettings}
                />
              </div>
            </div>

            {/* Filter & Search Bar (White, Red, Gray) */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-gray-200 space-y-3.5">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search input */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    id="search-games-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по названию игры, народу или ведущему..."
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-gray-50 border border-gray-300 text-xs sm:text-sm text-gray-900 focus:border-red-600 focus:bg-white focus:outline-none transition-colors"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>

                {/* People dropdown */}
                <div className="w-full sm:w-56">
                  <select
                    id="filter-people-select"
                    value={selectedPeopleFilter}
                    onChange={(e) => setSelectedPeopleFilter(e.target.value)}
                    aria-label="Фильтр по народу"
                    className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-300 text-xs sm:text-sm text-gray-800 font-medium focus:border-red-600 focus:outline-none"
                  >
                    <option value="all">Все народы ({uniquePeoples.length})</option>
                    {uniquePeoples.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Chips */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFilterStatus('all')}
                    id="filter-status-all"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      filterStatus === 'all'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Все игры ({games.length})
                  </button>

                  <button
                    onClick={() => setFilterStatus('free')}
                    id="filter-status-free"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                      filterStatus === 'free'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Свободные ({games.length - completedCount})</span>
                  </button>

                  <button
                    onClick={() => setFilterStatus('completed')}
                    id="filter-status-completed"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                      filterStatus === 'completed'
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    <span>Пройденные ({completedCount})</span>
                  </button>
                </div>

                <div className="text-xs text-gray-500 font-medium">
                  Найдено точек: <strong>{filteredGames.length}</strong>
                </div>
              </div>
            </div>

            {/* Games Grid */}
            {filteredGames.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-gray-200 shadow-xs space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center font-bold">
                  ?
                </div>
                <h3 className="font-bold text-base text-gray-900 font-serif">
                  Игры не найдены
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
                  Попробуйте изменить поисковый запрос или сбросить фильтры народов
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedPeopleFilter('all');
                    setFilterStatus('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors"
                >
                  Сбросить все фильтры
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    isCompleted={currentParticipant?.completedGames.includes(game.id) || false}
                    onSelect={(g) => setSelectedGameForDetail(g)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation for Mobile and Quick Switching */}
      {!isAdmin && (
        <BottomNav
          currentTab={currentTab}
          onChangeTab={(tab) => setCurrentTab(tab)}
          onOpenVerifyModal={() => {
            setSelectedGameForVerify(null);
            setIsVerifyModalOpen(true);
          }}
          completedCount={completedCount}
        />
      )}

      {/* Modal 1: Game Details & Arrival */}
      <GameDetailModal
        game={selectedGameForDetail}
        isCompleted={
          selectedGameForDetail
            ? (currentParticipant?.completedGames.includes(selectedGameForDetail.id) || false)
            : false
        }
        onClose={() => setSelectedGameForDetail(null)}
        onProceedToCode={handleOpenVerifyWithGame}
      />

      {/* Modal 2: Verify Single-Use Code */}
      <VerifyCodeModal
        isOpen={isVerifyModalOpen}
        preselectedGame={selectedGameForVerify}
        onClose={() => {
          setIsVerifyModalOpen(false);
          setSelectedGameForVerify(null);
        }}
        onSubmitCode={handleVerifyCode}
      />

      {/* Modal 3: Success Celebration */}
      {successData && (
        <SuccessModal
          isOpen={!!successData}
          gameName={successData.gameName}
          completedCount={successData.completedCount}
          totalCount={successData.totalCount}
          onClose={() => setSuccessData(null)}
          onSelectNextGame={() => {
            setSuccessData(null);
            setCurrentTab('games');
          }}
          onOpenProgress={() => {
            setSuccessData(null);
            setCurrentTab('progress');
          }}
        />
      )}

      {/* Modal 4: Final Master Certificate */}
      {currentParticipant && (
        <FinalCertificateModal
          isOpen={isFinalModalOpen}
          participant={currentParticipant}
          totalGames={games.filter(g => g.status === 'active').length}
          onClose={() => setIsFinalModalOpen(false)}
        />
      )}

      {/* Modal 5: Participant Registration & Login */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onSelectParticipant={handleSelectParticipant}
        onRegister={handleRegister}
        onClose={() => setIsAuthModalOpen(false)}
        canClose={true}
        participants={participants}
        totalGamesCount={games.length}
        onAdminSuccess={() => {
          setIsAdmin(true);
          setIsAuthModalOpen(false);
        }}
      />

      {/* Modal 6: Admin Login (admin / kalyk2025) */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={() => setIsAdmin(true)}
      />
    </div>
  );
}
