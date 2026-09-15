import { Game, Participant, Code, GameCompletion, AdminStats, VerifyCodeResponse, MapCircleSettings, DEFAULT_MAP_CIRCLE_SETTINGS } from '../types';
import { INITIAL_GAMES, INITIAL_CODES, INITIAL_PARTICIPANTS, INITIAL_COMPLETIONS } from '../data/initialGames';

const STORAGE_KEYS = {
  CURRENT_PARTICIPANT: 'folk_games_current_participant_id',
  CURRENT_PARTICIPANT_DATA: 'folk_games_current_participant_data',
  LOCAL_PARTICIPANTS: 'folk_games_local_participants',
  LOCAL_GAMES: 'folk_games_local_games',
  LOCAL_CODES: 'folk_games_local_codes',
  LOCAL_COMPLETIONS: 'folk_games_local_completions',
  ADMIN_TOKEN: 'folk_games_admin_auth_token',
  MAP_BACKGROUND: 'folk_games_map_background_url',
  MAP_CIRCLE_SETTINGS: 'folk_games_map_circle_settings'
};

class ApiService {
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => { this.isOnline = true; });
      window.addEventListener('offline', () => { this.isOnline = false; });
      this.initLocalStorageFallback();
    }
  }

  private initLocalStorageFallback() {
    if (!localStorage.getItem(STORAGE_KEYS.LOCAL_GAMES)) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_GAMES, JSON.stringify(INITIAL_GAMES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOCAL_CODES)) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_CODES, JSON.stringify(INITIAL_CODES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOCAL_PARTICIPANTS)) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_PARTICIPANTS, JSON.stringify(INITIAL_PARTICIPANTS));
    } else {
      // Purge any old test/mock participants from local storage
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_PARTICIPANTS);
        if (raw) {
          const parsed: Participant[] = JSON.parse(raw);
          const cleaned = parsed.filter(p =>
            !p.email?.includes('@test.ru') &&
            p.email !== 'ivan.other@gmail.com' &&
            p.email !== 'maria@family.ru' &&
            p.id !== 'p-client-backup-1'
          );
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEYS.LOCAL_PARTICIPANTS, JSON.stringify(cleaned));
          }
        }
      } catch {
        // ignore
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOCAL_COMPLETIONS)) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_COMPLETIONS, JSON.stringify(INITIAL_COMPLETIONS));
    }

    // Clean current participant if it was a test user
    const currentPart = this.getCurrentParticipantData();
    if (currentPart && (
      currentPart.email?.includes('@test.ru') ||
      currentPart.email === 'ivan.other@gmail.com' ||
      currentPart.email === 'maria@family.ru' ||
      currentPart.id === 'p-client-backup-1'
    )) {
      this.setCurrentParticipant(null);
    }
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // --- ADMIN AUTH ---
  async adminLogin(username: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, data.token || 'admin_token');
        return { success: true, token: data.token };
      }
      return { success: false, error: data.error || 'Неверный логин или пароль' };
    } catch {
      // Local fallback check: login: admin, password: kalyk2025
      if (username === 'admin' && password === 'kalyk2025') {
        const token = 'local_admin_' + Date.now();
        localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, token);
        return { success: true, token };
      }
      return { success: false, error: 'Неверный логин или пароль' };
    }
  }

  isAdminLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  }

  adminLogout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
    }
  }

  // --- GAMES ---
  async getGames(): Promise<Game[]> {
    try {
      const res = await fetch('/api/games');
      if (!res.ok) throw new Error('Network response not ok');
      const data: Game[] = await res.json();
      localStorage.setItem(STORAGE_KEYS.LOCAL_GAMES, JSON.stringify(data));
      return data;
    } catch {
      const cached = localStorage.getItem(STORAGE_KEYS.LOCAL_GAMES);
      return cached ? JSON.parse(cached) : INITIAL_GAMES;
    }
  }

  async getGameById(id: string): Promise<Game | null> {
    try {
      const res = await fetch(`/api/games/${id}`);
      if (!res.ok) throw new Error('Game not found');
      return await res.json();
    } catch {
      const games = await this.getGames();
      return games.find(g => g.id === id) || null;
    }
  }

  async updateGame(id: string, updates: Partial<Game>): Promise<Game> {
    try {
      const res = await fetch(`/api/games/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update game');
      const updated: Game = await res.json();
      this.syncLocalGame(updated);
      return updated;
    } catch {
      const localGames: Game[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_GAMES) || '[]');
      const idx = localGames.findIndex(g => g.id === id);
      if (idx !== -1) {
        localGames[idx] = { ...localGames[idx], ...updates };
        localStorage.setItem(STORAGE_KEYS.LOCAL_GAMES, JSON.stringify(localGames));
        return localGames[idx];
      }
      throw new Error('Игра не найдена');
    }
  }

  async createGame(gameData: Omit<Game, 'id' | 'number'>): Promise<Game> {
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData)
      });
      if (!res.ok) throw new Error('Failed to create game');
      const created: Game = await res.json();
      this.syncLocalGame(created);
      return created;
    } catch {
      const localGames: Game[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_GAMES) || '[]');
      const newGame: Game = {
        ...gameData,
        id: `game-${Date.now()}`,
        number: localGames.length + 1,
        status: gameData.status || 'active',
        nextSequentialCode: `${gameData.codePrefix || 'GAME'}-001`,
        mapX: gameData.mapX ?? 50,
        mapY: gameData.mapY ?? 50
      };
      localGames.push(newGame);
      localStorage.setItem(STORAGE_KEYS.LOCAL_GAMES, JSON.stringify(localGames));
      return newGame;
    }
  }

  async deleteGame(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/games/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete game');
      this.removeLocalGame(id);
      return true;
    } catch {
      this.removeLocalGame(id);
      return true;
    }
  }

  private removeLocalGame(id: string) {
    const localGames: Game[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_GAMES) || '[]');
    const filtered = localGames.filter(g => g.id !== id);
    localStorage.setItem(STORAGE_KEYS.LOCAL_GAMES, JSON.stringify(filtered));
  }

  private syncLocalGame(game: Game) {
    const localGames: Game[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_GAMES) || '[]');
    const idx = localGames.findIndex(g => g.id === game.id);
    if (idx !== -1) {
      localGames[idx] = game;
    } else {
      localGames.push(game);
    }
    localStorage.setItem(STORAGE_KEYS.LOCAL_GAMES, JSON.stringify(localGames));
  }

  // --- PARTICIPANTS ---
  async getParticipants(): Promise<Participant[]> {
    const isTestParticipant = (p: Participant) => {
      const testIds = new Set(['p-mtzjr75q-00u1', 'p-mtzjr360-pzy3', 'p-mtzjqzg5-ahvd', 'p-client-backup-1']);
      const testEmails = new Set(['ivan.other@gmail.com', 'family@test.ru', 'maria@family.ru']);
      return (
        testIds.has(p.id) ||
        (p.email && testEmails.has(p.email)) ||
        p.name === 'Иван Иванов' ||
        p.name === 'Анна Иванова' ||
        p.name === 'Мария Смирнова'
      );
    };

    try {
      const res = await fetch('/api/participants');
      if (!res.ok) throw new Error('Failed to fetch participants');
      const data: Participant[] = await res.json();
      const cleaned = (data || []).filter(p => !isTestParticipant(p));
      localStorage.setItem(STORAGE_KEYS.LOCAL_PARTICIPANTS, JSON.stringify(cleaned));
      return cleaned;
    } catch {
      const cached = localStorage.getItem(STORAGE_KEYS.LOCAL_PARTICIPANTS);
      const list: Participant[] = cached ? JSON.parse(cached) : INITIAL_PARTICIPANTS;
      return list.filter(p => !isTestParticipant(p));
    }
  }

  async getParticipant(id: string): Promise<Participant | null> {
    try {
      const res = await fetch(`/api/participants/${id}`);
      if (!res.ok) throw new Error('Participant not found');
      return await res.json();
    } catch {
      const participants = await this.getParticipants();
      return participants.find(p => p.id === id) || null;
    }
  }

  async loginParticipant(
    params: string | { name?: string; email?: string; phone?: string; query?: string }
  ): Promise<{
    success: boolean;
    participant?: Participant;
    matches?: Participant[];
    requiresSelection?: boolean;
    error?: string;
    message?: string;
  }> {
    const payload = typeof params === 'string' ? { query: params } : params;
    try {
      const res = await fetch('/api/participants/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Участник не найден' };
      }
      if (data.participant) {
        this.setCurrentParticipant(data.participant);
      }
      return data;
    } catch {
      // Offline fallback: check local participants
      const local: Participant[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_PARTICIPANTS) || '[]');
      const q = (payload.query || payload.name || payload.email || payload.phone || '').trim().toLowerCase();
      const pName = (payload.name || '').trim().toLowerCase();
      const pEmail = (payload.email || '').trim().toLowerCase();
      const pPhone = payload.phone ? payload.phone.replace(/\D/g, '') : '';

      // Match by Name + Email/Phone
      if (pName && (pEmail || pPhone)) {
        const exact = local.find(p => {
          const nameOk = p.name.trim().toLowerCase() === pName || p.name.trim().toLowerCase().includes(pName);
          const emailOk = pEmail && p.email && (p.email.trim().toLowerCase() === pEmail || p.email.trim().toLowerCase().includes(pEmail));
          const phoneOk = pPhone && p.phone && p.phone.replace(/\D/g, '').includes(pPhone);
          return nameOk && (emailOk || phoneOk);
        });
        if (exact) {
          this.setCurrentParticipant(exact);
          return { success: true, participant: exact, matches: [exact] };
        }
      }

      // Match by query
      const digits = q.replace(/\D/g, '');
      const matches = local.filter(p => {
        if (p.id.toLowerCase() === q) return true;
        if (p.email && p.email.toLowerCase().includes(q)) return true;
        if (digits.length >= 4 && p.phone && p.phone.replace(/\D/g, '').includes(digits)) return true;
        if (p.name.toLowerCase().includes(q)) return true;
        return false;
      });

      if (matches.length === 1) {
        this.setCurrentParticipant(matches[0]);
        return { success: true, participant: matches[0], matches };
      }
      if (matches.length > 1) {
        return {
          success: true,
          requiresSelection: true,
          matches,
          message: 'Найдено несколько участников. Выберите ваш профиль:'
        };
      }
      return { success: false, error: 'Участник не найден. Проверьте правильность или зарегистрируйтесь.' };
    }
  }

  async checkExistingParticipant(name: string, email?: string, phone?: string): Promise<Participant | null> {
    try {
      const res = await fetch('/api/participants/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.exists ? data.participant : null;
    } catch {
      const local: Participant[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_PARTICIPANTS) || '[]');
      const trimmed = (name || '').trim().toLowerCase();
      const trimmedEmail = (email || '').trim().toLowerCase();
      const pDigits = phone ? phone.replace(/\D/g, '') : '';
      return local.find(p => {
        const pName = p.name.trim().toLowerCase();
        const pEmail = (p.email || '').trim().toLowerCase();
        const pPhone = (p.phone || '').replace(/\D/g, '');

        if (trimmed && trimmedEmail && pName === trimmed && pEmail === trimmedEmail) return true;
        if (trimmed && pDigits.length >= 7 && pName === trimmed && pPhone === pDigits) return true;
        return false;
      }) || null;
    }
  }

  async registerParticipant(
    name: string,
    email?: string,
    phone?: string,
    cityOrTeam?: string,
    options?: { checkExisting?: boolean; forceNew?: boolean }
  ): Promise<{ participant: Participant; alreadyExists?: boolean; message?: string }> {
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          cityOrTeam,
          checkExisting: options?.checkExisting !== false,
          forceNew: options?.forceNew
        })
      });
      if (!res.ok) throw new Error('Failed to register participant');
      const data = await res.json();

      if (data.alreadyExists && data.participant) {
        this.setCurrentParticipant(data.participant);
        return {
          participant: data.participant,
          alreadyExists: true,
          message: data.message
        };
      }

      const participant: Participant = data;
      this.setCurrentParticipant(participant);
      return { participant, alreadyExists: false };
    } catch {
      const id = `p-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const participant: Participant = {
        id,
        name: name.trim(),
        email: email?.trim().toLowerCase() || undefined,
        phone: phone?.trim() || undefined,
        cityOrTeam: cityOrTeam?.trim() || undefined,
        completedGames: [],
        createdAt: new Date().toISOString()
      };
      this.setCurrentParticipant(participant);
      return { participant, alreadyExists: false };
    }
  }

  async syncParticipant(participant: Participant): Promise<Participant> {
    try {
      const res = await fetch('/api/participants/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant })
      });
      if (!res.ok) throw new Error('Failed to sync participant');
      const data = await res.json();
      if (data.participant) {
        this.setCurrentParticipant(data.participant);
        return data.participant;
      }
      return participant;
    } catch {
      this.syncLocalParticipant(participant);
      return participant;
    }
  }

  private syncLocalParticipant(participant: Participant) {
    const local: Participant[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_PARTICIPANTS) || '[]');
    const idx = local.findIndex(p => p.id === participant.id);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...participant };
    } else {
      local.unshift(participant);
    }
    localStorage.setItem(STORAGE_KEYS.LOCAL_PARTICIPANTS, JSON.stringify(local));
  }

  getCurrentParticipantId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_PARTICIPANT);
  }

  getCurrentParticipantData(): Participant | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_PARTICIPANT_DATA);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  setCurrentParticipant(participant: Participant | null) {
    if (participant) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_PARTICIPANT, participant.id);
      localStorage.setItem(STORAGE_KEYS.CURRENT_PARTICIPANT_DATA, JSON.stringify(participant));
      this.syncLocalParticipant(participant);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PARTICIPANT);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PARTICIPANT_DATA);
    }
  }

  setCurrentParticipantId(id: string | null) {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_PARTICIPANT, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PARTICIPANT);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PARTICIPANT_DATA);
    }
  }

  // --- VERIFY CODE ---
  async verifyCode(participantId: string, code: string): Promise<VerifyCodeResponse> {
    try {
      const res = await fetch('/api/codes/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, code })
      });
      if (!res.ok) {
        throw new Error('Server error');
      }
      const data: VerifyCodeResponse = await res.json();

      if (data.success && data.gameId) {
        this.applyLocalVerification(participantId, code, data.gameId, data.gameName || 'Игра');
      }
      return data;
    } catch {
      return this.verifyCodeOffline(participantId, code);
    }
  }

  private verifyCodeOffline(participantId: string, rawCode: string): VerifyCodeResponse {
    const cleanCode = (rawCode || '').trim().toUpperCase();
    const localCodes: Code[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_CODES) || '[]');
    const localGames: Game[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_GAMES) || '[]');
    const localParticipants: Participant[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_PARTICIPANTS) || '[]');

    const foundCode = localCodes.find(c => c.code.toUpperCase() === cleanCode);
    if (!foundCode) {
      return {
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Код не найден. Уточните проверочный код у ведущего точки.'
      };
    }

    if (foundCode.status === 'used') {
      return {
        success: false,
        errorCode: 'ALREADY_USED',
        message: `Этот код (${cleanCode}) уже использован предыдущим участником. Обратитесь к ведущему за актуальным кодом.`
      };
    }

    const game = localGames.find(g => g.id === foundCode.gameId);
    if (!game) {
      return {
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Игра не найдена.'
      };
    }

    let participant = localParticipants.find(p => p.id === participantId);
    if (!participant) {
      participant = {
        id: participantId,
        name: 'Участник',
        completedGames: [],
        createdAt: new Date().toISOString()
      };
      localParticipants.push(participant);
    }

    if (participant.completedGames.includes(game.id)) {
      return {
        success: false,
        errorCode: 'ALREADY_COMPLETED',
        message: 'Эта игра уже отмечена как пройденная в вашем маршрутном листе.'
      };
    }

    this.applyLocalVerification(participantId, cleanCode, game.id, game.name);

    return {
      success: true,
      gameId: game.id,
      gameName: game.name,
      message: `Испытание «${game.name}» успешно пройдено!`,
      progress: {
        completedCount: participant.completedGames.length + 1,
        totalCount: localGames.filter(g => g.status === 'active').length,
        completedGames: [...participant.completedGames, game.id]
      }
    };
  }

  private applyLocalVerification(participantId: string, codeStr: string, gameId: string, gameName: string) {
    const localCodes: Code[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_CODES) || '[]');
    const localParticipants: Participant[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_PARTICIPANTS) || '[]');
    const localCompletions: GameCompletion[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_COMPLETIONS) || '[]');

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const codeObj = localCodes.find(c => c.code.toUpperCase() === codeStr.toUpperCase());
    if (codeObj) {
      codeObj.status = 'used';
      codeObj.usedBy = participantId;
      codeObj.usedAt = now.toISOString();
      localStorage.setItem(STORAGE_KEYS.LOCAL_CODES, JSON.stringify(localCodes));
    }

    const part = localParticipants.find(p => p.id === participantId);
    if (part) {
      if (!part.completedGames.includes(gameId)) {
        part.completedGames.push(gameId);
      }
      part.lastCompletedGame = gameName;
      part.lastCompletedAt = timeFormatted;
      localStorage.setItem(STORAGE_KEYS.LOCAL_PARTICIPANTS, JSON.stringify(localParticipants));
    }

    localCompletions.unshift({
      id: `cmp-${Date.now()}`,
      participantId,
      participantName: part?.name || 'Участник',
      gameId,
      gameName,
      codeId: codeObj?.id || 'local-code',
      codeString: codeStr,
      completedAt: now.toISOString()
    });
    localStorage.setItem(STORAGE_KEYS.LOCAL_COMPLETIONS, JSON.stringify(localCompletions));
  }

  // --- CODES ADMIN ---
  async getCodes(gameId?: string): Promise<Code[]> {
    try {
      const url = gameId ? `/api/codes?gameId=${gameId}` : '/api/codes';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch codes');
      return await res.json();
    } catch {
      const local: Code[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_CODES) || '[]');
      return gameId ? local.filter(c => c.gameId === gameId) : local;
    }
  }

  async generateCodes(gameId: string, count: number): Promise<{ count: number; codes: Code[] }> {
    try {
      const res = await fetch('/api/codes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, count })
      });
      if (!res.ok) throw new Error('Failed to generate codes');
      const data = await res.json();
      const local: Code[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_CODES) || '[]');
      local.push(...data.codes);
      localStorage.setItem(STORAGE_KEYS.LOCAL_CODES, JSON.stringify(local));
      return data;
    } catch {
      const games = await this.getGames();
      const game = games.find(g => g.id === gameId);
      const prefix = game?.codePrefix || 'GAME';
      const local: Code[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_CODES) || '[]');
      const existing = local.filter(c => c.gameId === gameId);
      const highest = existing.reduce((m, c) => Math.max(m, c.sequenceNumber || 0), 0);

      const newCodes: Code[] = [];
      for (let i = 1; i <= count; i++) {
        const seq = highest + i;
        const numStr = String(seq).padStart(3, '0');
        newCodes.push({
          id: `c-${gameId}-${seq}-${Date.now()}`,
          code: `${prefix}-${numStr}`,
          gameId,
          sequenceNumber: seq,
          status: 'active',
          createdAt: new Date().toISOString()
        });
      }
      local.push(...newCodes);
      localStorage.setItem(STORAGE_KEYS.LOCAL_CODES, JSON.stringify(local));
      return { count: newCodes.length, codes: newCodes };
    }
  }

  async ensure500Codes(): Promise<{ success: boolean; added: number; totalCodes?: number }> {
    try {
      const res = await fetch('/api/codes/ensure-500', {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to ensure 500 codes');
      return await res.json();
    } catch {
      return { success: true, added: 0 };
    }
  }

  // --- ADMIN STATS ---
  async getAdminStats(): Promise<AdminStats> {
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return await res.json();
    } catch {
      const localGames: Game[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_GAMES) || '[]');
      const localParts: Participant[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_PARTICIPANTS) || '[]');
      const localComps: GameCompletion[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_COMPLETIONS) || '[]');
      const localCodes: Code[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_CODES) || '[]');

      return {
        totalParticipants: localParts.length,
        totalGames: localGames.length,
        activeGames: localGames.filter(g => g.status === 'active').length,
        totalCompletions: localComps.length,
        mostPopularGame: localComps.length > 0 ? {
          gameId: localComps[0].gameId,
          gameName: localComps[0].gameName || 'Хазых',
          count: localComps.length
        } : null,
        avgGamesPerParticipant: localParts.length ? Math.round((localComps.length / localParts.length) * 10) / 10 : 0,
        totalCodesGenerated: localCodes.length,
        totalCodesUsed: localCodes.filter(c => c.status === 'used').length
      };
    }
  }

  async getParticipantHistory(participantId: string): Promise<GameCompletion[]> {
    try {
      const res = await fetch(`/api/admin/participants/${participantId}/history`);
      if (!res.ok) throw new Error('Failed to fetch participant history');
      return await res.json();
    } catch {
      const completions: GameCompletion[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_COMPLETIONS) || '[]');
      return completions.filter(c => c.participantId === participantId);
    }
  }

  // --- IMAGE UPLOAD & RESOLUTION ---
  async uploadImage(file: File): Promise<{ url: string; filename?: string; size?: number }> {
    const compressImage = (f: File, maxDimension = 1400, quality = 0.85): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(e.target?.result as string);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
          };
          img.onerror = () => resolve(e.target?.result as string);
          img.src = e.target?.result as string;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(f);
      });
    };

    try {
      const base64Data = await compressImage(file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Data,
          filename: file.name
        })
      });
      if (!res.ok) throw new Error('Ошибка загрузки фото на сервер');
      const data = await res.json();
      return { url: data.url, filename: data.filename, size: data.size };
    } catch {
      // Fallback: return client-side base64 dataUrl directly
      const fallbackDataUrl = await compressImage(file);
      return { url: fallbackDataUrl, filename: file.name };
    }
  }

  async resolveImageUrl(url: string): Promise<{ url: string; originalName?: string; error?: string }> {
    try {
      const res = await fetch('/api/resolve-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Не удалось распознать ссылку на фото');
      }
      return { url: data.url, originalName: data.originalName };
    } catch (err: any) {
      return { url, error: err.message || 'Ошибка обработки ссылки' };
    }
  }

  async deleteParticipant(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/admin/participants/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка при удалении участника');

      // Clean local storage cache as well
      const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_PARTICIPANTS);
      if (raw) {
        try {
          const list: Participant[] = JSON.parse(raw);
          const updated = list.filter(p => p.id !== id);
          localStorage.setItem(STORAGE_KEYS.LOCAL_PARTICIPANTS, JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Ошибка при удалении' };
    }
  }

  async resetVenue(
    password: string,
    mode: 'cleanAll' | 'resetProgressOnly' = 'cleanAll'
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, mode })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Неверный пароль или ошибка сброса');
      }

      // Reset client-side storage
      localStorage.removeItem(STORAGE_KEYS.LOCAL_COMPLETIONS);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PARTICIPANT);

      if (mode === 'cleanAll') {
        localStorage.removeItem(STORAGE_KEYS.LOCAL_PARTICIPANTS);
      } else {
        const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_PARTICIPANTS);
        if (raw) {
          try {
            const list: Participant[] = JSON.parse(raw);
            const resetList = list.map(p => ({
              ...p,
              completedGames: [],
              lastCompletedGame: undefined,
              lastCompletedAt: undefined
            }));
            localStorage.setItem(STORAGE_KEYS.LOCAL_PARTICIPANTS, JSON.stringify(resetList));
          } catch {
            // ignore
          }
        }
      }

      // Re-activate all local codes
      const rawCodes = localStorage.getItem(STORAGE_KEYS.LOCAL_CODES);
      if (rawCodes) {
        try {
          const codesList: Code[] = JSON.parse(rawCodes);
          const activeCodes = codesList.map(c => ({ ...c, status: 'active' as const }));
          localStorage.setItem(STORAGE_KEYS.LOCAL_CODES, JSON.stringify(activeCodes));
        } catch {
          // ignore
        }
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Ошибка сброса данных' };
    }
  }

  async resetData(): Promise<void> {
    try {
      await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'kalyk2025shynyk', mode: 'cleanAll' })
      });
    } catch {
      // ignore
    }
    localStorage.removeItem(STORAGE_KEYS.LOCAL_GAMES);
    localStorage.removeItem(STORAGE_KEYS.LOCAL_CODES);
    localStorage.removeItem(STORAGE_KEYS.LOCAL_PARTICIPANTS);
    localStorage.removeItem(STORAGE_KEYS.LOCAL_COMPLETIONS);
    this.initLocalStorageFallback();
  }

  // --- MAP BACKGROUND & FESTIVAL CIRCLE SETTINGS ---
  async getMapSettings(): Promise<{ mapBackgroundUrl: string; circleSettings: MapCircleSettings }> {
    try {
      const res = await fetch('/api/settings/map');
      if (res.ok) {
        const data = await res.json();
        const url = data.mapBackgroundUrl || '';
        const circle: MapCircleSettings = data.circleSettings || { ...DEFAULT_MAP_CIRCLE_SETTINGS };
        if (typeof window !== 'undefined') {
          if (url) {
            localStorage.setItem(STORAGE_KEYS.MAP_BACKGROUND, url);
          } else {
            localStorage.removeItem(STORAGE_KEYS.MAP_BACKGROUND);
          }
          localStorage.setItem(STORAGE_KEYS.MAP_CIRCLE_SETTINGS, JSON.stringify(circle));
        }
        return { mapBackgroundUrl: url, circleSettings: circle };
      }
    } catch {
      // ignore
    }

    // Fallback to local storage
    let cachedCircle = { ...DEFAULT_MAP_CIRCLE_SETTINGS };
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.MAP_CIRCLE_SETTINGS);
        if (raw) cachedCircle = { ...DEFAULT_MAP_CIRCLE_SETTINGS, ...JSON.parse(raw) };
      } catch {
        // ignore
      }
    }
    const cachedUrl = (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEYS.MAP_BACKGROUND)) || '';
    return { mapBackgroundUrl: cachedUrl, circleSettings: cachedCircle };
  }

  async getMapBackground(): Promise<string> {
    const settings = await this.getMapSettings();
    return settings.mapBackgroundUrl;
  }

  async getMapCircleSettings(): Promise<MapCircleSettings> {
    const settings = await this.getMapSettings();
    return settings.circleSettings;
  }

  async updateMapCircleSettings(circleSettings: Partial<MapCircleSettings>): Promise<{ success: boolean; circleSettings: MapCircleSettings }> {
    let merged: MapCircleSettings = { ...DEFAULT_MAP_CIRCLE_SETTINGS, ...circleSettings };
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.MAP_CIRCLE_SETTINGS);
        if (raw) {
          merged = { ...DEFAULT_MAP_CIRCLE_SETTINGS, ...JSON.parse(raw), ...circleSettings };
        }
        localStorage.setItem(STORAGE_KEYS.MAP_CIRCLE_SETTINGS, JSON.stringify(merged));
      } catch {
        // ignore
      }
    }
    try {
      const res = await fetch('/api/admin/map-circle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(circleSettings)
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, circleSettings: data.circleSettings };
      }
    } catch {
      // ignore
    }
    return { success: true, circleSettings: merged };
  }

  async updateMapBackground(mapBackgroundUrl: string): Promise<{ success: boolean; mapBackgroundUrl: string }> {
    const cleanUrl = (mapBackgroundUrl || '').trim();
    if (typeof window !== 'undefined') {
      if (cleanUrl) {
        localStorage.setItem(STORAGE_KEYS.MAP_BACKGROUND, cleanUrl);
      } else {
        localStorage.removeItem(STORAGE_KEYS.MAP_BACKGROUND);
      }
    }
    try {
      const res = await fetch('/api/admin/map-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapBackgroundUrl: cleanUrl })
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, mapBackgroundUrl: data.mapBackgroundUrl };
      }
    } catch {
      // ignore
    }
    return { success: true, mapBackgroundUrl: cleanUrl };
  }

  async removeMapBackground(): Promise<{ success: boolean }> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.MAP_BACKGROUND);
    }
    try {
      await fetch('/api/admin/map-background', { method: 'DELETE' });
    } catch {
      // ignore
    }
    return { success: true };
  }

  async getNetworkInfo(): Promise<{
    port: number;
    addresses: { iface: string; address: string; family: string }[];
    hostname: string;
    platform: string;
  }> {
    try {
      const res = await fetch('/api/admin/network-info');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return {
      port: 3000,
      addresses: [],
      hostname: 'local-server',
      platform: 'unknown',
    };
  }
}

export const api = new ApiService();
