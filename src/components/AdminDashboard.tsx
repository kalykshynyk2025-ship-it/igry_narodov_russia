import React, { useState, useEffect } from 'react';
import {
  Users,
  Gamepad2,
  KeyRound,
  BarChart3,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Copy,
  Check,
  Filter,
  Ticket,
  ChevronRight,
  TrendingUp,
  MapPin,
  Map as MapIcon,
  LogOut,
  Image as ImageIcon,
  User,
  AlertCircle,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Loader2,
  RotateCcw,
  Download,
  FileSpreadsheet,
  FileCode,
  QrCode,
  Wifi,
  Printer,
  Server
} from 'lucide-react';
import { Game, Participant, Code, GameCompletion, AdminStats, MapCircleSettings, DEFAULT_MAP_CIRCLE_SETTINGS, DEFAULT_GAME_CARD_IMAGE, cleanProhibitedPhrases } from '../types';
import { api } from '../services/api';
import { SchematicFestivalMap } from './SchematicFestivalMap';
import { ImageUploader } from './ImageUploader';
import { MapBackgroundUploader } from './MapBackgroundUploader';
import { ResetVenueModal } from './ResetVenueModal';
import { OfflineAccessModal } from './OfflineAccessModal';
import { OfflineManagerTab } from './OfflineManagerTab';
import { downloadParticipantsJSON, downloadParticipantsCSV } from '../utils/exportParticipants';

interface AdminDashboardProps {
  games: Game[];
  participants: Participant[];
  onRefreshData: () => Promise<void>;
  onCloseAdmin: () => void;
  mapBackgroundUrl?: string;
  onUpdateMapBackground?: (url: string) => void;
  circleSettings?: MapCircleSettings;
  onUpdateCircleSettings?: (settings: Partial<MapCircleSettings>) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  games,
  participants,
  onRefreshData,
  onCloseAdmin,
  mapBackgroundUrl = '',
  onUpdateMapBackground,
  circleSettings,
  onUpdateCircleSettings
}) => {
  const [activeTab, setActiveTab] = useState<'games' | 'map' | 'codes' | 'participants' | 'stats' | 'offline'>('games');
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [codes, setCodes] = useState<Code[]>([]);
  const [selectedParticipantHistory, setSelectedParticipantHistory] = useState<{
    participant: Participant;
    history: GameCompletion[];
  } | null>(null);

  // Filter & Search states
  const [searchParticipant, setSearchParticipant] = useState('');
  const [searchGame, setSearchGame] = useState('');
  const [selectedGameForCodes, setSelectedGameForCodes] = useState<string>('');
  const [pointFilterSearch, setPointFilterSearch] = useState<string>('');
  const [codeSearchText, setCodeSearchText] = useState<string>('');
  const [codesCount, setCodesCount] = useState<number>(50);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [codeFilterStatus, setCodeFilterStatus] = useState<'all' | 'active' | 'used'>('all');
  const [isEnsuring500, setIsEnsuring500] = useState(false);
  const [ensure500Feedback, setEnsure500Feedback] = useState<string | null>(null);

  // Add / Edit game modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameFormData, setGameFormData] = useState<Partial<Game>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [selectedGameForMap, setSelectedGameForMap] = useState<Game | null>(null);

  // Map background state
  const [currentMapBg, setCurrentMapBg] = useState<string>(mapBackgroundUrl || '');

  // Festival Circle / Main Square settings state
  const [currentCircle, setCurrentCircle] = useState<MapCircleSettings>(
    circleSettings || DEFAULT_MAP_CIRCLE_SETTINGS
  );
  const [isCircleSelectedForMap, setIsCircleSelectedForMap] = useState<boolean>(false);
  const [isCircleSaveSuccess, setIsCircleSaveSuccess] = useState<boolean>(false);
  const [showSectorEditor, setShowSectorEditor] = useState<boolean>(false);

  useEffect(() => {
    if (circleSettings) {
      setCurrentCircle(circleSettings);
    } else {
      api.getMapCircleSettings().then(settings => {
        if (settings) setCurrentCircle(settings);
      });
    }
  }, [circleSettings]);

  const handleUpdateCircle = async (patch: Partial<MapCircleSettings>) => {
    const updated = { ...currentCircle, ...patch };
    setCurrentCircle(updated);
    if (onUpdateCircleSettings) {
      onUpdateCircleSettings(patch);
    }
    await api.updateMapCircleSettings(patch);
    setIsCircleSaveSuccess(true);
    setTimeout(() => setIsCircleSaveSuccess(false), 2200);
  };

  const handleCircleNudge = (deltaX: number, deltaY: number) => {
    const newX = Math.round(Math.max(5, Math.min(95, currentCircle.x + deltaX)));
    const newY = Math.round(Math.max(5, Math.min(95, currentCircle.y + deltaY)));
    handleUpdateCircle({ x: newX, y: newY });
  };

  const handleResetCircleDefaults = () => {
    handleUpdateCircle({ ...DEFAULT_MAP_CIRCLE_SETTINGS });
  };

  useEffect(() => {
    if (mapBackgroundUrl) {
      setCurrentMapBg(mapBackgroundUrl);
    } else {
      api.getMapBackground().then(url => setCurrentMapBg(url || ''));
    }
  }, [mapBackgroundUrl]);

  const handleMapBackgroundChange = (url: string) => {
    setCurrentMapBg(url);
    if (onUpdateMapBackground) {
      onUpdateMapBackground(url);
    }
  };

  // Reset venue modal state & participant delete
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);
  const [isDeletingParticipant, setIsDeletingParticipant] = useState(false);

  useEffect(() => {
    loadStats();
    loadCodes();
  }, []);

  const loadStats = async () => {
    const data = await api.getAdminStats();
    setStats(data);
  };

  const loadCodes = async (gameId?: string) => {
    const data = await api.getCodes(gameId);
    setCodes(data);
  };

  const handleToggleGameStatus = async (game: Game) => {
    const newStatus = game.status === 'active' ? 'inactive' : 'active';
    await api.updateGame(game.id, { status: newStatus });
    await onRefreshData();
    loadStats();
  };

  const handleGenerateCodes = async () => {
    if (!selectedGameForCodes) return;
    await api.generateCodes(selectedGameForCodes, codesCount);
    await loadCodes(selectedGameForCodes);
    await loadStats();
    await onRefreshData();
  };

  const handleEnsure500Codes = async () => {
    setIsEnsuring500(true);
    setEnsure500Feedback(null);
    try {
      const res = await api.ensure500Codes();
      await loadCodes(selectedGameForCodes);
      await loadStats();
      await onRefreshData();
      setEnsure500Feedback(
        res.added > 0
          ? `Успешно добавлено ${res.added} кодов! Теперь на каждой точке доступно по 500 кодов.`
          : 'На всех точках уже сформировано не менее 500 кодов!'
      );
      setTimeout(() => setEnsure500Feedback(null), 5000);
    } catch {
      setEnsure500Feedback('Ошибка при генерации кодов');
    } finally {
      setIsEnsuring500(false);
    }
  };

  const handleViewParticipantHistory = async (participant: Participant) => {
    const history = await api.getParticipantHistory(participant.id);
    setSelectedParticipantHistory({ participant, history });
  };

  const handleDeleteParticipant = async (p: Participant) => {
    setIsDeletingParticipant(true);
    const res = await api.deleteParticipant(p.id);
    setIsDeletingParticipant(false);
    if (res.success) {
      setParticipantToDelete(null);
      await onRefreshData();
      await loadStats();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenAddGame = () => {
    setEditingGame(null);
    setGameFormData({
      name: '',
      people: 'Русские',
      hostName: '',
      codePrefix: 'GAME',
      description: '',
      rules: '',
      participants: '2-6 человек',
      equipment: '',
      location: 'Сектор фестиваля',
      imageUrl: DEFAULT_GAME_CARD_IMAGE,
      mapX: 50,
      mapY: 50,
      status: 'active'
    });
    setIsFormOpen(true);
  };

  const handleOpenEditGame = (game: Game) => {
    setEditingGame(game);
    setGameFormData({ ...game });
    setIsFormOpen(true);
  };

  const handleDeleteGame = async (gameId: string) => {
    await api.deleteGame(gameId);
    setDeleteConfirmId(null);
    await onRefreshData();
    await loadStats();
    await loadCodes();
  };

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameFormData.name?.trim()) return;

    if (editingGame) {
      await api.updateGame(editingGame.id, gameFormData);
    } else {
      await api.createGame({
        name: gameFormData.name.trim(),
        people: gameFormData.people || 'Русские',
        hostName: gameFormData.hostName || 'Ведущий',
        codePrefix: (gameFormData.codePrefix || 'GAME').toUpperCase().trim(),
        description: gameFormData.description || '',
        rules: gameFormData.rules || '',
        participants: gameFormData.participants || 'Любое количество',
        equipment: gameFormData.equipment || 'Не требуется',
        location: gameFormData.location || 'Поляна фестиваля',
        imageUrl: gameFormData.imageUrl || DEFAULT_GAME_CARD_IMAGE,
        mapX: Number(gameFormData.mapX) || 50,
        mapY: Number(gameFormData.mapY) || 50,
        status: gameFormData.status || 'active'
      });
    }

    setIsFormOpen(false);
    setEditingGame(null);
    setGameFormData({});
    await onRefreshData();
    await loadStats();
  };

  const handleUpdateCoordinates = async (gameId: string, mapX: number, mapY: number) => {
    await api.updateGame(gameId, { mapX, mapY });
    setSelectedGameForMap(prev => (prev && prev.id === gameId ? { ...prev, mapX, mapY } : prev));
    await onRefreshData();
  };

  const handleNudge = (deltaX: number, deltaY: number) => {
    if (!selectedGameForMap) return;
    const curX = typeof selectedGameForMap.mapX === 'number' ? selectedGameForMap.mapX : 50;
    const curY = typeof selectedGameForMap.mapY === 'number' ? selectedGameForMap.mapY : 50;
    const newX = Math.round(Math.max(4, Math.min(96, curX + deltaX)));
    const newY = Math.round(Math.max(4, Math.min(96, curY + deltaY)));
    handleUpdateCoordinates(selectedGameForMap.id, newX, newY);
  };

  const handleArrangeInCircle = async () => {
    const activeGames = games.filter(g => g.status === 'active');
    const count = activeGames.length;
    if (count === 0) return;

    const centerX = typeof currentCircle.x === 'number' ? currentCircle.x : 50;
    const centerY = typeof currentCircle.y === 'number' ? currentCircle.y : 50;

    for (let i = 0; i < count; i++) {
      const g = activeGames[i];
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
      const rx = 36;
      const ry = 30;
      const x = Math.round(Math.max(5, Math.min(95, centerX + rx * Math.cos(angle))));
      const y = Math.round(Math.max(5, Math.min(95, centerY + ry * Math.sin(angle))));
      await api.updateGame(g.id, { mapX: x, mapY: y });
    }
    await onRefreshData();
  };

  const handleLogout = () => {
    api.adminLogout();
    onCloseAdmin();
  };

  const filteredParticipants = participants.filter(p =>
    p.name.toLowerCase().includes(searchParticipant.toLowerCase()) ||
    (p.email && p.email.toLowerCase().includes(searchParticipant.toLowerCase())) ||
    (p.phone && p.phone.includes(searchParticipant)) ||
    (p.cityOrTeam && p.cityOrTeam.toLowerCase().includes(searchParticipant.toLowerCase()))
  );

  const filteredGames = games.filter(g =>
    g.name.toLowerCase().includes(searchGame.toLowerCase()) ||
    (g.hostName && g.hostName.toLowerCase().includes(searchGame.toLowerCase())) ||
    g.people.toLowerCase().includes(searchGame.toLowerCase())
  );

  const filteredCodes = codes.filter(c => {
    if (selectedGameForCodes && c.gameId !== selectedGameForCodes) return false;
    if (codeFilterStatus === 'active') return c.status === 'active';
    if (codeFilterStatus === 'used') return c.status === 'used';
    if (codeSearchText.trim()) {
      const q = codeSearchText.trim().toLowerCase();
      const matchCode = c.code.toLowerCase().includes(q);
      const matchSeq = c.sequenceNumber?.toString().includes(q);
      const gameObj = games.find(g => g.id === c.gameId);
      const matchGame = gameObj?.name.toLowerCase().includes(q) || gameObj?.codePrefix?.toLowerCase().includes(q);
      return matchCode || matchSeq || matchGame;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Admin Header (Red, Gray, White) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600" />
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-gray-900 tracking-tight">
              Панель управления фестивалем
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Управление точками, ведущими, картой поляны и последовательными кодами
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsOfflineModalOpen(true)}
            id="admin-offline-access-btn"
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Офлайн Wi-Fi, IP-адреса и генератор QR-кодов для поляны"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">QR & Офлайн Wi-Fi</span>
            <span className="sm:hidden">Офлайн QR</span>
          </button>
          <button
            onClick={() => setIsResetModalOpen(true)}
            id="admin-reset-venue-btn"
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Сброс фестиваля для новой площадки под паролем kalyk2025shynyk"
          >
            <RotateCcw className="w-3.5 h-3.5 text-red-600" />
            <span className="hidden sm:inline">Сброс для новой площадки</span>
            <span className="sm:hidden">Сброс</span>
          </button>
          <button
            onClick={onCloseAdmin}
            id="admin-to-participant-mode-btn"
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-colors cursor-pointer"
          >
            В режим участника
          </button>
          <button
            onClick={handleLogout}
            id="admin-logout-btn"
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="Выйти из сессии администратора"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Выйти</span>
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('games')}
          id="admin-tab-games"
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'games'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          <span>Точки игр ({games.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          id="admin-tab-map"
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'map'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <MapIcon className="w-4 h-4" />
          <span>Схематическая карта</span>
        </button>

        <button
          onClick={() => setActiveTab('codes')}
          id="admin-tab-codes"
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'codes'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Коды ведущих ({codes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('participants')}
          id="admin-tab-participants"
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'participants'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Участники ({participants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          id="admin-tab-stats"
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'stats'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Сводка</span>
        </button>

        <button
          onClick={() => setActiveTab('offline')}
          id="admin-tab-offline"
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'offline'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Wifi className="w-4 h-4" />
          <span>Офлайн сеть и QR</span>
        </button>
      </div>

      {/* TAB 1: GAMES MANAGEMENT */}
      {activeTab === 'games' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Поиск по названию игры, народу или ведущему..."
                value={searchGame}
                onChange={(e) => setSearchGame(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-red-600 shadow-xs"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Add Game Button */}
            <button
              onClick={handleOpenAddGame}
              id="admin-add-game-btn"
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Добавить новую точку</span>
            </button>
          </div>

          {/* Games Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGames.map((game) => (
              <div
                key={game.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs flex flex-col justify-between"
              >
                {/* Image Header */}
                <div className="relative h-36 bg-gray-100 border-b border-gray-100">
                  <img
                    src={game.imageUrl || DEFAULT_GAME_CARD_IMAGE}
                    alt={game.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_GAME_CARD_IMAGE;
                    }}
                  />

                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-white/95 text-gray-900 font-mono text-xs font-bold shadow-xs">
                      #{game.number}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-gray-900/80 text-white text-[11px] font-medium backdrop-blur-xs">
                      {game.people}
                    </span>
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    <button
                      onClick={() => handleToggleGameStatus(game)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs transition-colors cursor-pointer ${
                        game.status === 'active'
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {game.status === 'active' ? 'Активна' : 'Отключена'}
                    </button>
                  </div>

                  <div className="absolute bottom-2 left-3 right-3">
                    <h3 className="text-base font-bold text-white font-serif drop-shadow truncate">
                      {game.name}
                    </h3>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2.5 text-xs text-gray-700 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Ведущий точки:</span>
                    <span className="font-bold text-gray-900">{game.hostName || 'Не указан'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Текущий код в очереди:</span>
                    <span className="font-mono font-bold text-red-600">
                      {game.nextSequentialCode || `${game.codePrefix}-001`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Координаты карты:</span>
                    <span className="font-mono text-gray-600">
                      X: {game.mapX || 50}%, Y: {game.mapY || 50}%
                    </span>
                  </div>

                  {game.mythologyDescription && (
                    <div className="flex items-center text-[11px] bg-amber-50/70 px-2.5 py-1 rounded-md border border-amber-200/60">
                      <span className="text-amber-900 italic line-clamp-1">🎨 {cleanProhibitedPhrases(game.mythologyDescription)}</span>
                    </div>
                  )}

                  <p className="text-gray-500 line-clamp-2 pt-1 border-t border-gray-100">
                    {game.description || game.rules}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenEditGame(game)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Редактировать / Фото</span>
                  </button>

                  <button
                    onClick={() => setDeleteConfirmId(game.id)}
                    className="p-1.5 rounded-xl bg-white hover:bg-red-50 border border-gray-200 text-red-600 transition-colors cursor-pointer"
                    title="Удалить точку"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE SCHEMATIC MAP POSITIONING */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          {/* Background Scheme Uploader Card */}
          <MapBackgroundUploader
            currentUrl={currentMapBg}
            onUpdate={handleMapBackgroundChange}
          />

          <div className="p-4 bg-white rounded-2xl border border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4 text-red-600" />
                <h3 className="font-bold text-gray-900 text-sm">
                  Интерактивное перемещение точек на карте поляны
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                <strong>Перетаскивание мышкой/пальцем:</strong> просто зажмите любую точку на карте и двигайте в нужное место. Координаты сохраняются автоматически.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsCircleSelectedForMap(prev => !prev);
                  setSelectedGameForMap(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isCircleSelectedForMap
                    ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-300'
                    : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                }`}
                title="Настроить положение и названия Главной площади и Фестивального круга"
              >
                <span>🎯</span>
                <span>Главная площадь / Круг</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isCircleSelectedForMap ? 'bg-red-700 text-white' : 'bg-white text-red-600 border border-red-200'}`}>
                  {currentCircle.x}%, {currentCircle.y}%
                </span>
              </button>

              <button
                type="button"
                onClick={handleArrangeInCircle}
                className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Автоматически распределить активные точки по кругу арены"
              >
                <Sparkles className="w-3.5 h-3.5 text-red-600" />
                <span>Расставить по кругу поляны</span>
              </button>

              {selectedGameForMap && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-xs">
                  <span className="text-gray-600 font-medium">Выбрана:</span>
                  <span className="font-bold text-red-600">
                    #{selectedGameForMap.number} {selectedGameForMap.name}
                  </span>
                  <button
                    onClick={() => setSelectedGameForMap(null)}
                    className="ml-1 text-gray-400 hover:text-gray-600 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Map Component in Editable Mode with Drag & Drop */}
          <SchematicFestivalMap
            games={games}
            completedGameIds={[]}
            onSelectGame={(g) => {
              setSelectedGameForMap(g);
              setIsCircleSelectedForMap(false);
            }}
            isEditable={true}
            selectedGameForPlacement={isCircleSelectedForMap ? null : selectedGameForMap}
            onUpdateCoordinates={handleUpdateCoordinates}
            mapBackgroundUrl={currentMapBg}
            circleSettings={currentCircle}
            onUpdateCircleSettings={handleUpdateCircle}
            isCircleSelected={isCircleSelectedForMap}
            onSelectCircle={() => {
              setIsCircleSelectedForMap(true);
              setSelectedGameForMap(null);
            }}
          />

          {/* Precision Controls & Settings Panel for Festival Circle / Main Square */}
          {isCircleSelectedForMap && (
            <div className="p-5 bg-white rounded-3xl border-2 border-red-200 shadow-md space-y-5 animate-in fade-in zoom-in-98 duration-150">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg border border-red-200 shrink-0">
                    🎯
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                        Редактор: Главная площадь и Фестивальный круг
                      </h4>
                      {isCircleSaveSuccess && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                          <Check className="w-3 h-3" /> Сохранено
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Перетащите круг прямо на карте или используйте стрелки подстройки и параметры ниже
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetCircleDefaults}
                    className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Сбросить все параметры круга к стандартным значениям"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>По умолчанию</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCircleSelectedForMap(false)}
                    className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
                    title="Закрыть панель настройки круга"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Nudge Coordinates Bar */}
              <div className="p-3 bg-red-50/70 rounded-2xl border border-red-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-600 font-medium">Центр на схеме:</span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-red-200 text-red-600 font-mono font-bold">
                    X: {currentCircle.x}%, Y: {currentCircle.y}%
                  </span>
                </div>

                {/* Arrow Nudge Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-gray-500 font-medium mr-1">Подстройка:</span>
                  <button
                    type="button"
                    onClick={() => handleCircleNudge(-2, 0)}
                    className="p-2 rounded-xl bg-white hover:bg-red-100 hover:text-red-700 text-gray-700 border border-gray-200 transition-colors cursor-pointer"
                    title="Сдвинуть круг влево (-2%)"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCircleNudge(0, -2)}
                    className="p-2 rounded-xl bg-white hover:bg-red-100 hover:text-red-700 text-gray-700 border border-gray-200 transition-colors cursor-pointer"
                    title="Сдвинуть круг вверх (-2%)"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCircleNudge(0, 2)}
                    className="p-2 rounded-xl bg-white hover:bg-red-100 hover:text-red-700 text-gray-700 border border-gray-200 transition-colors cursor-pointer"
                    title="Сдвинуть круг вниз (+2%)"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCircleNudge(2, 0)}
                    className="p-2 rounded-xl bg-white hover:bg-red-100 hover:text-red-700 text-gray-700 border border-gray-200 transition-colors cursor-pointer"
                    title="Сдвинуть круг вправо (+2%)"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateCircle({ x: 50, y: 50 })}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-red-100 text-gray-700 hover:text-red-700 border border-gray-200 text-xs font-semibold transition-colors ml-1 cursor-pointer"
                  >
                    По центру (50, 50)
                  </button>
                </div>
              </div>

              {/* Form Settings Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* Field 1: Title */}
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-700 uppercase tracking-wider text-[10px] block">
                    Верхний заголовок площади
                  </label>
                  <input
                    type="text"
                    value={currentCircle.title}
                    onChange={(e) => handleUpdateCircle({ title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium"
                    placeholder="Главная площадь"
                  />
                  <p className="text-[10px] text-gray-400">Отображается красным шрифтом над кругом</p>
                </div>

                {/* Field 2: Subtitle */}
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-700 uppercase tracking-wider text-[10px] block">
                    Название арены / круга
                  </label>
                  <input
                    type="text"
                    value={currentCircle.subtitle}
                    onChange={(e) => handleUpdateCircle({ subtitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium"
                    placeholder="Фестивальный круг"
                  />
                  <p className="text-[10px] text-gray-400">Основной заголовок внутри круга арены</p>
                </div>

                {/* Field 3: Outer Radius */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                      Внешний радиус арены
                    </label>
                    <span className="font-mono font-bold text-red-600 text-xs">
                      {currentCircle.outerRadius} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="180"
                    step="5"
                    value={currentCircle.outerRadius}
                    onChange={(e) => handleUpdateCircle({ outerRadius: Number(e.target.value) })}
                    className="w-full accent-red-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400">Размер пунктирного круга центральной арены</p>
                </div>

                {/* Field 4: Inner Radius */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                      Внутренний радиус круга
                    </label>
                    <span className="font-mono font-bold text-red-600 text-xs">
                      {currentCircle.innerRadius} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="90"
                    step="5"
                    value={currentCircle.innerRadius}
                    onChange={(e) => handleUpdateCircle({ innerRadius: Number(e.target.value) })}
                    className="w-full accent-red-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400">Размер внутреннего круга подложки</p>
                </div>

                {/* Field 5: Coordinates X / Y manual inputs */}
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-700 uppercase tracking-wider text-[10px] block">
                    Точные координаты (%)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200">
                      <span className="font-mono text-gray-400 text-xs">X:</span>
                      <input
                        type="number"
                        min="5"
                        max="95"
                        value={currentCircle.x}
                        onChange={(e) => handleUpdateCircle({ x: Math.max(5, Math.min(95, Number(e.target.value))) })}
                        className="w-full font-mono text-xs focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200">
                      <span className="font-mono text-gray-400 text-xs">Y:</span>
                      <input
                        type="number"
                        min="5"
                        max="95"
                        value={currentCircle.y}
                        onChange={(e) => handleUpdateCircle({ y: Math.max(5, Math.min(95, Number(e.target.value))) })}
                        className="w-full font-mono text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400">Проценты от ширины и высоты схемы</p>
                </div>

                {/* Field 6: Visibility Toggles */}
                <div className="space-y-2 flex flex-col justify-center">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={currentCircle.enabled}
                      onChange={(e) => handleUpdateCircle({ enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                    />
                    <span className="font-medium text-gray-800 text-xs">
                      Отображать Главную площадь на карте
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={currentCircle.showSectors}
                      onChange={(e) => handleUpdateCircle({ showSectors: e.target.checked })}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                    />
                    <span className="font-medium text-gray-800 text-xs">
                      Отображать секторы по углам карты
                    </span>
                  </label>
                </div>
              </div>

              {/* Description for Participant View */}
              <div className="space-y-1.5">
                <label className="font-bold text-gray-700 uppercase tracking-wider text-[10px] block">
                  Описание Главной площади для участников (показывается при клике на круг)
                </label>
                <textarea
                  rows={2}
                  value={currentCircle.description || ''}
                  onChange={(e) => handleUpdateCircle({ description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs leading-relaxed"
                  placeholder="Центральная локация фестиваля «Игры народов России». Здесь проходят торжественное открытие, общие хороводы, подведение итогов квеста и награждение участников."
                />
              </div>

              {/* Sector Labels Sub-panel (collapsible) */}
              {currentCircle.showSectors && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 text-xs uppercase tracking-wider">
                      Названия секторов фестивальной площадки (4 угла)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-gray-500 block mb-1">
                        Верхний левый (Сектор 1)
                      </label>
                      <input
                        type="text"
                        value={currentCircle.sector1Label || ''}
                        onChange={(e) => handleUpdateCircle({ sector1Label: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Сектор 1: Интеллект и Шахматы"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-gray-500 block mb-1">
                        Верхний правый (Сектор 2)
                      </label>
                      <input
                        type="text"
                        value={currentCircle.sector2Label || ''}
                        onChange={(e) => handleUpdateCircle({ sector2Label: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Сектор 2: Северные состязания"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-gray-500 block mb-1">
                        Нижний левый (Сектор 3)
                      </label>
                      <input
                        type="text"
                        value={currentCircle.sector3Label || ''}
                        onChange={(e) => handleUpdateCircle({ sector3Label: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Сектор 3: Командные забавы"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-gray-500 block mb-1">
                        Нижний правый (Сектор 4)
                      </label>
                      <input
                        type="text"
                        value={currentCircle.sector4Label || ''}
                        onChange={(e) => handleUpdateCircle({ sector4Label: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Сектор 4: Сила и Меткость"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Precision Controls Toolbar for Selected Game */}
          {selectedGameForMap && (
            <div className="p-4 bg-white rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  #{selectedGameForMap.number}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">
                    {selectedGameForMap.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    Текущие координаты: <span className="font-mono font-bold text-red-600">X: {selectedGameForMap.mapX || 50}%, Y: {selectedGameForMap.mapY || 50}%</span>
                  </div>
                </div>
              </div>

              {/* Nudge arrows and direct coordinate adjustments */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 font-medium mr-1">Точная подстройка:</span>
                <button
                  type="button"
                  onClick={() => handleNudge(-2, 0)}
                  className="p-2 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700 transition-colors"
                  title="Сдвинуть влево (-2%)"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNudge(0, -2)}
                  className="p-2 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700 transition-colors"
                  title="Сдвинуть вверх (-2%)"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNudge(0, 2)}
                  className="p-2 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700 transition-colors"
                  title="Сдвинуть вниз (+2%)"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNudge(2, 0)}
                  className="p-2 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700 transition-colors"
                  title="Сдвинуть вправо (+2%)"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateCoordinates(selectedGameForMap.id, 50, 50)}
                  className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors ml-1"
                >
                  По центру (50, 50)
                </button>
              </div>
            </div>
          )}

          {/* Stations Selector Chips */}
          <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-2">
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
              <span>Быстрый выбор точки для просмотра и настройки:</span>
              <span className="text-gray-400 font-normal">Всего точек: {games.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Central Area Selector Chip */}
              <button
                type="button"
                onClick={() => {
                  setIsCircleSelectedForMap(true);
                  setSelectedGameForMap(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isCircleSelectedForMap
                    ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-400'
                    : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                }`}
              >
                <span>🎯</span>
                <span>{currentCircle.title} ({currentCircle.subtitle})</span>
                <span className="font-mono text-[10px] opacity-80">
                  ({currentCircle.x}%, {currentCircle.y}%)
                </span>
              </button>

              {games.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGameForMap(g)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectedGameForMap?.id === g.id
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                  }`}
                >
                  <span className="font-mono font-bold">#{g.number}</span>
                  <span>{g.name}</span>
                  <span className="text-[10px] opacity-75">
                    ({g.mapX || 50}%, {g.mapY || 50}%)
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SEQUENTIAL CODES ENGINE */}
      {activeTab === 'codes' && (() => {
        const selectedGame = games.find(g => g.id === selectedGameForCodes);
        const sortedGames = [...games].sort((a, b) => a.number - b.number);
        const filteredGamesForChips = sortedGames.filter(g => {
          if (!pointFilterSearch.trim()) return true;
          const q = pointFilterSearch.trim().toLowerCase();
          return (
            g.number.toString().includes(q) ||
            g.name.toLowerCase().includes(q) ||
            (g.hostName && g.hostName.toLowerCase().includes(q)) ||
            (g.codePrefix && g.codePrefix.toLowerCase().includes(q))
          );
        });

        const nextActiveCode = codes.find(c => c.status === 'active');
        const activeCodesCount = codes.filter(c => c.status === 'active').length;
        const usedCodesCount = codes.filter(c => c.status === 'used').length;
        const totalCodesCount = codes.length;

        return (
          <div className="space-y-4">
            {/* Top Generator Controls Card */}
            <div className="p-5 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 font-serif">
                    Генератор одноразовых последовательных кодов для ведущих
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 max-w-xl">
                    Коды выдаются по порядку (например HAZYH-001 ... HAZYH-500). Каждый код гасится сразу после ввода участником.
                    Система подготовлена для фестиваля с 50–500+ участниками на каждой игровой точке.
                  </p>
                </div>

                {/* Sequential Generator Controls */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  <button
                    onClick={handleEnsure500Codes}
                    disabled={isEnsuring500}
                    id="ensure-500-codes-btn"
                    className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shrink-0"
                    title="Гарантирует минимум 500 кодов для каждой станции фестиваля"
                  >
                    {isEnsuring500 ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                        <span>Генерация 500 кодов...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-red-400" />
                        <span>По 500 кодов на все точки</span>
                      </>
                    )}
                  </button>

                  <select
                    value={selectedGameForCodes}
                    onChange={(e) => {
                      setSelectedGameForCodes(e.target.value);
                      loadCodes(e.target.value || undefined);
                    }}
                    id="select-game-dropdown-codes"
                    className="h-10 px-3 rounded-xl bg-gray-50 border border-gray-300 text-xs font-bold text-gray-900 focus:outline-none focus:border-red-600"
                  >
                    <option value="">Все игровые точки ({games.length})</option>
                    {sortedGames.map(g => (
                      <option key={g.id} value={g.id}>
                        #{g.number} {g.name} ({g.codePrefix})
                      </option>
                    ))}
                  </select>

                  <select
                    value={codesCount}
                    onChange={(e) => setCodesCount(Number(e.target.value))}
                    className="h-10 px-2 rounded-xl bg-gray-50 border border-gray-300 text-xs font-bold text-gray-900 focus:outline-none focus:border-red-600"
                  >
                    <option value={20}>+20</option>
                    <option value={50}>+50</option>
                    <option value={100}>+100</option>
                    <option value={500}>+500</option>
                  </select>

                  <button
                    onClick={handleGenerateCodes}
                    disabled={!selectedGameForCodes}
                    id="generate-codes-btn"
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm shrink-0"
                  >
                    +{codesCount} в очередь
                  </button>
                </div>
              </div>

              {/* Notification banner for 500 codes check */}
              {ensure500Feedback && (
                <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                  <span>{ensure500Feedback}</span>
                </div>
              )}
            </div>

            {/* STATION-BY-STATION FILTER BAR FOR HOSTS */}
            <div className="p-4 sm:p-5 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
                    <Filter className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                      Фильтр по точкам фестиваля для ведущих
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Нажмите на нужную точку, чтобы мгновенно увидеть её коды и следующий код к выдаче
                    </p>
                  </div>
                </div>

                {/* Point quick search filter */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Быстрый поиск точки (№, название)..."
                    value={pointFilterSearch}
                    onChange={(e) => setPointFilterSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-red-600"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  {pointFilterSearch && (
                    <button
                      onClick={() => setPointFilterSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Station Chips Grid */}
              <div className="flex flex-wrap items-center gap-2 pt-1 max-h-56 overflow-y-auto p-0.5">
                {/* All Points Chip */}
                <button
                  id="filter-point-chip-all"
                  onClick={() => {
                    setSelectedGameForCodes('');
                    loadCodes('');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    !selectedGameForCodes
                      ? 'bg-gray-900 text-white border-gray-900 shadow-sm ring-2 ring-gray-900/20'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  <span>Все точки</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    !selectedGameForCodes ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {games.length}
                  </span>
                </button>

                {/* Point Chips */}
                {filteredGamesForChips.map((g) => {
                  const isSelected = selectedGameForCodes === g.id;
                  const activeCount = stats?.gameCodesSummary?.[g.id]?.active;

                  return (
                    <button
                      key={g.id}
                      id={`filter-point-chip-${g.number}`}
                      onClick={() => {
                        setSelectedGameForCodes(g.id);
                        loadCodes(g.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-500/30'
                          : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                      }`}>
                        №{g.number}
                      </span>
                      <span className="truncate max-w-[130px] sm:max-w-[160px] text-left">
                        {g.name}
                      </span>
                      {activeCount !== undefined && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : activeCount > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          {activeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DEDICATED HOST STATION QUICK CARD */}
            {selectedGame && (
              <div className="p-5 sm:p-6 bg-gradient-to-r from-red-50 via-white to-red-50/30 rounded-3xl border-2 border-red-300 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-red-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-600 text-white font-bold font-serif text-xl flex items-center justify-center shadow-md shrink-0">
                      №{selectedGame.number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider bg-red-100 px-2 py-0.5 rounded-md">
                          Игровая точка ведущего
                        </span>
                        {selectedGame.codePrefix && (
                          <span className="text-[11px] font-mono font-bold text-gray-600 bg-white border border-red-100 px-1.5 py-0.5 rounded shadow-2xs">
                            Префикс: {selectedGame.codePrefix}
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg sm:text-xl font-bold text-gray-900 font-serif mt-0.5">
                        {selectedGame.name}
                      </h4>
                      <div className="text-xs text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                        <span>👤 Ведущий: <strong>{selectedGame.hostName || 'Не указан'}</strong></span>
                        <span>📍 Локация: <strong>{selectedGame.location || 'Сектор фестиваля'}</strong></span>
                        <span>👥 Народ: <strong>{selectedGame.people}</strong></span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedGameForCodes('');
                      loadCodes('');
                    }}
                    className="text-xs text-gray-500 hover:text-red-600 font-medium flex items-center gap-1 cursor-pointer py-1.5 px-3 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
                  >
                    <span>Сбросить фильтр точки</span>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* NEXT CODE HERO BANNER FOR HOST */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-red-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5 mb-1.5">
                      <Ticket className="w-4 h-4 text-red-600" />
                      <span>Следующий свободный код для выдачи участнику:</span>
                    </div>

                    {nextActiveCode ? (
                      <div className="flex flex-wrap items-baseline gap-3">
                        <div className="font-mono text-3xl sm:text-4xl font-black text-gray-900 tracking-wider">
                          {nextActiveCode.code}
                        </div>
                        {nextActiveCode.sequenceNumber && (
                          <span className="text-xs font-mono font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                            №{nextActiveCode.sequenceNumber} в очереди
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Готов к выдаче
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-red-600 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Все коды этой точки погашены! Сгенерируйте новую серию.</span>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      {nextActiveCode
                        ? 'Назовите этот код участнику после прохождения игры. Код автоматически погасится при активации в профиле.'
                        : 'Нажмите кнопку добавления кодов справа, чтобы продолжить работу станции.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {nextActiveCode && (
                      <button
                        onClick={() => copyToClipboard(nextActiveCode.code)}
                        id="copy-next-code-hero-btn"
                        className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
                      >
                        {copiedCode === nextActiveCode.code ? (
                          <>
                            <Check className="w-4 h-4 text-white" />
                            <span>Код скопирован!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-white" />
                            <span>Скопировать код</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={async () => {
                        await api.generateCodes(selectedGame.id, 50);
                        await loadCodes(selectedGame.id);
                        await loadStats();
                        await onRefreshData();
                      }}
                      className="px-3.5 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Сгенерировать ещё 50 кодов для этой точки"
                    >
                      <Plus className="w-3.5 h-3.5 text-red-600" />
                      <span>+50 кодов</span>
                    </button>
                  </div>
                </div>

                {/* Point Stats Summary */}
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="bg-white p-3 rounded-2xl border border-red-100 shadow-2xs">
                    <div className="text-[11px] text-gray-500 font-medium">Свободно к выдаче</div>
                    <div className="text-lg sm:text-xl font-bold text-emerald-600 font-mono mt-0.5">
                      {activeCodesCount}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-red-100 shadow-2xs">
                    <div className="text-[11px] text-gray-500 font-medium">Уже погашено</div>
                    <div className="text-lg sm:text-xl font-bold text-gray-700 font-mono mt-0.5">
                      {usedCodesCount}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-red-100 shadow-2xs">
                    <div className="text-[11px] text-gray-500 font-medium">Всего кодов точки</div>
                    <div className="text-lg sm:text-xl font-bold text-gray-900 font-mono mt-0.5">
                      {totalCodesCount}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* OVERVIEW GRID FOR ALL POINTS (WHEN NO SINGLE POINT SELECTED) */}
            {!selectedGame && (
              <div className="p-4 sm:p-5 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-red-600" />
                    <span>Экспресс-обзор всех 22 игровых точек фестиваля</span>
                  </h4>
                  <span className="text-xs text-gray-500 font-medium">
                    Нажмите «Выбрать», чтобы открыть очередь точки
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-0.5">
                  {sortedGames.map((g) => {
                    const summary = stats?.gameCodesSummary?.[g.id];
                    const nextCode = summary?.nextActiveCode;
                    const freeCount = summary?.active ?? 0;

                    return (
                      <div
                        key={g.id}
                        className="p-3 rounded-2xl bg-gray-50 hover:bg-gray-100/80 border border-gray-200 transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded bg-gray-200 text-gray-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                              #{g.number}
                            </span>
                            <span className="text-xs font-bold text-gray-900 truncate">
                              {g.name}
                            </span>
                          </div>

                          <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-1">
                            <span>Ведущий: {g.hostName || '—'}</span>
                            <span className="text-emerald-700 font-semibold font-mono">
                              {freeCount} своб.
                            </span>
                          </div>

                          {nextCode && (
                            <div className="mt-1 font-mono text-xs font-bold text-gray-800">
                              След: <span className="text-red-600">{nextCode}</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setSelectedGameForCodes(g.id);
                            loadCodes(g.id);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-red-600 hover:text-white border border-gray-300 hover:border-red-600 text-gray-700 text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
                        >
                          Выбрать
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter Status & Search toolbar for Codes Table */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Filter Status buttons */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-gray-500 font-medium mr-1">Статус кодов:</span>
                  <button
                    onClick={() => setCodeFilterStatus('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                      codeFilterStatus === 'all'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Все ({codes.length})
                  </button>
                  <button
                    onClick={() => setCodeFilterStatus('active')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                      codeFilterStatus === 'active'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Свободные к выдаче ({codes.filter(c => c.status === 'active').length})
                  </button>
                  <button
                    onClick={() => setCodeFilterStatus('used')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                      codeFilterStatus === 'used'
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Погашенные ({codes.filter(c => c.status === 'used').length})
                  </button>
                </div>

                {/* Search codes */}
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Найти код (например: 005, HAZYH)..."
                    value={codeSearchText}
                    onChange={(e) => setCodeSearchText(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-red-600"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  {codeSearchText && (
                    <button
                      onClick={() => setCodeSearchText('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Codes Table */}
              <div className="rounded-2xl border border-gray-100 overflow-hidden mt-3">
                <div className="p-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between text-xs font-semibold text-gray-500">
                  <span className="w-1/3">Код и номер в очереди</span>
                  <span className="w-1/3 text-center sm:text-left">Точка и ведущий</span>
                  <span className="w-1/6 text-center">Статус</span>
                  <span className="w-1/6 text-right">Действие</span>
                </div>

                <div className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
                  {filteredCodes.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-500 space-y-1">
                      <div>Кодов не найдено по заданным фильтрам.</div>
                      {codeSearchText && (
                        <button
                          onClick={() => setCodeSearchText('')}
                          className="text-red-600 hover:underline font-medium"
                        >
                          Сбросить поиск «{codeSearchText}»
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredCodes.map((c) => {
                      const game = games.find(g => g.id === c.gameId);
                      const isUsed = c.status === 'used';

                      return (
                        <div
                          key={c.id}
                          className="p-3 sm:px-4 flex items-center justify-between text-xs hover:bg-gray-50/80 transition-colors"
                        >
                          <div className="w-1/3 flex items-center gap-2 sm:gap-3">
                            <span className="font-mono font-bold text-xs sm:text-sm text-gray-900">
                              {c.code}
                            </span>
                            {c.sequenceNumber && (
                              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-mono">
                                №{c.sequenceNumber}
                              </span>
                            )}
                          </div>

                          <div className="w-1/3 truncate text-gray-600 text-left">
                            {game ? (
                              <span title={`Ведущий: ${game.hostName || '—'}`}>
                                #{game.number} {game.name}
                              </span>
                            ) : (
                              c.gameId
                            )}
                          </div>

                          <div className="w-1/6 text-center">
                            {isUsed ? (
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-semibold">
                                Погашен
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                Готов к выдаче
                              </span>
                            )}
                          </div>

                          <div className="w-1/6 text-right">
                            <button
                              onClick={() => copyToClipboard(c.code)}
                              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 inline-flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer"
                              title="Скопировать проверочный код"
                            >
                              {copiedCode === c.code ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-red-600" />
                                  <span className="text-red-600 font-bold hidden sm:inline">Скопирован</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                                  <span className="hidden sm:inline">Копировать</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 4: REAL PARTICIPANTS ONLY */}
      {activeTab === 'participants' && (
        <div className="space-y-4">
          {/* Toolbar: Search, Counts, and Export/Reset actions */}
          <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Поиск участника по имени, телефону или команде..."
                value={searchParticipant}
                onChange={(e) => setSearchParticipant(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-red-600 focus:bg-white shadow-2xs transition-colors"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => downloadParticipantsJSON(participants, games)}
                id="tab-btn-download-json"
                className="px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Скачать участников в формате JSON"
              >
                <FileCode className="w-3.5 h-3.5 text-amber-600" />
                <span>Скачать JSON</span>
              </button>

              <button
                type="button"
                onClick={() => downloadParticipantsCSV(participants, games)}
                id="tab-btn-download-csv"
                className="px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Скачать участников в формате CSV для Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Скачать CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                id="tab-btn-reset-venue"
                className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Сброс фестиваля для новой площадки под паролем kalyk2025shynyk"
              >
                <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                <span>Сброс для новой площадки</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>Участник ({filteredParticipants.length})</span>
              <span className="hidden sm:inline">Контакты / Команда</span>
              <span>Пройдено точек</span>
              <span>Действия</span>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredParticipants.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  Зарегистрированных участников пока нет. Новые участники появляются здесь сразу после прохождения формы регистрации.
                </div>
              ) : (
                filteredParticipants.map((p) => {
                  const completedCount = p.completedGames.length;
                  const total = games.length;
                  const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

                  return (
                    <div
                      key={p.id}
                      className="p-4 flex items-center justify-between text-xs hover:bg-gray-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{p.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            ID: {p.id}
                          </div>
                        </div>
                      </div>

                      <div className="hidden sm:block text-gray-600">
                        {p.email && (
                          <div className="text-gray-900 font-medium text-xs truncate max-w-[170px]">
                            {p.email}
                          </div>
                        )}
                        <div>{p.phone || (p.email ? '' : '—')}</div>
                        {p.cityOrTeam && (
                          <div className="text-red-600 font-medium text-[11px]">
                            {p.cityOrTeam}
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-bold border border-red-200 text-xs">
                          {completedCount} / {total} ({percent}%)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewParticipantHistory(p)}
                          className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          История
                        </button>
                        <button
                          onClick={() => setParticipantToDelete(p)}
                          className="p-1.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Удалить участника"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: STATS */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center shadow-xs">
              <div className="text-xs text-gray-500 font-medium">Реальных участников</div>
              <div className="text-2xl font-bold text-red-600 mt-1">{stats.totalParticipants}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center shadow-xs">
              <div className="text-xs text-gray-500 font-medium">Всего прохождений</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalCompletions}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center shadow-xs">
              <div className="text-xs text-gray-500 font-medium">Кодов выдано</div>
              <div className="text-2xl font-bold text-red-600 mt-1">{stats.totalCodesUsed}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center shadow-xs">
              <div className="text-xs text-gray-500 font-medium">В среднем игр / чел</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stats.avgGamesPerParticipant}</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs">
            <h3 className="font-bold text-gray-900 text-sm mb-3">
              Самая популярная игровая точка
            </h3>
            {stats.mostPopularGame ? (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-xs">
                <span className="font-bold text-red-700 text-sm">
                  «{stats.mostPopularGame.gameName}»
                </span>
                <span className="font-bold text-gray-700">
                  {stats.mostPopularGame.count} прохождений
                </span>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Пока нет завершённых игр</p>
            )}
          </div>

          {/* New Venue Reset & Backup card */}
          <div className="bg-gradient-to-r from-red-50/70 via-gray-50 to-amber-50/50 p-5 sm:p-6 rounded-3xl border border-red-100 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-red-600" />
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base font-serif">
                    Подготовка фестиваля к новой площадке
                  </h3>
                </div>
                <p className="text-xs text-gray-600 mt-1 max-w-xl leading-relaxed">
                  Переезжаете на другую локацию? Сохраните текущую базу участников в файлы JSON или CSV для отчетов, после чего сбросьте результаты всех игр и коды в исходное состояние под специальным паролем.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => downloadParticipantsJSON(participants, games)}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-amber-600" />
                <span>Скачать базу участников (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => downloadParticipantsCSV(participants, games)}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Скачать базу участников (CSV)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Сбросить данные фестиваля (пароль)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: OFFLINE NETWORK & QR STAND */}
      {activeTab === 'offline' && (
        <OfflineManagerTab games={games} />
      )}

      {/* MODAL: ADD / EDIT GAME POINT */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
            <div className="p-5 bg-gray-900 text-white flex items-center justify-between border-b border-gray-800">
              <h3 className="font-bold text-base font-serif">
                {editingGame ? `Редактирование точки #${editingGame.number}` : 'Добавить новую игровую точку'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGame} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Name & People */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Название игры *</label>
                  <input
                    type="text"
                    required
                    value={gameFormData.name || ''}
                    onChange={(e) => setGameFormData({ ...gameFormData, name: e.target.value })}
                    placeholder="Например: Городки"
                    className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Народность / Культура</label>
                  <input
                    type="text"
                    value={gameFormData.people || ''}
                    onChange={(e) => setGameFormData({ ...gameFormData, people: e.target.value })}
                    placeholder="Например: Русские, Якуты, Буряты"
                    className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              {/* Host & Code Prefix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Ведущий / Судья точки</label>
                  <input
                    type="text"
                    value={gameFormData.hostName || ''}
                    onChange={(e) => setGameFormData({ ...gameFormData, hostName: e.target.value })}
                    placeholder="Например: Алексей Кузнецов"
                    className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Префикс кодов (для очереди)</label>
                  <input
                    type="text"
                    value={gameFormData.codePrefix || ''}
                    onChange={(e) => setGameFormData({ ...gameFormData, codePrefix: e.target.value.toUpperCase() })}
                    placeholder="Например: GOROD"
                    className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-300 font-mono uppercase text-xs text-gray-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              {/* Photo Uploader with Direct File Upload and Yandex Disk Resolver */}
              <ImageUploader
                value={gameFormData.imageUrl || ''}
                onChange={(url) => setGameFormData({ ...gameFormData, imageUrl: url })}
                label="Фотография игровой точки"
              />

              {/* Map Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Координата карты X (5-95%)</label>
                  <input
                    type="number"
                    min="5"
                    max="95"
                    value={gameFormData.mapX ?? 50}
                    onChange={(e) => setGameFormData({ ...gameFormData, mapX: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-300 text-xs text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Координата карты Y (5-95%)</label>
                  <input
                    type="number"
                    min="5"
                    max="95"
                    value={gameFormData.mapY ?? 50}
                    onChange={(e) => setGameFormData({ ...gameFormData, mapY: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-300 text-xs text-gray-900"
                  />
                </div>
              </div>

              {/* Rules & Description */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Краткое описание</label>
                <textarea
                  rows={2}
                  value={gameFormData.description || ''}
                  onChange={(e) => setGameFormData({ ...gameFormData, description: e.target.value })}
                  placeholder="В чём суть игры..."
                  className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Подробные правила</label>
                <textarea
                  rows={3}
                  value={gameFormData.rules || ''}
                  onChange={(e) => setGameFormData({ ...gameFormData, rules: e.target.value })}
                  placeholder="Шаги прохождения, условия победы..."
                  className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-600"
                />
              </div>

              <button
                type="submit"
                id="save-game-point-submit-btn"
                className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm mt-2"
              >
                {editingGame ? 'Сохранить изменения точки' : 'Создать точку игры'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-gray-950/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl border border-gray-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-gray-900">Удалить игровую точку?</h3>
            <p className="text-xs text-gray-600">
              Точка будет удалена из списка и карты фестиваля. Это действие нельзя отменить.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs"
              >
                Отмена
              </button>
              <button
                onClick={() => handleDeleteGame(deleteConfirmId)}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PARTICIPANT HISTORY */}
      {selectedParticipantHistory && (
        <div className="fixed inset-0 z-50 bg-gray-950/75 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-gray-900 font-serif">
                  Маршрут участника: {selectedParticipantHistory.participant.name}
                </h3>
                <p className="text-xs text-gray-500">
                  Пройдено {selectedParticipantHistory.participant.completedGames.length} точек
                </p>
              </div>
              <button
                onClick={() => setSelectedParticipantHistory(null)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {selectedParticipantHistory.history.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500">
                  История прохождений пуста
                </div>
              ) : (
                selectedParticipantHistory.history.map((h, i) => (
                  <div key={h.id} className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs flex justify-between items-center">
                    <div>
                      <div className="font-bold text-gray-900">{i + 1}. {h.gameName}</div>
                      <div className="text-[10px] text-gray-400">Код: {h.codeString}</div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500">
                      {new Date(h.completedAt).toLocaleTimeString('ru-RU')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* Delete Participant Modal */}
      {participantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-gray-200 shadow-xl space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 font-serif">
                Удалить участника?
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Вы собираетесь удалить запись «{participantToDelete.name}» ({participantToDelete.email || participantToDelete.id}). История прохождений этого участника также будет удалена.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setParticipantToDelete(null)}
                disabled={isDeletingParticipant}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => handleDeleteParticipant(participantToDelete)}
                disabled={isDeletingParticipant}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {isDeletingParticipant ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Удалить</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Venue Modal */}
      <ResetVenueModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        participants={participants}
        games={games}
        onResetSuccess={async () => {
          await onRefreshData();
          await loadStats();
          await loadCodes();
        }}
      />

      {/* Offline Access & QR Generator Modal */}
      <OfflineAccessModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
      />
    </div>
  );
};
