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
  Server,
  Gift,
  Coins,
  Trophy,
  Award,
  ShoppingBag,
  Store,
  Receipt,
  MinusCircle
} from 'lucide-react';
import { Game, Participant, PointRedemptionItem, getParticipantBalance, Code, GameCompletion, AdminStats, MapCircleSettings, DEFAULT_MAP_CIRCLE_SETTINGS, DEFAULT_GAME_CARD_IMAGE, cleanProhibitedPhrases } from '../types';
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
  const [activeTab, setActiveTab] = useState<'games' | 'map' | 'codes' | 'participants' | 'shop' | 'stats' | 'offline'>('games');
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [codes, setCodes] = useState<Code[]>([]);
  const [selectedParticipantHistory, setSelectedParticipantHistory] = useState<{
    participant: Participant;
    history: GameCompletion[];
  } | null>(null);

  // Shop & Point Redemption state
  const [isRedeemingPoints, setIsRedeemingPoints] = useState(false);
  const [pointRedeemAmount, setPointRedeemAmount] = useState<number | ''>(1);
  const [pointRedeemNote, setPointRedeemNote] = useState('Покупка в магазине');
  const [shopSearch, setShopSearch] = useState('');
  const [selectedShopParticipantId, setSelectedShopParticipantId] = useState<string | null>(null);

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

  const [isClaimingReward, setIsClaimingReward] = useState(false);

  const handleClaimReward = async (participantId: string, gameId: string, rewardName?: string) => {
    setIsClaimingReward(true);
    const res = await api.claimReward(participantId, gameId, rewardName, 'Администратор');
    setIsClaimingReward(false);
    if (res.success && res.participant) {
      if (selectedParticipantHistory && selectedParticipantHistory.participant.id === participantId) {
        setSelectedParticipantHistory({
          ...selectedParticipantHistory,
          participant: res.participant
        });
      }
      await onRefreshData();
    }
  };

  const handleUnclaimReward = async (participantId: string, gameId: string) => {
    setIsClaimingReward(true);
    const res = await api.unclaimReward(participantId, gameId);
    setIsClaimingReward(false);
    if (res.success && res.participant) {
      if (selectedParticipantHistory && selectedParticipantHistory.participant.id === participantId) {
        setSelectedParticipantHistory({
          ...selectedParticipantHistory,
          participant: res.participant
        });
      }
      await onRefreshData();
    }
  };

  const handleRedeemPoints = async (participantId: string, amount: number, note: string) => {
    if (isNaN(amount) || amount <= 0) return;
    setIsRedeemingPoints(true);
    const res = await api.redeemPoints(participantId, amount, note, 'Администратор');
    setIsRedeemingPoints(false);
    if (res.success && res.participant) {
      if (selectedParticipantHistory && selectedParticipantHistory.participant.id === participantId) {
        setSelectedParticipantHistory({
          ...selectedParticipantHistory,
          participant: res.participant
        });
      }
      await onRefreshData();
    } else if (res.error) {
      alert(res.error);
    }
  };

  const handleUndoRedeemPoints = async (participantId: string, redemptionId: string) => {
    setIsRedeemingPoints(true);
    const res = await api.undoRedeemPoints(participantId, redemptionId);
    setIsRedeemingPoints(false);
    if (res.success && res.participant) {
      if (selectedParticipantHistory && selectedParticipantHistory.participant.id === participantId) {
        setSelectedParticipantHistory({
          ...selectedParticipantHistory,
          participant: res.participant
        });
      }
      await onRefreshData();
    } else if (res.error) {
      alert(res.error);
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
      status: 'active',
      mythologyTitle: 'Мифология и сказания',
      showMythology: true,
      mythologyCulture: '',
      mythologyCreature: '',
      mythologyDescription: '',
      rewardPoints: 1,
      rewardCurrency: games.find(g => g.rewardCurrency?.trim())?.rewardCurrency?.trim() || 'балл в маршрутник',
      physicalReward: '',
      showPhysicalReward: false
    });
    setIsFormOpen(true);
  };

  const handleOpenEditGame = (game: Game) => {
    const activeCurrency = games.find(g => g.rewardCurrency?.trim())?.rewardCurrency?.trim() || 'балл в маршрутник';
    setEditingGame(game);
    setGameFormData({
      ...game,
      mythologyTitle: game.mythologyTitle || 'Мифология и сказания',
      showMythology: game.showMythology ?? Boolean(game.mythologyDescription),
      rewardPoints: game.rewardPoints ?? 1,
      rewardCurrency: game.rewardCurrency || activeCurrency,
      physicalReward: game.physicalReward || '',
      showPhysicalReward: game.showPhysicalReward ?? Boolean(game.physicalReward)
    });
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

    const sanitizedPrefix = (gameFormData.codePrefix || 'GAME')
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9А-ЯЁ\-]/gi, '') || 'GAME';

    const activeCurrency = gameFormData.rewardCurrency?.trim() || games.find(g => g.rewardCurrency?.trim())?.rewardCurrency?.trim() || 'балл в маршрутник';

    const preparedData = {
      ...gameFormData,
      codePrefix: sanitizedPrefix,
      mythologyTitle: gameFormData.mythologyTitle?.trim() || 'Мифология и сказания',
      showMythology: gameFormData.showMythology ?? true,
      mythologyCulture: gameFormData.mythologyCulture || '',
      mythologyCreature: gameFormData.mythologyCreature || '',
      mythologyDescription: gameFormData.mythologyDescription || '',
      rewardPoints: Number(gameFormData.rewardPoints) || 1,
      rewardCurrency: activeCurrency,
      physicalReward: gameFormData.physicalReward?.trim() || '',
      showPhysicalReward: gameFormData.showPhysicalReward ?? Boolean(gameFormData.physicalReward?.trim())
    };

    if (editingGame) {
      await api.updateGame(editingGame.id, preparedData);
    } else {
      await api.createGame({
        name: gameFormData.name.trim(),
        people: gameFormData.people || 'Русские',
        hostName: gameFormData.hostName || 'Ведущий',
        codePrefix: sanitizedPrefix,
        description: gameFormData.description || '',
        rules: gameFormData.rules || '',
        participants: gameFormData.participants || 'Любое количество',
        equipment: gameFormData.equipment || 'Не требуется',
        location: gameFormData.location || 'Поляна фестиваля',
        imageUrl: gameFormData.imageUrl || DEFAULT_GAME_CARD_IMAGE,
        mapX: Number(gameFormData.mapX) || 50,
        mapY: Number(gameFormData.mapY) || 50,
        status: gameFormData.status || 'active',
        mythologyTitle: gameFormData.mythologyTitle?.trim() || 'Мифология и сказания',
        showMythology: gameFormData.showMythology ?? true,
        mythologyCulture: gameFormData.mythologyCulture || '',
        mythologyCreature: gameFormData.mythologyCreature || '',
        mythologyDescription: gameFormData.mythologyDescription || '',
        rewardPoints: Number(gameFormData.rewardPoints) || 1,
        rewardCurrency: activeCurrency,
        physicalReward: gameFormData.physicalReward?.trim() || '',
        showPhysicalReward: gameFormData.showPhysicalReward ?? Boolean(gameFormData.physicalReward?.trim())
      });
    }

    // Cascade currency update across all games so every single card is guaranteed to match
    if (activeCurrency) {
      await api.updateRewardCurrency(activeCurrency);
    }

    setIsFormOpen(false);
    setEditingGame(null);
    setGameFormData({});
    await onRefreshData();
    await loadStats();
    await loadCodes(selectedGameForCodes || undefined);
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
          onClick={() => setActiveTab('shop')}
          id="admin-tab-shop"
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'shop'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Касса / Магазин</span>
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

            {/* Common festival currency indicator */}
            {(() => {
              const activeCurr = games.find(g => g.rewardCurrency?.trim())?.rewardCurrency?.trim() || 'балл в маршрутник';
              return (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-xs text-amber-900 font-medium shrink-0 shadow-2xs">
                  <span className="text-amber-700 font-semibold">Валюта карточек:</span>
                  <span className="font-bold text-amber-950 bg-white/80 px-2 py-0.5 rounded-lg border border-amber-200/80">
                    {activeCurr}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const newCurr = window.prompt('Укажите общее обозначение единиц награды для всех карточек игр:', activeCurr);
                      if (newCurr && newCurr.trim() && newCurr.trim() !== activeCurr) {
                        await api.updateRewardCurrency(newCurr.trim());
                        await onRefreshData();
                      }
                    }}
                    className="text-[11px] text-red-600 hover:text-red-700 font-bold underline cursor-pointer ml-1"
                    title="Изменить единицу награды на всех карточках квеста"
                  >
                    Изменить
                  </button>
                </div>
              );
            })()}

            {/* Add Game Button */}
            <button
              onClick={handleOpenAddGame}
              id="admin-add-game-btn"
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer shrink-0"
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
                    <span className="text-gray-500 font-medium">📍 Место / Ориентир:</span>
                    <span className="font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70 truncate max-w-[170px]" title={game.location}>
                      {game.location || 'Поляна фестиваля'}
                    </span>
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

                  {/* Mythology / Custom block indicator & quick toggle */}
                  <div className="flex items-center justify-between text-xs bg-amber-50/70 p-2 rounded-xl border border-amber-200/70">
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-amber-950 text-[11px] truncate max-w-[120px]">
                            {game.mythologyTitle?.trim() || 'Мифология'}:
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            (game.showMythology ?? Boolean(game.mythologyDescription))
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}>
                            {(game.showMythology ?? Boolean(game.mythologyDescription)) ? 'Включена' : 'Отключена'}
                          </span>
                        </div>
                        {game.mythologyDescription && (
                          <p className="text-[10px] text-amber-900/90 italic truncate max-w-[190px]">
                            {game.mythologyCulture ? `${game.mythologyCulture}: ` : ''}{cleanProhibitedPhrases(game.mythologyDescription)}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const currentVal = game.showMythology ?? Boolean(game.mythologyDescription);
                        await api.updateGame(game.id, { showMythology: !currentVal });
                        await onRefreshData();
                      }}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                        (game.showMythology ?? Boolean(game.mythologyDescription))
                          ? 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
                          : 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700'
                      }`}
                      title={`Быстро включить или выключить показ блока «${game.mythologyTitle || 'Мифология'}»`}
                    >
                      {(game.showMythology ?? Boolean(game.mythologyDescription)) ? 'Отключить' : 'Включить'}
                    </button>
                  </div>

                  {/* Reward badge */}
                  <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-1.5 font-bold text-gray-800">
                      <Trophy className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>+{game.rewardPoints ?? 1}</span>
                      <span className="font-medium text-gray-600 truncate max-w-[120px]">{game.rewardCurrency || 'балл в маршрутник'}</span>
                    </div>
                    {(game.showPhysicalReward ?? Boolean(game.physicalReward)) && game.physicalReward ? (
                      <span className="text-[10px] font-bold text-amber-950 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300 truncate max-w-[160px]" title={game.physicalReward}>
                        🎁 {game.physicalReward}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">Без подарка</span>
                    )}
                  </div>

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

                  const participantGames = games.filter(g => p.completedGames.includes(g.id));
                  const sampleCurrency = games.find(g => g.rewardCurrency?.trim())?.rewardCurrency?.trim() || 'б.';
                  const balance = getParticipantBalance(p, games);

                  const physicalGames = participantGames.filter(
                    g => (g.showPhysicalReward ?? Boolean(g.physicalReward)) && g.physicalReward
                  );
                  const claimedCount = Object.keys(p.claimedRewards || {}).length;
                  const unclaimedCount = physicalGames.filter(g => !p.claimedRewards?.[g.id]).length;

                  return (
                    <div
                      key={p.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs hover:bg-gray-50/80 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{p.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            ID: {p.id}
                          </div>
                        </div>
                      </div>

                      <div className="text-gray-600">
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

                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 font-bold border border-red-200 text-xs">
                            {completedCount} / {total} ({percent}%)
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 font-bold border border-amber-200 text-xs" title="Собрано за игры">
                            ⭐ Собрано: {balance.earnedScore} {sampleCurrency}
                          </span>
                          {balance.spentScore > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-900 font-bold border border-purple-200 text-xs" title="Потрачено в магазине">
                              Потрачено: {balance.spentScore}
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-black border border-emerald-300 text-xs shadow-2xs" title="Доступный остаток для выдачи/покупок">
                            💰 Остаток: {balance.remainingScore} {sampleCurrency}
                          </span>
                        </div>
                        {physicalGames.length > 0 && (
                          <div>
                            {unclaimedCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 text-[10px] font-bold border border-amber-300">
                                <span>🎁</span>
                                <span>{unclaimedCount} к выдаче</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                <span>✓</span>
                                <span>Все призы выданы ({claimedCount})</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          onClick={() => handleViewParticipantHistory(p)}
                          className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                          title="Посмотреть маршрут, списать баллы или выдать призы"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                          <Gift className="w-3.5 h-3.5 text-amber-600" />
                          <span>Касса / Призы</span>
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

      {/* TAB: SHOP & CASHIER DESK */}
      {activeTab === 'shop' && (() => {
        const sampleShopCurrency = games.find(g => g.rewardCurrency?.trim())?.rewardCurrency?.trim() || 'баллов';
        const festivalTotals = participants.reduce((acc, p) => {
          const b = getParticipantBalance(p, games);
          return {
            earned: acc.earned + b.earnedScore,
            spent: acc.spent + b.spentScore,
            remaining: acc.remaining + b.remainingScore
          };
        }, { earned: 0, spent: 0, remaining: 0 });

        const filteredShopParticipants = participants.filter(p => {
          const q = shopSearch.toLowerCase().trim();
          if (!q) return true;
          return (
            p.name.toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q) ||
            (p.phone && p.phone.toLowerCase().includes(q)) ||
            (p.email && p.email.toLowerCase().includes(q)) ||
            (p.cityOrTeam && p.cityOrTeam.toLowerCase().includes(q))
          );
        });

        const activeShopParticipant = participants.find(p => p.id === selectedShopParticipantId) || null;
        const activeShopBalance = activeShopParticipant ? getParticipantBalance(activeShopParticipant, games) : null;

        const allFestivalRedemptions: { participant: Participant; redemption: PointRedemptionItem }[] = [];
        participants.forEach(p => {
          if (p.pointRedemptions) {
            p.pointRedemptions.forEach(r => {
              allFestivalRedemptions.push({ participant: p, redemption: r });
            });
          }
        });
        allFestivalRedemptions.sort((a, b) => b.redemption.id.localeCompare(a.redemption.id));

        return (
          <div className="space-y-6">
            {/* Top Summary Banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-6 text-white shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-emerald-100">
                    <Store className="w-4 h-4" />
                    <span>Рабочее место кассира и магазина</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black font-serif mt-1">
                    Касса фестиваля: выдача денег и списание баллов
                  </h2>
                  <p className="text-xs text-emerald-100/90 mt-1 max-w-xl">
                    Участники приходят в магазин или к кассе: выберите участника по имени, телефону или ID, укажите сумму баллов и назначение покупки или выдачи денег.
                  </p>
                </div>
              </div>

              {/* 4 Key Stat Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
                  <div className="text-[11px] text-emerald-100">Всего участников</div>
                  <div className="text-xl sm:text-2xl font-black mt-0.5">{participants.length}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
                  <div className="text-[11px] text-emerald-100">Собрано баллов</div>
                  <div className="text-xl sm:text-2xl font-black mt-0.5">{festivalTotals.earned}</div>
                  <div className="text-[10px] text-emerald-200 truncate">{sampleShopCurrency}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
                  <div className="text-[11px] text-emerald-100">Выдано / списано</div>
                  <div className="text-xl sm:text-2xl font-black mt-0.5">{festivalTotals.spent}</div>
                  <div className="text-[10px] text-emerald-200 truncate">в магазине</div>
                </div>
                <div className="bg-emerald-950/40 rounded-2xl p-3 border border-emerald-300/40 shadow-inner">
                  <div className="text-[11px] text-emerald-200 font-bold">Остаток на руках</div>
                  <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">{festivalTotals.remaining}</div>
                  <div className="text-[10px] text-emerald-200 truncate">доступно к покупкам</div>
                </div>
              </div>
            </div>

            {/* Split Workspace: Participants list on left, cashier desk on right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Participant Search & List */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-gray-100 bg-gray-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-500" />
                      <span>Выбор участника ({filteredShopParticipants.length})</span>
                    </span>
                    {activeShopParticipant && (
                      <button
                        onClick={() => setSelectedShopParticipantId(null)}
                        className="text-[11px] text-gray-400 hover:text-gray-700 cursor-pointer"
                      >
                        Сбросить выбор
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Имя, телефон, ID, email, команда..."
                      value={shopSearch}
                      onChange={(e) => setShopSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 bg-white"
                    />
                  </div>
                </div>

                <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
                  {filteredShopParticipants.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400">
                      Участники не найдены
                    </div>
                  ) : (
                    filteredShopParticipants.map((p) => {
                      const isSelected = p.id === selectedShopParticipantId;
                      const bal = getParticipantBalance(p, games);

                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedShopParticipantId(p.id)}
                          className={`p-3.5 transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-emerald-50 border-l-4 border-emerald-600'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="min-w-0 flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {p.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 text-xs truncate">
                                {p.name}
                              </div>
                              <div className="text-[10px] text-gray-500 truncate">
                                ID: <span className="font-mono">{p.id}</span>
                                {p.phone && ` • ${p.phone}`}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs font-black text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-lg border border-emerald-200 inline-block">
                              {bal.remainingScore} {sampleShopCurrency}
                            </div>
                            <div className="text-[9px] text-gray-400 mt-0.5">
                              Собрано: {bal.earnedScore}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Active Participant Cashier Desk */}
              <div className="lg:col-span-7 space-y-4">
                {activeShopParticipant && activeShopBalance ? (
                  <div className="bg-white rounded-3xl border border-emerald-200 p-6 shadow-xs space-y-5">
                    {/* Participant Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center font-serif shadow-xs">
                          {activeShopParticipant.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900 font-serif">
                              {activeShopParticipant.name}
                            </h3>
                            <button
                              type="button"
                              onClick={() => handleViewParticipantHistory(activeShopParticipant)}
                              className="text-[11px] text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>(весь маршрут)</span>
                            </button>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap mt-0.5">
                            <span className="font-mono font-semibold">ID: {activeShopParticipant.id}</span>
                            {activeShopParticipant.phone && <span>• Тел: {activeShopParticipant.phone}</span>}
                            {activeShopParticipant.cityOrTeam && (
                              <span className="text-red-600 font-medium">• {activeShopParticipant.cityOrTeam}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedShopParticipantId(null)}
                        className="self-end sm:self-center text-xs text-gray-400 hover:text-gray-600 px-3 py-1 rounded-lg border border-gray-200 cursor-pointer"
                      >
                        Сменить
                      </button>
                    </div>

                    {/* 3 Prominent Balance Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-center">
                        <div className="text-[11px] text-amber-800 font-medium">Собрано</div>
                        <div className="text-xl sm:text-2xl font-bold text-amber-950 mt-0.5">
                          {activeShopBalance.earnedScore}
                        </div>
                        <div className="text-[10px] text-amber-700 truncate">{sampleShopCurrency}</div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 text-center">
                        <div className="text-[11px] text-purple-800 font-medium">Потрачено</div>
                        <div className="text-xl sm:text-2xl font-bold text-purple-950 mt-0.5">
                          {activeShopBalance.spentScore}
                        </div>
                        <div className="text-[10px] text-purple-700 truncate">в магазине</div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-500 text-center shadow-xs">
                        <div className="text-[11px] text-emerald-800 font-bold flex items-center justify-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Остаток</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-0.5">
                          {activeShopBalance.remainingScore}
                        </div>
                        <div className="text-[10px] text-emerald-800 font-bold truncate">к выдаче / покупке</div>
                      </div>
                    </div>

                    {/* Fast Physical Prizes if applicable */}
                    {(() => {
                      const participantGames = games.filter(g => activeShopParticipant.completedGames.includes(g.id));
                      const physicalGames = participantGames.filter(
                        g => (g.showPhysicalReward ?? Boolean(g.physicalReward)) && g.physicalReward
                      );
                      const unclaimedGames = physicalGames.filter(g => !activeShopParticipant.claimedRewards?.[g.id]);

                      if (unclaimedGames.length === 0) return null;

                      return (
                        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                            <span className="flex items-center gap-1.5">
                              <Gift className="w-4 h-4 text-amber-600" />
                              <span>Призы за пройденные точки к выдаче ({unclaimedGames.length}):</span>
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {unclaimedGames.map(game => (
                              <div key={game.id} className="p-2 rounded-xl bg-white border border-amber-200 text-xs flex items-center justify-between gap-2">
                                <div>
                                  <span className="font-bold text-gray-900">{game.physicalReward}</span>
                                  <span className="text-[10px] text-gray-500 ml-1.5">({game.name})</span>
                                </div>
                                <button
                                  type="button"
                                  disabled={isClaimingReward}
                                  onClick={() => handleClaimReward(activeShopParticipant.id, game.id, game.physicalReward)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] cursor-pointer"
                                >
                                  Выдать приз ✓
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* REDEMPTION ACTION FORM */}
                    <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <ShoppingBag className="w-4 h-4 text-emerald-600" />
                          <span>Оформить списание баллов или выдачу денег</span>
                        </span>
                        <span className="text-[11px] text-gray-500">
                          Доступно: <strong className="text-emerald-700">{activeShopBalance.remainingScore}</strong> {sampleShopCurrency}
                        </span>
                      </div>

                      {/* Quick amount buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[1, 2, 5, 10].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setPointRedeemAmount(amt)}
                            className={`px-3 py-1.5 text-xs rounded-xl font-bold border transition-colors cursor-pointer ${
                              pointRedeemAmount === amt
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-200'
                            }`}
                          >
                            {amt} {sampleShopCurrency}
                          </button>
                        ))}
                        {activeShopBalance.remainingScore > 0 && (
                          <button
                            type="button"
                            onClick={() => setPointRedeemAmount(activeShopBalance.remainingScore)}
                            className="px-3 py-1.5 text-xs rounded-xl font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 cursor-pointer"
                          >
                            Все {activeShopBalance.remainingScore} {sampleShopCurrency}
                          </button>
                        )}
                      </div>

                      {/* Form Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] text-gray-600 font-semibold block mb-1">
                            Количество баллов к списанию:
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={activeShopBalance.remainingScore}
                            value={pointRedeemAmount}
                            onChange={(e) => setPointRedeemAmount(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 font-bold text-gray-900 focus:outline-none focus:border-emerald-500 bg-white"
                            placeholder="Например, 5"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-gray-600 font-semibold block mb-1">
                            Назначение / Что выдано:
                          </label>
                          <input
                            type="text"
                            value={pointRedeemNote}
                            onChange={(e) => setPointRedeemNote(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 text-gray-900 focus:outline-none focus:border-emerald-500 bg-white"
                            placeholder="Сувенир, мерч, наличные..."
                          />
                        </div>
                      </div>

                      {/* Note presets */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {['Покупка сувенира', 'Мерч фестиваля', 'Сладкий приз', 'Выдача денег / наличные', 'Угощения на поляне'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setPointRedeemNote(preset)}
                            className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                              pointRedeemNote === preset
                                ? 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border-gray-200'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      {/* Submit button */}
                      <button
                        type="button"
                        disabled={
                          isRedeemingPoints ||
                          !pointRedeemAmount ||
                          pointRedeemAmount <= 0 ||
                          pointRedeemAmount > activeShopBalance.remainingScore
                        }
                        onClick={() => handleRedeemPoints(activeShopParticipant.id, Number(pointRedeemAmount), pointRedeemNote || 'Покупка в магазине')}
                        className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>
                          {pointRedeemAmount && pointRedeemAmount > activeShopBalance.remainingScore
                            ? `Недостаточно баллов (доступно: ${activeShopBalance.remainingScore})`
                            : `Подтвердить списание ${pointRedeemAmount || 0} ${sampleShopCurrency}`}
                        </span>
                      </button>
                    </div>

                    {/* Past redemptions for this participant */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                        <span>История списаний этого участника ({activeShopBalance.redemptions.length}):</span>
                      </h4>

                      {activeShopBalance.redemptions.length === 0 ? (
                        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-400 text-center">
                          Списаний баллов у этого участника ещё не было
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {activeShopBalance.redemptions.map((r) => (
                            <div
                              key={r.id}
                              className="p-2.5 rounded-xl bg-white border border-gray-200 text-xs flex items-center justify-between gap-2 shadow-2xs"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-gray-900 truncate">
                                  {r.note}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                  {r.redeemedAt} {r.redeemedBy && `• ${r.redeemedBy}`}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 text-xs">
                                  -{r.amount} {sampleShopCurrency}
                                </span>
                                <button
                                  type="button"
                                  disabled={isRedeemingPoints}
                                  onClick={() => {
                                    if (confirm(`Отменить списание "${r.note}" (-${r.amount} ${sampleShopCurrency}) и вернуть баллы?`)) {
                                      handleUndoRedeemPoints(activeShopParticipant.id, r.id);
                                    }
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  title="Отменить списание"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                      <ShoppingBag className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-gray-800 font-serif">
                      Выберите участника для обслуживания на кассе
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                      Нажмите на участника в списке слева или воспользуйтесь быстрым поиском по имени, телефону или номеру ID.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* General Festival Store Transactions Log */}
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Все операции магазина и кассы фестиваля ({allFestivalRedemptions.length})</span>
                </span>
                <span className="text-[11px] text-gray-500">
                  Всего списано: <strong className="text-emerald-700">{festivalTotals.spent}</strong> {sampleShopCurrency}
                </span>
              </div>

              {allFestivalRedemptions.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  Операций в магазине пока не совершалось
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[380px] overflow-y-auto">
                  {allFestivalRedemptions.map(({ participant: p, redemption: r }) => (
                    <div
                      key={r.id}
                      className="p-3.5 hover:bg-gray-50/80 transition-colors flex items-center justify-between text-xs gap-3"
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                          {p.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate">
                            {p.name} <span className="text-gray-400 font-mono text-[10px]">ID: {p.id}</span>
                          </div>
                          <div className="text-[11px] text-gray-600 truncate">
                            {r.note}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {r.redeemedAt} {r.redeemedBy && `• ${r.redeemedBy}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100 text-xs">
                          -{r.amount} {sampleShopCurrency}
                        </span>
                        <button
                          type="button"
                          disabled={isRedeemingPoints}
                          onClick={() => {
                            if (confirm(`Отменить операцию "${r.note}" для ${p.name} (-${r.amount} ${sampleShopCurrency})?`)) {
                              handleUndoRedeemPoints(p.id, r.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Отменить операцию"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

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
                  Переезжаете на другую локацию или запускаете новый поток? Сохраните базу участников в файлы JSON или CSV, после чего выберите нужный режим сброса (полный, только прогресс или только участников) под специальным паролем.
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
                  <label className="block font-bold text-gray-700 mb-1">Кодовое слово / Префикс кодов</label>
                  <input
                    type="text"
                    value={gameFormData.codePrefix || ''}
                    onChange={(e) => setGameFormData({ ...gameFormData, codePrefix: e.target.value.toUpperCase() })}
                    placeholder="Например: ШАТРА или ALTAI"
                    className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-300 font-mono uppercase text-xs text-gray-900 focus:outline-none focus:border-red-600"
                  />
                  <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                    Игроки должны вводить проверочный код с номером очереди (например, ШАТРА-001 или ALTIY-002). При смене кодового слова все неиспользованные коды точки автоматически обновятся с сохранением номеров.
                  </p>
                </div>
              </div>

              {/* Location / Landmark Field */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
                <label className="block font-bold text-amber-950 text-xs mb-1">
                  📍 Место проведения / Ориентир игровой точки
                </label>
                <input
                  type="text"
                  value={gameFormData.location || ''}
                  onChange={(e) => setGameFormData({ ...gameFormData, location: e.target.value })}
                  placeholder="Например: Огороженная площадка, Игровая площадка, Центральная поляна"
                  className="w-full h-10 px-3 rounded-xl bg-white border border-amber-300 text-xs text-gray-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500 font-medium"
                />
                <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-amber-800 font-semibold mr-1">Быстрый выбор:</span>
                  {[
                    'Огороженная площадка',
                    'Игровая площадка',
                    'Центральная поляна',
                    'Северная поляна',
                    'Этно-юрта',
                    'Павильон ремёсел',
                    'Силовая зона'
                  ].map((locOption) => (
                    <button
                      key={locOption}
                      type="button"
                      onClick={() => setGameFormData({ ...gameFormData, location: locOption })}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-medium border transition-colors ${
                        gameFormData.location === locOption
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
                      }`}
                    >
                      {locOption}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-amber-700/90 mt-1.5 leading-tight">
                  Этот ориентир увидят игроки в карточке игры, на детальной странице и в подсказках карты фестиваля.
                </p>
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

              {/* Mythology / Instructions / Rules Block Editor */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-200/90 rounded-2xl p-3.5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs text-amber-950">
                        {gameFormData.mythologyTitle?.trim() || 'Мифология и сказания'}
                      </h4>
                      <p className="text-[10px] text-amber-800/80">
                        Тематический блок (мифология, инструкция, правила или легенда)
                      </p>
                    </div>
                  </div>

                  {/* Toggle Checkbox */}
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none bg-white px-2.5 py-1.5 rounded-xl border border-amber-300/80 shadow-xs hover:bg-amber-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={gameFormData.showMythology ?? true}
                      onChange={(e) => setGameFormData({ ...gameFormData, showMythology: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500 cursor-pointer accent-amber-600"
                    />
                    <span className="text-xs font-bold text-amber-950">
                      {(gameFormData.showMythology ?? true) ? 'Блок включён' : 'Блок отключён'}
                    </span>
                  </label>
                </div>

                {(gameFormData.showMythology ?? true) ? (
                  <div className="space-y-3 pt-2 border-t border-amber-200/60">
                    {/* Custom Block Title */}
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <label className="block font-bold text-amber-950 text-[11px]">
                          Название блока (заголовок)
                        </label>
                        <span className="text-[10px] text-amber-700 font-medium">
                          например: Инструкция, Правило, Мифология
                        </span>
                      </div>
                      <input
                        type="text"
                        value={gameFormData.mythologyTitle ?? ''}
                        onChange={(e) => setGameFormData({ ...gameFormData, mythologyTitle: e.target.value })}
                        placeholder="Мифология и сказания"
                        className="w-full h-9 px-3 rounded-xl bg-white border border-amber-300 text-xs text-gray-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500 font-semibold"
                      />
                      {/* Fast Presets */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] text-amber-800 font-medium">Быстрый выбор:</span>
                        {[
                          'Мифология и сказания',
                          'Инструкция',
                          'Правило',
                          'Особые правила',
                          'Легенда станции',
                          'Памятка участнику'
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setGameFormData({ ...gameFormData, mythologyTitle: preset })}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                              (gameFormData.mythologyTitle || 'Мифология и сказания') === preset
                                ? 'bg-amber-700 text-white border-amber-800 shadow-2xs'
                                : 'bg-white/90 text-amber-900 border-amber-300/80 hover:bg-amber-100'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-amber-950 text-[11px] mb-1">
                        Подзаголовок / Культура / Раздел
                      </label>
                      <input
                        type="text"
                        value={gameFormData.mythologyCulture || ''}
                        onChange={(e) => setGameFormData({ ...gameFormData, mythologyCulture: e.target.value })}
                        placeholder="Например: Алтайская мифология или Важное указание"
                        className="w-full h-9 px-3 rounded-xl bg-white border border-amber-300 text-xs text-gray-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-amber-950 text-[11px] mb-1">
                        Персонаж / Образ / Ориентир (необязательно)
                      </label>
                      <input
                        type="text"
                        value={gameFormData.mythologyCreature || ''}
                        onChange={(e) => setGameFormData({ ...gameFormData, mythologyCreature: e.target.value })}
                        placeholder="Например: Горный дух Алтая Ээзи или Совет от судьи"
                        className="w-full h-9 px-3 rounded-xl bg-white border border-amber-300 text-xs text-gray-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-amber-950 text-[11px] mb-1">
                        Основной текст блока (содержание сказания, инструкции или правила)
                      </label>
                      <textarea
                        rows={3}
                        value={gameFormData.mythologyDescription || ''}
                        onChange={(e) => setGameFormData({ ...gameFormData, mythologyDescription: e.target.value })}
                        placeholder="Введите подробный текст..."
                        className="w-full p-2.5 rounded-xl bg-white border border-amber-300 text-xs text-gray-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500 italic leading-relaxed"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-800/80 bg-white/70 p-2.5 rounded-xl border border-dashed border-amber-300">
                    Блок «{gameFormData.mythologyTitle?.trim() || 'Мифология и сказания'}» выключен галочкой и не будет отображаться участникам фестиваля в карточке этой игры.
                  </div>
                )}
              </div>

              {/* REWARD CONFIGURATION BLOCK */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-rose-200/70 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-red-600" />
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs">
                        Награда за победу на станции
                      </h4>
                      <p className="text-[10px] text-gray-500">
                        Баллы, валюта (коины, рубли) и физические призы / мерч
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Points count */}
                  <div>
                    <label className="block font-bold text-gray-800 text-[11px] mb-1">
                      Количество баллов / очков
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        value={gameFormData.rewardPoints ?? 1}
                        onChange={(e) => setGameFormData({ ...gameFormData, rewardPoints: Number(e.target.value) })}
                        className="w-24 h-9 px-3 rounded-xl bg-white border border-gray-300 text-xs text-gray-900 font-bold focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      />
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 5, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setGameFormData({ ...gameFormData, rewardPoints: num })}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              (gameFormData.rewardPoints ?? 1) === num
                                ? 'bg-red-600 text-white border-red-700'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            +{num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Currency / points unit */}
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <label className="block font-bold text-gray-800 text-[11px]">
                        Обозначение единиц / валюты
                      </label>
                      <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        Общая для всех карточек
                      </span>
                    </div>
                    <input
                      type="text"
                      value={gameFormData.rewardCurrency ?? ''}
                      onChange={(e) => setGameFormData({ ...gameFormData, rewardCurrency: e.target.value })}
                      placeholder="балл в маршрутник, коинов, рублей, очков..."
                      className="w-full h-9 px-3 rounded-xl bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-medium"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      При сохранении автоматически обновится на всех карточках игр и во всех новых карточках
                    </p>
                    <div className="flex items-center gap-1 flex-wrap mt-1.5">
                      {[
                        'балл в маршрутник',
                        'балл',
                        'коинов',
                        'рублей',
                        'очков',
                        'алтын',
                        'монет'
                      ].map((curr) => (
                        <button
                          key={curr}
                          type="button"
                          onClick={() => setGameFormData({ ...gameFormData, rewardCurrency: curr })}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-colors cursor-pointer ${
                            (gameFormData.rewardCurrency || 'балл в маршрутник') === curr
                              ? 'bg-red-600 text-white border-red-700'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {curr}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Physical Prize / Merch section */}
                <div className="pt-2 border-t border-rose-200/70 space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={gameFormData.showPhysicalReward ?? Boolean(gameFormData.physicalReward)}
                      onChange={(e) => setGameFormData({ ...gameFormData, showPhysicalReward: e.target.checked })}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-gray-300 cursor-pointer"
                    />
                    <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-amber-600" />
                      <span>Выдавать материальный приз / подарок / мерч за эту игру</span>
                    </span>
                  </label>

                  {(gameFormData.showPhysicalReward ?? Boolean(gameFormData.physicalReward)) && (
                    <div className="pl-6 space-y-2">
                      <div>
                        <label className="block font-bold text-gray-800 text-[11px] mb-1">
                          Наименование приза или мерча
                        </label>
                        <input
                          type="text"
                          value={gameFormData.physicalReward || ''}
                          onChange={(e) => setGameFormData({ ...gameFormData, physicalReward: e.target.value })}
                          placeholder="Например: Памятный жетон, Сладкий приз, Наклейка..."
                          className="w-full h-9 px-3 rounded-xl bg-white border border-amber-300 text-xs text-gray-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500 font-medium"
                        />
                      </div>

                      <div>
                        <div className="text-[10px] text-gray-500 mb-1 font-medium">Быстрые варианты для фестиваля:</div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[
                            'Памятный жетон',
                            'Сладкий приз',
                            'Наклейка',
                            'Печать в бумажный буклет',
                            'Мерч фестиваля',
                            'На выбор (жетон / наклейка / приз)'
                          ].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setGameFormData({
                                ...gameFormData,
                                physicalReward: preset,
                                showPhysicalReward: true
                              })}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                                (gameFormData.physicalReward || '') === preset
                                  ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                                  : 'bg-white text-amber-900 border-amber-300/80 hover:bg-amber-100'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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

      {/* MODAL: PARTICIPANT HISTORY & REWARD ISSUANCE */}
      {selectedParticipantHistory && (() => {
        const p = selectedParticipantHistory.participant;
        const participantGames = games.filter(g => p.completedGames.includes(g.id));
        const sampleCurr = games.find(g => g.rewardCurrency?.trim())?.rewardCurrency?.trim() || 'баллов';
        const balance = getParticipantBalance(p, games);

        // Games with physical rewards completed by participant
        const physicalGames = participantGames.filter(
          g => (g.showPhysicalReward ?? Boolean(g.physicalReward)) && g.physicalReward
        );
        const claimedCount = Object.keys(p.claimedRewards || {}).length;
        const unclaimedGames = physicalGames.filter(g => !p.claimedRewards?.[g.id]);

        return (
          <div className="fixed inset-0 z-50 bg-gray-950/75 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-gray-100 pb-3 shrink-0">
                <div>
                  <h3 className="font-bold text-base text-gray-900 font-serif flex items-center gap-2">
                    <span>Маршрут и касса: {p.name}</span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                    <span>ID: {p.id}</span>
                    {p.phone && <span>• Тел: {p.phone}</span>}
                    {p.cityOrTeam && <span className="text-red-600 font-medium">• {p.cityOrTeam}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedParticipantHistory(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Stats overview banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-center">
                  <div className="text-[10px] text-gray-500 font-medium">Пройдено станций</div>
                  <div className="text-base font-bold text-red-600 mt-0.5">
                    {p.completedGames.length} / {games.length}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-center">
                  <div className="text-[10px] text-amber-800 font-medium">Собрано</div>
                  <div className="text-base font-bold text-amber-900 mt-0.5">
                    {balance.earnedScore} <span className="text-[10px] font-medium">{sampleCurr}</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50/80 border border-purple-200 text-center">
                  <div className="text-[10px] text-purple-800 font-medium">Потрачено</div>
                  <div className="text-base font-bold text-purple-900 mt-0.5">
                    {balance.spentScore} <span className="text-[10px] font-medium">{sampleCurr}</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border-2 border-emerald-400 text-center shadow-xs">
                  <div className="text-[10px] text-emerald-800 font-bold flex items-center justify-center gap-1">
                    <Coins className="w-3 h-3 text-emerald-600" />
                    <span>Остаток</span>
                  </div>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">
                    {balance.remainingScore}
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                {/* POINT REDEMPTION / CASHIER SECTION */}
                <div className="rounded-2xl bg-emerald-50/60 border border-emerald-300/80 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-950">
                      <ShoppingBag className="w-4 h-4 text-emerald-600" />
                      <span>Касса: списание баллов и выдача денег</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                      Доступно: {balance.remainingScore} {sampleCurr}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-2.5">
                    <div className="text-[11px] text-gray-600">
                      Укажите количество баллов для списания при покупке в магазине фестиваля или выдаче денег:
                    </div>

                    {/* Quick amount chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[1, 2, 5, 10].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setPointRedeemAmount(amt)}
                          className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
                            pointRedeemAmount === amt
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                          }`}
                        >
                          {amt} {sampleCurr}
                        </button>
                      ))}
                      {balance.remainingScore > 0 && (
                        <button
                          type="button"
                          onClick={() => setPointRedeemAmount(balance.remainingScore)}
                          className="px-2.5 py-1 text-xs rounded-lg font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 cursor-pointer"
                        >
                          Все {balance.remainingScore} {sampleCurr}
                        </button>
                      )}
                    </div>

                    {/* Amount & Note Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">
                          Сколько баллов списать:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={balance.remainingScore}
                          value={pointRedeemAmount}
                          onChange={(e) => setPointRedeemAmount(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 font-bold text-gray-900 focus:outline-none focus:border-emerald-500"
                          placeholder="Количество"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">
                          Назначение / товар / выдача:
                        </label>
                        <input
                          type="text"
                          value={pointRedeemNote}
                          onChange={(e) => setPointRedeemNote(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:border-emerald-500"
                          placeholder="Сувенир, мерч, наличные..."
                        />
                      </div>
                    </div>

                    {/* Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {['Покупка сувенира', 'Мерч фестиваля', 'Сладкий приз', 'Выдача денег / наличные', 'Угощения на поляне'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setPointRedeemNote(preset)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                            pointRedeemNote === preset
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold'
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      disabled={
                        isRedeemingPoints ||
                        !pointRedeemAmount ||
                        pointRedeemAmount <= 0 ||
                        pointRedeemAmount > balance.remainingScore
                      }
                      onClick={() => handleRedeemPoints(p.id, Number(pointRedeemAmount), pointRedeemNote || 'Покупка в магазине')}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>
                        {pointRedeemAmount && pointRedeemAmount > balance.remainingScore
                          ? `Недостаточно баллов (остаток: ${balance.remainingScore})`
                          : `Списать ${pointRedeemAmount || 0} ${sampleCurr} и зафиксировать`}
                      </span>
                    </button>
                  </div>

                  {/* Redemptions list for this participant */}
                  {balance.redemptions && balance.redemptions.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                        <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                        <span>История списаний в магазине ({balance.redemptions.length}):</span>
                      </div>
                      {balance.redemptions.map((r) => (
                        <div
                          key={r.id}
                          className="p-2 rounded-xl bg-white border border-gray-200 text-xs flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 truncate">
                              {r.note}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {r.redeemedAt} {r.redeemedBy && `• ${r.redeemedBy}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 text-xs">
                              -{r.amount} {sampleCurr}
                            </span>
                            <button
                              type="button"
                              disabled={isRedeemingPoints}
                              onClick={() => {
                                if (confirm(`Отменить списание "${r.note}" (-${r.amount} ${sampleCurr}) и вернуть баллы участнику?`)) {
                                  handleUndoRedeemPoints(p.id, r.id);
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Отменить списание и вернуть баллы"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Physical Rewards Section */}
                {physicalGames.length > 0 && (
                  <div className="rounded-2xl bg-amber-50/60 border border-amber-200/90 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950">
                        <Gift className="w-4 h-4 text-amber-600" />
                        <span>Материальные призы и мерч ({physicalGames.length})</span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-900 bg-white px-2 py-0.5 rounded-md border border-amber-200">
                        Выдано {claimedCount} из {physicalGames.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {physicalGames.map((game) => {
                        const claim = p.claimedRewards?.[game.id];
                        const isClaimed = Boolean(claim);

                        return (
                          <div
                            key={`reward-item-${game.id}`}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                              isClaimed
                                ? 'bg-emerald-50/90 border-emerald-300/80 text-emerald-950'
                                : 'bg-white border-amber-300/90 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                  isClaimed ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                                }`}
                              >
                                {isClaimed ? <Check className="w-3.5 h-3.5" /> : <Gift className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold truncate flex items-center gap-1.5">
                                  <span>{claim?.rewardName || game.physicalReward}</span>
                                </div>
                                <div className="text-[10px] text-gray-500 truncate">
                                  Точка #{game.number}: {game.name}
                                  {isClaimed && claim && (
                                    <span className="text-emerald-700 font-medium ml-1">
                                      • Выдано {claim.claimedAt} ({claim.claimedBy || 'Судья'})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5">
                              {isClaimed ? (
                                <button
                                  type="button"
                                  disabled={isClaimingReward}
                                  onClick={() => handleUnclaimReward(p.id, game.id)}
                                  className="px-2 py-1 rounded-lg bg-white hover:bg-red-50 text-gray-500 hover:text-red-600 border border-gray-200 text-[10px] font-semibold transition-colors cursor-pointer"
                                  title="Отменить отметку о выдаче приза (если ошиблись)"
                                >
                                  Отменить
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isClaimingReward}
                                  onClick={() => handleClaimReward(p.id, game.id, game.physicalReward)}
                                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Отметить как выдан</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* History list */}
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-red-600" />
                    <span>История подтверждённых точек</span>
                  </h4>

                  {selectedParticipantHistory.history.length === 0 ? (
                    <div className="p-4 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-center text-xs text-gray-500">
                      История прохождений пуста
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedParticipantHistory.history.map((h, i) => {
                        const matchingGame = games.find(g => g.id === h.gameId);
                        const gamePoints = matchingGame?.rewardPoints ?? 1;
                        const gameCurr = matchingGame?.rewardCurrency || 'балл в маршрутник';
                        const hasPhysical = (matchingGame?.showPhysicalReward ?? Boolean(matchingGame?.physicalReward)) && matchingGame?.physicalReward;
                        const isPhysClaimed = Boolean(p.claimedRewards?.[h.gameId]);

                        return (
                          <div key={h.id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs flex justify-between items-center gap-2">
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 truncate">
                                {i + 1}. {h.gameName}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5 flex-wrap">
                                <span>Код: {h.codeString}</span>
                                <span>• +{gamePoints} {gameCurr}</span>
                                {hasPhysical && (
                                  <span className={`font-semibold ${isPhysClaimed ? 'text-emerald-600' : 'text-amber-700'}`}>
                                    • Приз: {matchingGame?.physicalReward} {isPhysClaimed ? '(выдан ✓)' : '(не выдан)'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-gray-500 shrink-0">
                              {new Date(h.completedAt).toLocaleTimeString('ru-RU')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
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
