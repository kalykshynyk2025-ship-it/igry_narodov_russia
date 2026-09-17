import React, { useState, useRef, useEffect } from 'react';
import { MapPin, CheckCircle2, ChevronRight, Move, Sparkles, Navigation, Info, Check, Compass } from 'lucide-react';
import { Game, MapCircleSettings, DEFAULT_MAP_CIRCLE_SETTINGS, DEFAULT_GAME_CARD_IMAGE } from '../types';

interface SchematicFestivalMapProps {
  games: Game[];
  completedGameIds: string[];
  onSelectGame: (game: Game) => void;
  mapBackgroundUrl?: string;
  // Festival Circle / Main Square settings
  circleSettings?: MapCircleSettings;
  onUpdateCircleSettings?: (settings: Partial<MapCircleSettings>) => void;
  isCircleSelected?: boolean;
  onSelectCircle?: () => void;
  // Admin placement mode props (optional)
  isEditable?: boolean;
  selectedGameForPlacement?: Game | null;
  onUpdateCoordinates?: (gameId: string, mapX: number, mapY: number) => void;
}

interface DraggingState {
  gameId: string;
  x: number;
  y: number;
  startPointerX: number;
  startPointerY: number;
  hasMoved: boolean;
}

interface CircleDraggingState {
  x: number;
  y: number;
  startPointerX: number;
  startPointerY: number;
  hasMoved: boolean;
}

export const SchematicFestivalMap: React.FC<SchematicFestivalMapProps> = ({
  games,
  completedGameIds,
  onSelectGame,
  mapBackgroundUrl,
  circleSettings,
  onUpdateCircleSettings,
  isCircleSelected = false,
  onSelectCircle,
  isEditable = false,
  selectedGameForPlacement = null,
  onUpdateCoordinates
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [hoveredGame, setHoveredGame] = useState<Game | null>(null);

  // Active circle settings with fallback to defaults
  const activeCircle: MapCircleSettings = {
    ...DEFAULT_MAP_CIRCLE_SETTINGS,
    ...(circleSettings || {})
  };

  // Dragging state for game pins
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);

  // Dragging state for the festival circle
  const [circleDragging, setCircleDragging] = useState<CircleDraggingState | null>(null);
  const [justSavedCircle, setJustSavedCircle] = useState(false);

  // Modal info for festival circle in participant mode
  const [showCircleModal, setShowCircleModal] = useState(false);

  const completedSet = new Set(completedGameIds);

  // Clear saved toasts after delay
  useEffect(() => {
    if (!justSavedId) return;
    const timer = setTimeout(() => setJustSavedId(null), 2000);
    return () => clearTimeout(timer);
  }, [justSavedId]);

  useEffect(() => {
    if (!justSavedCircle) return;
    const timer = setTimeout(() => setJustSavedCircle(false), 2000);
    return () => clearTimeout(timer);
  }, [justSavedCircle]);

  // Click on map to place either the selected game or the festival circle
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditable) return;
    if (dragging?.hasMoved || circleDragging?.hasMoved) return;

    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = Math.round(Math.max(4, Math.min(96, ((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.round(Math.max(4, Math.min(96, ((e.clientY - rect.top) / rect.height) * 100)));

    // If Festival Circle is selected, move it to clicked point
    if (isCircleSelected && onUpdateCircleSettings && !selectedGameForPlacement) {
      onUpdateCircleSettings({ x, y });
      setJustSavedCircle(true);
      return;
    }

    // Otherwise if a game pin is selected, place game
    if (selectedGameForPlacement && onUpdateCoordinates) {
      onUpdateCoordinates(selectedGameForPlacement.id, x, y);
      setJustSavedId(selectedGameForPlacement.id);
    }
  };

  // --- GAME PIN DRAGGING ---
  const handlePinPointerDown = (e: React.PointerEvent, game: Game) => {
    if (!isEditable) return;
    e.stopPropagation();
    onSelectGame(game);

    if (!mapRef.current) return;
    const currentX = typeof game.mapX === 'number' ? game.mapX : 20 + ((game.number * 17) % 65);
    const currentY = typeof game.mapY === 'number' ? game.mapY : 20 + ((game.number * 23) % 65);

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    setDragging({
      gameId: game.id,
      x: currentX,
      y: currentY,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      hasMoved: false
    });
  };

  const handlePinPointerMove = (e: React.PointerEvent, game: Game) => {
    if (!isEditable || !dragging || dragging.gameId !== game.id) return;
    e.stopPropagation();

    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();

    const dist = Math.hypot(e.clientX - dragging.startPointerX, e.clientY - dragging.startPointerY);
    const hasMoved = dragging.hasMoved || dist > 3;

    const newX = Math.round(Math.max(4, Math.min(96, ((e.clientX - rect.left) / rect.width) * 100)));
    const newY = Math.round(Math.max(4, Math.min(96, ((e.clientY - rect.top) / rect.height) * 100)));

    setDragging({
      ...dragging,
      x: newX,
      y: newY,
      hasMoved
    });
  };

  const handlePinPointerUp = (e: React.PointerEvent, game: Game) => {
    if (!isEditable || !dragging || dragging.gameId !== game.id) return;
    e.stopPropagation();

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    if (dragging.hasMoved && onUpdateCoordinates) {
      onUpdateCoordinates(game.id, dragging.x, dragging.y);
      setJustSavedId(game.id);
    }

    setDragging(null);
  };

  const handlePinPointerCancel = (e: React.PointerEvent, game: Game) => {
    if (!dragging || dragging.gameId !== game.id) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    setDragging(null);
  };

  // --- FESTIVAL CIRCLE DRAGGING ---
  const handleCirclePointerDown = (e: React.PointerEvent) => {
    if (!isEditable) return;
    e.stopPropagation();
    onSelectCircle?.();

    if (!mapRef.current) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    setCircleDragging({
      x: activeCircle.x,
      y: activeCircle.y,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      hasMoved: false
    });
  };

  const handleCirclePointerMove = (e: React.PointerEvent) => {
    if (!isEditable || !circleDragging) return;
    e.stopPropagation();

    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();

    const dist = Math.hypot(e.clientX - circleDragging.startPointerX, e.clientY - circleDragging.startPointerY);
    const hasMoved = circleDragging.hasMoved || dist > 3;

    const newX = Math.round(Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100)));
    const newY = Math.round(Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100)));

    setCircleDragging({
      ...circleDragging,
      x: newX,
      y: newY,
      hasMoved
    });
  };

  const handleCirclePointerUp = (e: React.PointerEvent) => {
    if (!isEditable || !circleDragging) return;
    e.stopPropagation();

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    if (circleDragging.hasMoved && onUpdateCircleSettings) {
      onUpdateCircleSettings({ x: circleDragging.x, y: circleDragging.y });
      setJustSavedCircle(true);
    }

    setCircleDragging(null);
  };

  const handleCirclePointerCancel = (e: React.PointerEvent) => {
    if (!circleDragging) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    setCircleDragging(null);
  };

  // Calculate coordinates currently being dragged or active for the circle
  const currentCircleX = circleDragging ? circleDragging.x : activeCircle.x;
  const currentCircleY = circleDragging ? circleDragging.y : activeCircle.y;

  return (
    <div className="relative w-full rounded-3xl bg-white border border-gray-200 overflow-hidden shadow-sm">
      {/* Map Header / Legend */}
      <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/60 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
            <h3 className="font-bold text-base text-gray-900">
              Схематическая карта фестивальной поляны
            </h3>
            {isEditable && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Move className="w-3 h-3" />
                <span>Режим перемещения</span>
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {isEditable
              ? isCircleSelected
                ? 'Выбран Фестивальный круг: перетащите его мышкой по карте или кликните в нужное место.'
                : selectedGameForPlacement
                ? `Выбрана игра #${selectedGameForPlacement.number}: кликните по карте или перетащите пин.`
                : 'Перетаскивайте игровые точки и Фестивальный круг по карте, чтобы настроить схему.'
              : 'Нажмите на любую игровую точку или Фестивальный круг, чтобы открыть информацию'}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-gray-700">
            <div className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold">
              ✓
            </div>
            <span>Пройдена ({completedGameIds.length})</span>
          </div>

          <div className="flex items-center gap-1.5 text-gray-700">
            <div className="w-4 h-4 rounded-full bg-white border-2 border-red-600 text-red-600 flex items-center justify-center text-[10px] font-bold">
              •
            </div>
            <span>Доступна ({games.filter(g => g.status === 'active' && !completedSet.has(g.id)).length})</span>
          </div>

          <div className="flex items-center gap-1.5 text-gray-400">
            <div className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold">
              ×
            </div>
            <span>Недоступна</span>
          </div>
        </div>
      </div>

      {/* Map Canvas / Field */}
      <div
        ref={mapRef}
        onClick={handleMapClick}
        id="schematic-festival-map-canvas"
        className={`relative w-full aspect-[4/3] sm:aspect-[16/10] bg-white border-b border-gray-100 overflow-hidden select-none ${
          isEditable
            ? dragging || circleDragging
              ? 'cursor-grabbing'
              : selectedGameForPlacement || isCircleSelected
              ? 'cursor-crosshair'
              : 'cursor-default'
            : 'cursor-default'
        }`}
      >
        {/* Map Background: either custom uploaded image or default vector schematic */}
        {mapBackgroundUrl ? (
          <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
            <img
              src={mapBackgroundUrl}
              alt="Схема фестивальной площадки"
              className="w-full h-full object-cover object-center pointer-events-none"
            />
            {/* Soft gradient overlay so pins and text stand out clearly */}
            <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px]" />
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full pointer-events-none bg-radial from-gray-50/70 to-white">
            {/* Subtle Grid Lines */}
            <div
              className="w-full h-full opacity-30"
              style={{
                backgroundImage: 'radial-gradient(#9ca3af 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />
          </div>
        )}

        {/* Vector Schematic Pathways (shown when no custom image or alongside it) */}
        {!mapBackgroundUrl && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {/* Decorative Paths across festival ground */}
            <path
              d="M 100,200 Q 400,250 800,180"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="20"
              strokeLinecap="round"
            />
            <path
              d="M 200,450 Q 450,400 700,500 T 900,450"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="16"
              strokeLinecap="round"
            />
            <path
              d="M 350,120 L 350,550"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M 700,120 L 700,550"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="12"
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Dynamic SVG Central Arena / Festival Circle */}
        {activeCircle.enabled && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-1">
            {/* Outer Arena Outline */}
            <circle
              cx={`${currentCircleX}%`}
              cy={`${currentCircleY}%`}
              r={activeCircle.outerRadius}
              fill={isCircleSelected ? "#fee2e2" : "#fef2f2"}
              fillOpacity={isCircleSelected ? "0.55" : mapBackgroundUrl ? "0.2" : "0.4"}
              stroke={isCircleSelected ? "#dc2626" : "#fca5a5"}
              strokeWidth={isCircleSelected ? "2.5" : "2"}
              strokeDasharray={isCircleSelected ? "4 4" : "6 4"}
              className="transition-all duration-150"
            />

            {/* Selection pulse ring in admin edit mode */}
            {isEditable && isCircleSelected && (
              <circle
                cx={`${currentCircleX}%`}
                cy={`${currentCircleY}%`}
                r={activeCircle.outerRadius + 8}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="8 6"
                className="animate-pulse opacity-75"
              />
            )}

            {/* Inner Decorative Circle */}
            <circle
              cx={`${currentCircleX}%`}
              cy={`${currentCircleY}%`}
              r={activeCircle.innerRadius}
              fill={isCircleSelected ? "#fecaca" : "#fef2f2"}
              fillOpacity={isCircleSelected ? "0.7" : mapBackgroundUrl ? "0.3" : "0.6"}
              stroke={isCircleSelected ? "#dc2626" : "#f87171"}
              strokeWidth="1.5"
              className="transition-all duration-150"
            />
          </svg>
        )}

        {/* Festival Zone Labels */}
        {activeCircle.showSectors && (
          <>
            <div className="absolute top-4 left-6 pointer-events-none z-5">
              <span className="px-2.5 py-1 rounded-md bg-white/95 text-gray-700 text-[11px] font-bold uppercase tracking-wider border border-gray-200 shadow-2xs backdrop-blur-xs">
                {activeCircle.sector1Label}
              </span>
            </div>

            <div className="absolute top-4 right-6 pointer-events-none text-right z-5">
              <span className="px-2.5 py-1 rounded-md bg-white/95 text-gray-700 text-[11px] font-bold uppercase tracking-wider border border-gray-200 shadow-2xs backdrop-blur-xs">
                {activeCircle.sector2Label}
              </span>
            </div>

            <div className="absolute bottom-4 left-6 pointer-events-none z-5">
              <span className="px-2.5 py-1 rounded-md bg-white/95 text-gray-700 text-[11px] font-bold uppercase tracking-wider border border-gray-200 shadow-2xs backdrop-blur-xs">
                {activeCircle.sector3Label}
              </span>
            </div>

            <div className="absolute bottom-4 right-6 pointer-events-none text-right z-5">
              <span className="px-2.5 py-1 rounded-md bg-white/95 text-gray-700 text-[11px] font-bold uppercase tracking-wider border border-gray-200 shadow-2xs backdrop-blur-xs">
                {activeCircle.sector4Label}
              </span>
            </div>
          </>
        )}

        {/* Central Arena Badge / Festival Circle Label (Interactive & Draggable in Edit Mode) */}
        {activeCircle.enabled && (
          <div
            style={{ left: `${currentCircleX}%`, top: `${currentCircleY}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 text-center select-none ${
              isEditable
                ? 'cursor-grab active:cursor-grabbing z-25'
                : 'cursor-pointer hover:scale-105 transition-transform z-15'
            }`}
            onPointerDown={isEditable ? handleCirclePointerDown : undefined}
            onPointerMove={isEditable ? handleCirclePointerMove : undefined}
            onPointerUp={isEditable ? handleCirclePointerUp : undefined}
            onPointerCancel={isEditable ? handleCirclePointerCancel : undefined}
            onClick={(e) => {
              e.stopPropagation();
              if (isEditable) {
                onSelectCircle?.();
              } else {
                setShowCircleModal(true);
              }
            }}
          >
            <div
              className={`px-3 py-1.5 rounded-2xl shadow-sm border transition-all ${
                isCircleSelected
                  ? 'bg-red-600 text-white border-red-700 ring-4 ring-red-400/40'
                  : 'bg-white/95 text-gray-900 border-red-200 hover:border-red-400 backdrop-blur-xs'
              }`}
            >
              <div
                className={`text-[10px] font-extrabold uppercase tracking-widest leading-none ${
                  isCircleSelected ? 'text-red-100' : 'text-red-600'
                }`}
              >
                {activeCircle.title}
              </div>
              <div
                className={`text-xs font-serif font-bold mt-1 leading-none ${
                  isCircleSelected ? 'text-white' : 'text-gray-800'
                }`}
              >
                {activeCircle.subtitle}
              </div>

              {/* Coordinates info in Edit Mode */}
              {isEditable && (
                <div
                  className={`flex items-center justify-center gap-1 mt-1 pt-1 border-t text-[9px] font-mono font-medium ${
                    isCircleSelected ? 'border-red-500 text-red-100' : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <Move className="w-2.5 h-2.5" />
                  <span>X: {currentCircleX}%, Y: {currentCircleY}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dragging Guide Lines (shown when a point or the festival circle is being dragged) */}
        {isEditable && (dragging || circleDragging) && (
          <div className="absolute inset-0 pointer-events-none z-30">
            <div
              style={{ top: `${(circleDragging?.y ?? dragging?.y)}%` }}
              className="absolute left-0 right-0 border-t-2 border-dashed border-red-500/70"
            />
            <div
              style={{ left: `${(circleDragging?.x ?? dragging?.x)}%` }}
              className="absolute top-0 bottom-0 border-l-2 border-dashed border-red-500/70"
            />
          </div>
        )}

        {/* Toast Notification when circle position is saved */}
        {justSavedCircle && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 animate-bounce">
            <Check className="w-3.5 h-3.5" />
            <span>Главная площадь и Фестивальный круг обновлены!</span>
          </div>
        )}

        {/* Interactive Game Pins */}
        {games.map((game) => {
          const isCompleted = completedSet.has(game.id);
          const isInactive = game.status === 'inactive';
          const isSelectedForPlacement = selectedGameForPlacement?.id === game.id;
          const isHovered = hoveredGame?.id === game.id;
          const isCurrentlyDragging = dragging?.gameId === game.id;
          const isJustSaved = justSavedId === game.id;

          // Default fallback coordinates if not set, or current drag coordinates
          const defaultX = typeof game.mapX === 'number' ? game.mapX : 20 + ((game.number * 17) % 65);
          const defaultY = typeof game.mapY === 'number' ? game.mapY : 20 + ((game.number * 23) % 65);

          const posX = isCurrentlyDragging ? dragging.x : defaultX;
          const posY = isCurrentlyDragging ? dragging.y : defaultY;

          return (
            <div
              key={game.id}
              style={{ left: `${posX}%`, top: `${posY}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 select-none ${
                isCurrentlyDragging ? 'z-40' : isSelectedForPlacement ? 'z-30' : 'z-20'
              } ${isCurrentlyDragging ? '' : 'transition-transform duration-150'}`}
              onMouseEnter={() => !dragging && !circleDragging && setHoveredGame(game)}
              onMouseLeave={() => !dragging && !circleDragging && setHoveredGame(null)}
            >
              {/* Coordinates tooltip while dragging or just saved */}
              {(isCurrentlyDragging || isJustSaved) && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-xl bg-gray-900 text-white text-[11px] font-mono font-bold shadow-xl whitespace-nowrap z-50 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                  {isJustSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-300">Сохранено ({posX}%, {posY}%)</span>
                    </>
                  ) : (
                    <>
                      <Move className="w-3.5 h-3.5 text-red-400" />
                      <span>X: {posX}% Y: {posY}%</span>
                    </>
                  )}
                </div>
              )}

              {/* Game Pin Button */}
              <button
                type="button"
                id={`map-pin-game-${game.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGame(game);
                }}
                onPointerDown={(e) => handlePinPointerDown(e, game)}
                onPointerMove={(e) => handlePinPointerMove(e, game)}
                onPointerUp={(e) => handlePinPointerUp(e, game)}
                onPointerCancel={(e) => handlePinPointerCancel(e, game)}
                className={`group relative flex items-center justify-center rounded-2xl transition-all duration-200 outline-none ${
                  isCurrentlyDragging
                    ? 'scale-125 cursor-grabbing ring-4 ring-red-500 shadow-2xl z-50'
                    : isEditable
                    ? 'cursor-grab hover:scale-115 active:cursor-grabbing'
                    : 'cursor-pointer hover:scale-115'
                } ${
                  isSelectedForPlacement
                    ? 'ring-4 ring-red-600 ring-offset-2 scale-120 shadow-xl'
                    : isHovered
                    ? 'ring-2 ring-red-400 shadow-lg'
                    : ''
                }`}
                style={{ touchAction: isEditable ? 'none' : 'auto' }}
                aria-label={`Игра №${game.number} ${game.name}`}
              >
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm shadow-md transition-colors ${
                    isCompleted
                      ? 'bg-red-600 text-white border-2 border-white ring-2 ring-red-600'
                      : isInactive
                      ? 'bg-gray-200 text-gray-400 border-2 border-white'
                      : 'bg-white text-gray-900 border-2 border-red-600 ring-2 ring-red-100 hover:bg-red-50'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  ) : (
                    <span>{game.number}</span>
                  )}
                </div>

                {/* Move Icon Badge in Editable Mode */}
                {isEditable && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-xs">
                    <Move className="w-2.5 h-2.5" />
                  </div>
                )}
              </button>

              {/* Pin Label (Always visible or on hover) */}
              <div
                className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded-md bg-gray-900/90 text-white text-[10px] font-semibold whitespace-nowrap pointer-events-none shadow-md transition-opacity ${
                  isHovered || isSelectedForPlacement || isCurrentlyDragging
                    ? 'opacity-100 scale-105 z-30'
                    : 'opacity-80 hidden sm:block'
                }`}
              >
                {game.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Quick Bar or Hover Info Banner */}
      <div className="p-4 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        {hoveredGame ? (
          <div className="flex items-center gap-3">
            <img
              src={hoveredGame.imageUrl || DEFAULT_GAME_CARD_IMAGE}
              alt={hoveredGame.name}
              className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_GAME_CARD_IMAGE;
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-sm">
                  #{hoveredGame.number} {hoveredGame.name}
                </span>
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-semibold">
                  {hoveredGame.people}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                {hoveredGame.location && (
                  <span className="text-amber-900 font-medium bg-amber-50 px-1.5 py-0.5 rounded text-[11px] border border-amber-200/60">
                    📍 {hoveredGame.location}
                  </span>
                )}
                <span className="text-gray-500 line-clamp-1">
                  {hoveredGame.hostName ? `Ведущий: ${hoveredGame.hostName}` : hoveredGame.description}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500">
            <Info className="w-4 h-4 text-gray-400 shrink-0" />
            <span>
              {completedGameIds.length === games.length && games.length > 0
                ? 'Поздравляем! Все точки пройдены! Получите фестивальный сертификат в профиле.'
                : `Пройдено ${completedGameIds.length} из ${games.length} игровых точек фестиваля.`}
            </span>
          </div>
        )}

        {hoveredGame && (
          <button
            onClick={() => onSelectGame(hoveredGame)}
            id="map-open-selected-game-btn"
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-sm cursor-pointer"
          >
            <span>Открыть карточку</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Festival Circle Info Modal in Participant View */}
      {showCircleModal && activeCircle.enabled && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowCircleModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 relative space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-xl border border-red-200">
                  🎯
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-600">
                    {activeCircle.title}
                  </span>
                  <h3 className="text-xl font-serif font-bold text-gray-900">
                    {activeCircle.subtitle}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowCircleModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              {activeCircle.description || 'Центральная локация фестиваля «Игры народов России». Здесь проходят торжественное открытие, общие хороводы, подведение итогов квеста и награждение участников.'}
            </p>

            <div className="p-3.5 bg-red-50/60 rounded-2xl border border-red-100 flex items-center justify-between text-xs text-gray-600">
              <span className="font-medium">Координаты центра:</span>
              <span className="font-mono font-bold text-red-600">X: {activeCircle.x}%, Y: {activeCircle.y}%</span>
            </div>

            <button
              onClick={() => setShowCircleModal(false)}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              Понятно, вернуться к карте
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
