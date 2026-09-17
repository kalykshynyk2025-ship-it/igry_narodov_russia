export interface ClaimedRewardItem {
  gameId: string;
  gameNumber?: number;
  gameName?: string;
  rewardName: string;
  claimedAt: string;
  claimedBy?: string;
}

export interface Participant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cityOrTeam?: string;
  completedGames: string[];
  createdAt: string;
  lastCompletedGame?: string;
  lastCompletedAt?: string;
  totalScore?: number;
  claimedRewards?: Record<string, ClaimedRewardItem>;
}

export interface Game {
  id: string;
  number: number;
  name: string;
  people: string;
  description: string;
  rules: string;
  participants: string;
  equipment: string;
  location: string;
  status: 'active' | 'inactive';
  category?: string;
  imageUrl?: string;
  hostName?: string;
  codePrefix?: string;
  nextSequentialCode?: string;
  mapX?: number; // 0 to 100 percentage
  mapY?: number; // 0 to 100 percentage
  mythologyTitle?: string; // Custom header name (e.g. "Мифология и сказания", "Инструкция", "Правило")
  mythologyCreature?: string;
  mythologyCulture?: string;
  mythologyDescription?: string;
  showMythology?: boolean;
  rewardPoints?: number; // Number of points/units awarded (e.g. 1, 2, 5)
  rewardCurrency?: string; // e.g. "балл в маршрутник", "балл", "рублей", "коинов", "очков", "монет"
  physicalReward?: string; // e.g. "Памятный жетон", "Сладкий приз", "Наклейка", "Печать в бумажный буклет", "Мерч"
  showPhysicalReward?: boolean;
}

export function cleanProhibitedPhrases(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/«?\s*акварельный\s+эскиз:?\s*/gi, '')
    .replace(/и\s+акварельный\s+эскиз\s*/gi, '')
    .replace(/акварельный\s+эскиз\s*/gi, '')
    .replace(/персонаж:?\s*/gi, '')
    .replace(/ракурс:?\s*/gi, '')
    .replace(/только\s+лапы\s+и\s+руки/gi, '')
    .replace(/в\s+полный\s+рост/gi, '')
    .replace(/полный\s+рост/gi, '')
    .replace(/взгляд\s+и\s+силуэт/gi, '')
    .replace(/gemini/gi, '')
    .replace(/ai\s*studio/gi, '')
    .replace(/«\s*»/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export interface Code {
  id: string;
  code: string;
  gameId: string;
  sequenceNumber?: number;
  status: 'active' | 'used';
  usedBy?: string;
  usedAt?: string;
  createdAt: string;
}

export interface GameCompletion {
  id: string;
  participantId: string;
  participantName?: string;
  gameId: string;
  gameName?: string;
  codeId: string;
  codeString?: string;
  completedAt: string;
}

export interface AdminStats {
  totalParticipants: number;
  totalGames: number;
  activeGames: number;
  totalCompletions: number;
  mostPopularGame: {
    gameId: string;
    gameName: string;
    count: number;
  } | null;
  avgGamesPerParticipant: number;
  totalCodesGenerated: number;
  totalCodesUsed: number;
  gameCodesSummary?: Record<string, {
    total: number;
    active: number;
    used: number;
    nextActiveCode?: string;
  }>;
}

export interface VerifyCodeRequest {
  participantId: string;
  code: string;
}

export interface VerifyCodeResponse {
  success: boolean;
  gameId?: string;
  gameName?: string;
  nextSequentialCode?: string;
  message: string;
  progress?: {
    completedCount: number;
    totalCount: number;
    completedGames: string[];
  };
  errorCode?: 'NOT_FOUND' | 'ALREADY_USED' | 'ALREADY_COMPLETED' | 'GAME_INACTIVE' | 'INVALID_PARTICIPANT' | 'INCOMPLETE_CODE';
}

export const DEFAULT_GAME_CARD_IMAGE = '/assets/festival-cards-map.jpg';

export interface MapCircleSettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
  outerRadius: number; // in pixels (default 90)
  innerRadius: number; // in pixels (default 35)
  showSectors: boolean;
  sector1Label: string;
  sector2Label: string;
  sector3Label: string;
  sector4Label: string;
  description?: string;
}

export const DEFAULT_MAP_CIRCLE_SETTINGS: MapCircleSettings = {
  enabled: true,
  title: 'Главная площадь',
  subtitle: 'Фестивальный круг',
  x: 50,
  y: 50,
  outerRadius: 90,
  innerRadius: 35,
  showSectors: true,
  sector1Label: 'Сектор 1: Интеллект и Шахматы',
  sector2Label: 'Сектор 2: Северные состязания',
  sector3Label: 'Сектор 3: Командные забавы',
  sector4Label: 'Сектор 4: Сила и Меткость',
  description: 'Центральная площадь фестиваля, место общих сборов, хороводов и награждений'
};

