import fs from 'fs';
import path from 'path';
import { INITIAL_GAMES, INITIAL_CODES, INITIAL_PARTICIPANTS, INITIAL_COMPLETIONS, generateInitialSequentialCodes } from '../src/data/initialGames.js';
import { Game, Code, Participant, GameCompletion, AdminStats, VerifyCodeResponse, MapCircleSettings, DEFAULT_MAP_CIRCLE_SETTINGS, DEFAULT_GAME_CARD_IMAGE } from '../src/types/index.js';

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'festival_db.json');

class InMemoryDatabase {
  private games: Map<string, Game> = new Map();
  private codes: Map<string, Code> = new Map();
  private participants: Map<string, Participant> = new Map();
  private completions: GameCompletion[] = [];
  private mapBackgroundUrl: string = '';
  private circleSettings: MapCircleSettings = { ...DEFAULT_MAP_CIRCLE_SETTINGS };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.games)) {
          for (const g of parsed.games) {
            const initialMatch = INITIAL_GAMES.find(ig => ig.id === g.id);
            if (initialMatch) {
              g.imageUrl = initialMatch.imageUrl;
              g.mythologyCreature = initialMatch.mythologyCreature;
              g.mythologyCulture = initialMatch.mythologyCulture;
              delete (g as any).mythologyDepiction;
              g.mythologyDescription = initialMatch.mythologyDescription;
            } else {
              delete (g as any).mythologyDepiction;
            }
            this.games.set(g.id, g);
          }
        }
        if (Array.isArray(parsed.codes)) {
          for (const c of parsed.codes) this.codes.set(c.id, c);
        }
        if (Array.isArray(parsed.participants)) {
          const testIds = new Set(['p-mtzjr75q-00u1', 'p-mtzjr360-pzy3', 'p-mtzjqzg5-ahvd', 'p-client-backup-1']);
          const testEmails = new Set(['ivan.other@gmail.com', 'family@test.ru', 'maria@family.ru']);
          for (const p of parsed.participants) {
            if (!testIds.has(p.id) && !testEmails.has(p.email)) {
              this.participants.set(p.id, p);
            }
          }
        }
        if (Array.isArray(parsed.completions)) {
          const testIds = new Set(['p-mtzjr75q-00u1', 'p-mtzjr360-pzy3', 'p-mtzjqzg5-ahvd', 'p-client-backup-1']);
          this.completions = parsed.completions.filter((c: any) => !testIds.has(c.participantId));
        }
        if (typeof parsed.mapBackgroundUrl === 'string') {
          this.mapBackgroundUrl = parsed.mapBackgroundUrl;
        } else if (parsed.settings && typeof parsed.settings.mapBackgroundUrl === 'string') {
          this.mapBackgroundUrl = parsed.settings.mapBackgroundUrl;
        }
        if (parsed.circleSettings && typeof parsed.circleSettings === 'object') {
          this.circleSettings = { ...DEFAULT_MAP_CIRCLE_SETTINGS, ...parsed.circleSettings };
        } else if (parsed.settings && parsed.settings.circleSettings) {
          this.circleSettings = { ...DEFAULT_MAP_CIRCLE_SETTINGS, ...parsed.settings.circleSettings };
        }
        // If games were empty, seed
        if (this.games.size === 0) {
          this.seed();
        }
        // Ensure each game has at least 500 sequential codes (for large festivals > 50 participants)
        this.ensureCodesPerGame(500);
        return;
      }
    } catch (err) {
      console.warn('Could not load database file, falling back to seed:', err);
    }

    this.seed();
    this.ensureCodesPerGame(500);
    this.saveToFile();
  }

  // Ensure that every registered game has at least minCount (default 500) sequential codes
  public ensureCodesPerGame(minCount: number = 500): number {
    let addedCount = 0;
    const now = new Date().toISOString();

    for (const game of this.games.values()) {
      const prefix = game.codePrefix || 'GAME';
      const existingCodes = Array.from(this.codes.values()).filter(c => c.gameId === game.id);
      const existingSeqs = new Set(existingCodes.map(c => c.sequenceNumber).filter(Boolean));

      for (let seq = 1; seq <= minCount; seq++) {
        if (!existingSeqs.has(seq)) {
          const numStr = String(seq).padStart(3, '0');
          const codeItem: Code = {
            id: `c-${game.id}-${seq}`,
            code: `${prefix}-${numStr}`,
            gameId: game.id,
            sequenceNumber: seq,
            status: 'active',
            createdAt: now
          };
          this.codes.set(codeItem.id, codeItem);
          addedCount++;
        }
      }
    }

    if (addedCount > 0) {
      this.saveToFile();
    }

    return addedCount;
  }

  private saveToFile() {
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        games: Array.from(this.games.values()),
        codes: Array.from(this.codes.values()),
        participants: Array.from(this.participants.values()),
        completions: this.completions,
        mapBackgroundUrl: this.mapBackgroundUrl,
        circleSettings: this.circleSettings,
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database to file:', err);
    }
  }

  private seed() {
    // Seed games
    for (const g of INITIAL_GAMES) {
      this.games.set(g.id, { ...g });
    }

    // Seed sequential codes
    for (const c of INITIAL_CODES) {
      this.codes.set(c.id, { ...c });
    }

    // STRICT USER INSTRUCTION: NO demo participants!
    for (const p of INITIAL_PARTICIPANTS) {
      this.participants.set(p.id, { ...p });
    }

    this.completions = [...INITIAL_COMPLETIONS];
  }

  // Calculate current active sequential code for a game
  private getNextSequentialCodeForGame(gameId: string): string {
    const game = this.games.get(gameId);
    const prefix = game?.codePrefix || 'GAME';

    const gameCodes = Array.from(this.codes.values())
      .filter(c => c.gameId === gameId)
      .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));

    const firstActive = gameCodes.find(c => c.status === 'active');
    if (firstActive) {
      return firstActive.code;
    }

    // If all existing codes used, generate next sequential code
    const nextSeq = gameCodes.length + 1;
    const numStr = String(nextSeq).padStart(3, '0');
    const newCodeString = `${prefix}-${numStr}`;

    const newCode: Code = {
      id: `c-${gameId}-${nextSeq}-${Date.now().toString(36)}`,
      code: newCodeString,
      gameId: gameId,
      sequenceNumber: nextSeq,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    this.codes.set(newCode.id, newCode);
    return newCodeString;
  }

  // Games methods
  public getAllGames(): Game[] {
    const list = Array.from(this.games.values()).map(g => ({
      ...g,
      nextSequentialCode: this.getNextSequentialCodeForGame(g.id)
    }));
    return list.sort((a, b) => a.number - b.number);
  }

  public getGameById(id: string): Game | undefined {
    const game = this.games.get(id);
    if (!game) return undefined;
    return {
      ...game,
      nextSequentialCode: this.getNextSequentialCodeForGame(game.id)
    };
  }

  public createGame(gameData: Omit<Game, 'id' | 'number'>): Game {
    const allGames = Array.from(this.games.values());
    const nextNumber = allGames.length > 0 ? Math.max(...allGames.map(g => g.number)) + 1 : 1;
    const id = `game-${Date.now()}`;

    const prefix = (gameData.codePrefix || gameData.name || 'GAME')
      .replace(/[^a-zA-Zа-яА-Я0-9]/g, '')
      .substring(0, 5)
      .toUpperCase() || 'POINT';

    const newGame: Game = {
      ...gameData,
      id,
      number: nextNumber,
      codePrefix: prefix,
      hostName: gameData.hostName || 'Ведущий площадки',
      imageUrl: gameData.imageUrl || DEFAULT_GAME_CARD_IMAGE,
      mapX: typeof gameData.mapX === 'number' ? gameData.mapX : 50,
      mapY: typeof gameData.mapY === 'number' ? gameData.mapY : 50,
      status: gameData.status || 'active'
    };

    this.games.set(id, newGame);

    // Pre-create 500 sequential codes for this new game (scaled for large festival)
    for (let i = 1; i <= 500; i++) {
      const numStr = String(i).padStart(3, '0');
      const codeItem: Code = {
        id: `c-${id}-${i}`,
        code: `${prefix}-${numStr}`,
        gameId: id,
        sequenceNumber: i,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      this.codes.set(codeItem.id, codeItem);
    }

    newGame.nextSequentialCode = `${prefix}-001`;
    this.saveToFile();
    return newGame;
  }

  public updateGame(id: string, updates: Partial<Game>): Game | null {
    const existing = this.games.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.games.set(id, updated);
    this.saveToFile();
    return {
      ...updated,
      nextSequentialCode: this.getNextSequentialCodeForGame(id)
    };
  }

  public deleteGame(id: string): boolean {
    if (!this.games.has(id)) return false;
    this.games.delete(id);

    // Delete associated codes
    for (const [cId, code] of this.codes.entries()) {
      if (code.gameId === id) {
        this.codes.delete(cId);
      }
    }
    this.saveToFile();
    return true;
  }

  // Participants methods
  public getAllParticipants(): Participant[] {
    return Array.from(this.participants.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getParticipantById(id: string): Participant | undefined {
    return this.participants.get(id);
  }

  public findParticipants(query: string): Participant[] {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];

    const digitsOnly = q.replace(/\D/g, '');

    return Array.from(this.participants.values()).filter(p => {
      // Direct ID match
      if (p.id.toLowerCase() === q) return true;

      // Email match
      if (p.email && p.email.toLowerCase().includes(q)) return true;

      // Phone match
      if (digitsOnly.length >= 3 && p.phone) {
        const pDigits = p.phone.replace(/\D/g, '');
        if (pDigits.includes(digitsOnly) || digitsOnly.includes(pDigits)) {
          return true;
        }
      }

      // Name match
      if (p.name.toLowerCase().includes(q)) return true;

      // City or team match
      if (p.cityOrTeam && p.cityOrTeam.toLowerCase().includes(q)) return true;

      return false;
    });
  }

  public findParticipantForLogin(params: {
    query?: string;
    name?: string;
    email?: string;
    phone?: string;
  }): { participant?: Participant; matches: Participant[]; message?: string; requiresSelection?: boolean } {
    const trimmedName = (params.name || '').trim().toLowerCase();
    const trimmedEmail = (params.email || '').trim().toLowerCase();
    const phoneDigits = params.phone ? params.phone.replace(/\D/g, '') : '';
    const q = (params.query || '').trim();

    // 1. If user provided Name AND (Email or Phone) — precise lookup for family members / same-name cases
    if (trimmedName && (trimmedEmail || phoneDigits.length >= 4)) {
      const candidates = Array.from(this.participants.values());
      
      // Look for exact match on both Name and Email/Phone
      const exactMatch = candidates.find(p => {
        const pName = p.name.trim().toLowerCase();
        const pEmail = (p.email || '').trim().toLowerCase();
        const pPhone = (p.phone || '').replace(/\D/g, '');

        const nameMatches = pName === trimmedName || pName.includes(trimmedName) || trimmedName.includes(pName);
        if (!nameMatches) return false;

        if (trimmedEmail && pEmail && (pEmail === trimmedEmail || pEmail.includes(trimmedEmail))) {
          return true;
        }
        if (phoneDigits.length >= 4 && pPhone && (pPhone.includes(phoneDigits) || phoneDigits.includes(pPhone))) {
          return true;
        }
        return false;
      });

      if (exactMatch) {
        return { participant: exactMatch, matches: [exactMatch] };
      }

      // If exact pair not found, check if Email alone matches multiple family members
      if (trimmedEmail) {
        const familyMembers = candidates.filter(p => (p.email || '').trim().toLowerCase() === trimmedEmail);
        if (familyMembers.length > 0) {
          return {
            matches: familyMembers,
            requiresSelection: true,
            message: `По почте ${params.email} найдено членов семьи: ${familyMembers.length}. Пожалуйста, выберите ваш профиль:`
          };
        }
      }

      return {
        matches: [],
        message: 'Участник с указанными именем и почтой/телефоном не найден. Проверьте правильность или зарегистрируйтесь.'
      };
    }

    // 2. If single query provided (email, phone, name or ID)
    const searchQuery = q || params.name || params.email || params.phone || '';
    if (!searchQuery.trim()) return { matches: [] };

    const matches = this.findParticipants(searchQuery);
    if (matches.length === 0) {
      return { matches: [], message: 'Участник с такими данными не найден' };
    }

    // Direct exact email match check (could be multiple family members sharing the same email!)
    const queryLower = searchQuery.toLowerCase().trim();
    const emailMatches = matches.filter(p => (p.email || '').trim().toLowerCase() === queryLower);
    if (emailMatches.length === 1) {
      return { participant: emailMatches[0], matches: emailMatches };
    }
    if (emailMatches.length > 1) {
      // Multiple family members on the same email! Let user pick their name!
      return {
        matches: emailMatches,
        requiresSelection: true,
        message: `Почту ${searchQuery} используют несколько членов семьи. Выберите ваш профиль:`
      };
    }

    // Check for exact phone match
    const digitsOnly = searchQuery.replace(/\D/g, '');
    if (digitsOnly.length >= 7) {
      const phoneMatches = matches.filter(p => p.phone && p.phone.replace(/\D/g, '') === digitsOnly);
      if (phoneMatches.length === 1) {
        return { participant: phoneMatches[0], matches: phoneMatches };
      }
      if (phoneMatches.length > 1) {
        return {
          matches: phoneMatches,
          requiresSelection: true,
          message: 'На этот номер телефона зарегистрировано несколько членов семьи. Выберите ваш профиль:'
        };
      }
    }

    // Check for exact ID match
    const exactId = matches.find(p => p.id.toLowerCase() === queryLower);
    if (exactId) {
      return { participant: exactId, matches: [exactId] };
    }

    // Check for exact name match (case-insensitive)
    const exactNameMatches = matches.filter(p => p.name.trim().toLowerCase() === queryLower);
    if (exactNameMatches.length === 1) {
      return { participant: exactNameMatches[0], matches: exactNameMatches };
    }
    if (exactNameMatches.length > 1) {
      return {
        matches: exactNameMatches,
        requiresSelection: true,
        message: 'Найдено несколько участников с одинаковым именем. Выберите ваш профиль:'
      };
    }

    // If only one match overall
    if (matches.length === 1) {
      return { participant: matches[0], matches };
    }

    // Multiple matches: return them for user disambiguation
    return {
      matches,
      requiresSelection: true,
      message: 'Найдено несколько участников. Выберите ваш профиль:'
    };
  }

  public findExistingParticipant(name: string, email?: string, phone?: string): Participant | undefined {
    const trimmedName = (name || '').trim().toLowerCase();
    const trimmedEmail = (email || '').trim().toLowerCase();
    const phoneDigits = phone ? phone.replace(/\D/g, '') : '';

    if (!trimmedName) return undefined;

    for (const p of this.participants.values()) {
      const pName = p.name.trim().toLowerCase();
      const pEmail = (p.email || '').trim().toLowerCase();
      const pPhone = (p.phone || '').replace(/\D/g, '');

      // Check if both Name AND Email match
      if (trimmedEmail && pEmail && pName === trimmedName && pEmail === trimmedEmail) {
        return p;
      }

      // Check if both Name AND Phone match (phone >= 7 digits)
      if (phoneDigits.length >= 7 && pPhone && pName === trimmedName && pPhone === phoneDigits) {
        return p;
      }
    }
    return undefined;
  }

  public createParticipant(params: {
    name: string;
    email?: string;
    phone?: string;
    cityOrTeam?: string;
    id?: string;
    completedGames?: string[];
  }): Participant {
    const id = params.id || `p-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newParticipant: Participant = {
      id,
      name: params.name.trim(),
      email: params.email?.trim().toLowerCase() || undefined,
      phone: params.phone?.trim() || undefined,
      cityOrTeam: params.cityOrTeam?.trim() || undefined,
      completedGames: params.completedGames || [],
      createdAt: new Date().toISOString()
    };
    this.participants.set(id, newParticipant);
    this.saveToFile();
    return newParticipant;
  }

  public syncParticipant(participant: Participant): Participant {
    if (!participant || !participant.id) {
      throw new Error('Некорректные данные участника');
    }
    const existing = this.participants.get(participant.id);
    if (existing) {
      // Merge completedGames to avoid losing any completions
      const mergedGames = Array.from(new Set([...(existing.completedGames || []), ...(participant.completedGames || [])]));
      const updated: Participant = {
        ...existing,
        ...participant,
        name: participant.name || existing.name,
        email: participant.email || existing.email,
        phone: participant.phone || existing.phone,
        cityOrTeam: participant.cityOrTeam || existing.cityOrTeam,
        completedGames: mergedGames
      };
      this.participants.set(participant.id, updated);
      this.saveToFile();
      return updated;
    } else {
      // Restore participant into database
      const restored: Participant = {
        id: participant.id,
        name: participant.name.trim(),
        email: participant.email?.trim().toLowerCase() || undefined,
        phone: participant.phone?.trim() || undefined,
        cityOrTeam: participant.cityOrTeam?.trim() || undefined,
        completedGames: participant.completedGames || [],
        createdAt: participant.createdAt || new Date().toISOString(),
        lastCompletedGame: participant.lastCompletedGame,
        lastCompletedAt: participant.lastCompletedAt
      };
      this.participants.set(participant.id, restored);
      this.saveToFile();
      return restored;
    }
  }

  // Sequential Code Verification
  public verifyGameCode(participantId: string, rawCode: string): VerifyCodeResponse {
    const trimmedCode = (rawCode || '').trim().toUpperCase();

    // 1. Check code existence
    const codeEntry = Array.from(this.codes.values()).find(
      c => c.code.toUpperCase() === trimmedCode
    );

    if (!codeEntry) {
      return {
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Код не найден. Уточните проверочный код у ведущего точки.'
      };
    }

    // 2. Check if code is already used (Strict sequential rule!)
    if (codeEntry.status === 'used') {
      const nextSeq = this.getNextSequentialCodeForGame(codeEntry.gameId);
      return {
        success: false,
        errorCode: 'ALREADY_USED',
        message: `Этот код (${trimmedCode}) уже использован предыдущим участником. Обратитесь к ведущему за актуальным кодом (следующий код: ${nextSeq}).`
      };
    }

    // 3. Find Game
    const game = this.games.get(codeEntry.gameId);
    if (!game) {
      return {
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Игровая точка для этого кода не найдена.'
      };
    }

    if (game.status === 'inactive') {
      return {
        success: false,
        errorCode: 'GAME_INACTIVE',
        message: 'Игровая точка временно не активна.'
      };
    }

    // 4. Find Participant
    let participant = this.participants.get(participantId);
    if (!participant) {
      participant = {
        id: participantId,
        name: 'Участник',
        completedGames: [],
        createdAt: new Date().toISOString()
      };
      this.participants.set(participantId, participant);
    }

    // 5. Check if already completed by this participant
    if (participant.completedGames.includes(game.id)) {
      return {
        success: false,
        errorCode: 'ALREADY_COMPLETED',
        message: `Точка «${game.name}» уже отмечена в вашем маршрутном листе как пройденная.`
      };
    }

    // 6. Complete game atomically
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    // Mark code as used
    codeEntry.status = 'used';
    codeEntry.usedBy = participant.id;
    codeEntry.usedAt = now.toISOString();
    this.codes.set(codeEntry.id, codeEntry);

    // Update participant
    participant.completedGames.push(game.id);
    participant.lastCompletedGame = game.name;
    participant.lastCompletedAt = timeFormatted;
    this.participants.set(participant.id, participant);

    // Add completion record
    const completion: GameCompletion = {
      id: `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      participantId: participant.id,
      participantName: participant.name,
      gameId: game.id,
      gameName: game.name,
      codeId: codeEntry.id,
      codeString: codeEntry.code,
      completedAt: now.toISOString()
    };
    this.completions.push(completion);
    this.saveToFile();

    const nextCodeForGame = this.getNextSequentialCodeForGame(game.id);
    const totalActiveGames = Array.from(this.games.values()).filter(g => g.status === 'active').length;

    return {
      success: true,
      gameId: game.id,
      gameName: game.name,
      nextSequentialCode: nextCodeForGame,
      message: `Испытание «${game.name}» успешно пройдено!`,
      progress: {
        completedCount: participant.completedGames.length,
        totalCount: totalActiveGames,
        completedGames: [...participant.completedGames]
      }
    };
  }

  // Code Generation
  public generateCodes(gameId: string, count: number): Code[] {
    const game = this.games.get(gameId);
    if (!game) throw new Error('Game not found');

    const prefix = game.codePrefix || 'GAME';
    const existingCodes = Array.from(this.codes.values()).filter(c => c.gameId === gameId);
    const highestSeq = existingCodes.reduce((max, c) => Math.max(max, c.sequenceNumber || 0), 0);

    const generated: Code[] = [];
    for (let i = 1; i <= count; i++) {
      const seq = highestSeq + i;
      const numStr = String(seq).padStart(3, '0');
      const codeString = `${prefix}-${numStr}`;
      const newCode: Code = {
        id: `c-${game.id}-${seq}-${Date.now().toString(36)}`,
        code: codeString,
        gameId: game.id,
        sequenceNumber: seq,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      this.codes.set(newCode.id, newCode);
      generated.push(newCode);
    }
    this.saveToFile();

    return generated;
  }

  public getAllCodes(gameId?: string): Code[] {
    const list = Array.from(this.codes.values());
    if (gameId) {
      return list.filter(c => c.gameId === gameId).sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getCompletionsByParticipant(participantId: string): GameCompletion[] {
    return this.completions
      .filter(c => c.participantId === participantId)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }

  public getAdminStats(): AdminStats {
    const allParticipants = Array.from(this.participants.values());
    const allGames = Array.from(this.games.values());
    const activeGames = allGames.filter(g => g.status === 'active');
    const allCodes = Array.from(this.codes.values());

    const gameCompletionCounts: Record<string, { name: string; count: number }> = {};
    for (const cmp of this.completions) {
      if (!gameCompletionCounts[cmp.gameId]) {
        gameCompletionCounts[cmp.gameId] = {
          name: cmp.gameName || 'Игра',
          count: 0
        };
      }
      gameCompletionCounts[cmp.gameId].count++;
    }

    let mostPopularGame: { gameId: string; gameName: string; count: number } | null = null;
    let maxCount = -1;
    for (const [gid, val] of Object.entries(gameCompletionCounts)) {
      if (val.count > maxCount) {
        maxCount = val.count;
        mostPopularGame = {
          gameId: gid,
          gameName: val.name,
          count: val.count
        };
      }
    }

    const totalCompletions = this.completions.length;
    const avgGames = allParticipants.length > 0
      ? Math.round((totalCompletions / allParticipants.length) * 10) / 10
      : 0;

    const gameCodesSummary: Record<string, { total: number; active: number; used: number; nextActiveCode?: string }> = {};
    for (const g of allGames) {
      gameCodesSummary[g.id] = { total: 0, active: 0, used: 0 };
    }
    for (const c of allCodes) {
      if (!gameCodesSummary[c.gameId]) {
        gameCodesSummary[c.gameId] = { total: 0, active: 0, used: 0 };
      }
      gameCodesSummary[c.gameId].total++;
      if (c.status === 'active') {
        gameCodesSummary[c.gameId].active++;
      } else {
        gameCodesSummary[c.gameId].used++;
      }
    }
    for (const g of allGames) {
      const activeCodes = allCodes
        .filter(c => c.gameId === g.id && c.status === 'active')
        .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
      if (activeCodes.length > 0) {
        gameCodesSummary[g.id].nextActiveCode = activeCodes[0].code;
      }
    }

    return {
      totalParticipants: allParticipants.length,
      totalGames: allGames.length,
      activeGames: activeGames.length,
      totalCompletions,
      mostPopularGame,
      avgGamesPerParticipant: avgGames,
      totalCodesGenerated: allCodes.length,
      totalCodesUsed: allCodes.filter(c => c.status === 'used').length,
      gameCodesSummary
    };
  }

  public deleteParticipant(id: string): boolean {
    const existed = this.participants.delete(id);
    if (existed) {
      this.completions = this.completions.filter(c => c.participantId !== id);
      this.saveToFile();
    }
    return existed;
  }

  public resetVenue(mode: 'cleanAll' | 'resetProgressOnly' = 'cleanAll'): void {
    if (mode === 'cleanAll') {
      // Clear all participants so they can re-register from scratch on new venue
      this.participants.clear();
    } else {
      // Keep participants, but reset completedGames to [] and clear latest completion stamps
      for (const p of this.participants.values()) {
        p.completedGames = [];
        delete p.lastCompletedGame;
        delete p.lastCompletedAt;
      }
    }

    // Reset all completions
    this.completions = [];

    // Reset all codes: set all codes back to active status (starting from 001)
    for (const c of this.codes.values()) {
      c.status = 'active';
    }

    // Ensure all 22 games have full 500 sequential codes starting from 1
    this.ensureCodesPerGame(500);

    this.saveToFile();
  }

  public resetToClean(): void {
    this.games.clear();
    this.codes.clear();
    this.participants.clear();
    this.completions = [];
    this.seed();
    this.saveToFile();
  }

  public getMapBackgroundUrl(): string {
    return this.mapBackgroundUrl || '';
  }

  public setMapBackgroundUrl(url: string): string {
    this.mapBackgroundUrl = (url || '').trim();
    this.saveToFile();
    return this.mapBackgroundUrl;
  }

  public getCircleSettings(): MapCircleSettings {
    return { ...this.circleSettings };
  }

  public setCircleSettings(settings: Partial<MapCircleSettings>): MapCircleSettings {
    this.circleSettings = {
      ...this.circleSettings,
      ...settings
    };
    this.saveToFile();
    return { ...this.circleSettings };
  }
}

export const db = new InMemoryDatabase();
