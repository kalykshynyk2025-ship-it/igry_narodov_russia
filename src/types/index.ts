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
  mythologyCreature?: string;
  mythologyCulture?: string;
  mythologyDepiction?: 'в полный рост' | 'только лапы и руки' | 'взгляд и силуэт';
  mythologyDescription?: string;
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
  errorCode?: 'NOT_FOUND' | 'ALREADY_USED' | 'ALREADY_COMPLETED' | 'GAME_INACTIVE' | 'INVALID_PARTICIPANT';
}

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

