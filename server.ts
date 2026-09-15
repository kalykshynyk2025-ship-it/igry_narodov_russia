import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { db } from './server/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads folder exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Serve uploaded images statically
  app.use('/uploads', express.static(uploadsDir));

  // API Routes
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // --- IMAGE UPLOAD ROUTE ---
  app.post('/api/upload', async (req: Request, res: Response) => {
    try {
      const { image, filename } = req.body;
      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'Изображение не передано' });
      }

      // Check if image is base64 data URL
      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let extension = 'jpg';

      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        buffer = Buffer.from(matches[2], 'base64');
        if (mimeType.includes('png')) extension = 'png';
        else if (mimeType.includes('webp')) extension = 'webp';
        else if (mimeType.includes('gif')) extension = 'gif';
        else extension = 'jpg';
      } else {
        // Raw base64 string
        buffer = Buffer.from(image, 'base64');
      }

      const safeBaseName = (filename || 'photo').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
      const uniqueFileName = `${safeBaseName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;
      const filePath = path.join(uploadsDir, uniqueFileName);

      await fs.promises.writeFile(filePath, buffer);

      const publicUrl = `/uploads/${uniqueFileName}`;
      return res.status(201).json({
        success: true,
        url: publicUrl,
        filename: uniqueFileName,
        size: buffer.length
      });
    } catch (err: any) {
      console.error('Error in /api/upload:', err);
      res.status(500).json({ error: 'Не удалось сохранить изображение: ' + err.message });
    }
  });

  // --- IMAGE RESOLVE / YANDEX DISK CONVERTER ROUTE ---
  app.post('/api/resolve-image', async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL не указан' });
      }

      const trimmedUrl = url.trim();

      // Check if it is a Yandex.Disk share link
      if (trimmedUrl.includes('disk.yandex.ru') || trimmedUrl.includes('yadi.sk')) {
        try {
          const yandexApiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(trimmedUrl)}`;
          const metaRes = await fetch(yandexApiUrl);
          
          if (!metaRes.ok) {
            return res.status(400).json({
              error: 'Не удалось получить данные с Яндекс.Диска. Убедитесь, что ссылка является публичной.'
            });
          }

          const metaData: any = await metaRes.json();
          
          // Select highest quality preview or file url
          const bestSize = metaData.sizes?.find((s: any) => s.name === 'XXL') ||
            metaData.sizes?.find((s: any) => s.name === 'XL') ||
            metaData.sizes?.find((s: any) => s.name === 'L') ||
            metaData.sizes?.find((s: any) => s.name === 'DEFAULT') ||
            metaData.sizes?.[0];

          const downloadUrl = bestSize?.url || metaData.file;
          if (!downloadUrl) {
            return res.status(400).json({ error: 'Не удалось получить ссылку на файл на Яндекс.Диске' });
          }

          const imgRes = await fetch(downloadUrl);
          if (!imgRes.ok) {
            return res.status(400).json({ error: 'Не удалось скачать изображение с Яндекс.Диска' });
          }

          const arrayBuffer = await imgRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const safeName = (metaData.name || 'yandex_photo').replace(/[^a-zA-Z0-9._-]/g, '_');
          const ext = safeName.includes('.') ? safeName.split('.').pop() : 'jpg';
          const savedFileName = `yandex_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
          const filePath = path.join(uploadsDir, savedFileName);

          await fs.promises.writeFile(filePath, buffer);

          return res.json({
            success: true,
            url: `/uploads/${savedFileName}`,
            originalName: metaData.name || 'Фото с Яндекс.Диска',
            size: buffer.length
          });
        } catch (yandexErr: any) {
          console.error('Yandex Disk resolution error:', yandexErr);
          return res.status(500).json({
            error: 'Ошибка при скачивании с Яндекс.Диска: ' + yandexErr.message
          });
        }
      }

      // Check if it's already a direct image URL or already an upload
      if (trimmedUrl.startsWith('/uploads/') || trimmedUrl.startsWith('data:image/')) {
        return res.json({ success: true, url: trimmedUrl });
      }

      // For other external URLs, try to download and cache locally so it won't break
      if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
        try {
          const directRes = await fetch(trimmedUrl);
          const contentType = directRes.headers.get('content-type') || '';
          if (contentType.startsWith('image/')) {
            const arrayBuffer = await directRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
            const savedFileName = `external_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
            await fs.promises.writeFile(path.join(uploadsDir, savedFileName), buffer);
            return res.json({ success: true, url: `/uploads/${savedFileName}` });
          }
        } catch {
          // If fetching fails, just return original url
        }
        return res.json({ success: true, url: trimmedUrl });
      }

      return res.status(400).json({ error: 'Неподдерживаемый формат ссылки' });
    } catch (err: any) {
      console.error('Error in /api/resolve-image:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- ADMIN AUTH ROUTE ---
  app.post('/api/admin/login', (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      // User credential specification: admin / kalyk2025
      if (username === 'admin' && password === 'kalyk2025') {
        return res.json({
          success: true,
          token: 'token_admin_' + Date.now(),
          user: { username: 'admin', role: 'administrator' }
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Неверный логин или пароль администратора'
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- GAMES ROUTES ---
  app.get('/api/games', (req: Request, res: Response) => {
    try {
      const games = db.getAllGames();
      res.json(games);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/games/:id', (req: Request, res: Response) => {
    try {
      const game = db.getGameById(req.params.id);
      if (!game) {
        return res.status(404).json({ error: 'Игра не найдена' });
      }
      res.json(game);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/games', (req: Request, res: Response) => {
    try {
      const {
        name,
        people,
        description,
        rules,
        participants,
        equipment,
        location,
        status,
        category,
        imageUrl,
        hostName,
        codePrefix,
        mapX,
        mapY
      } = req.body;

      if (!name || !people) {
        return res.status(400).json({ error: 'Название игры и народ обязательны' });
      }

      const newGame = db.createGame({
        name,
        people,
        description: description || '',
        rules: rules || '',
        participants: participants || 'Несколько',
        equipment: equipment || 'Не требуется',
        location: location || 'Площадка фестиваля',
        status: status || 'active',
        category: category || 'Общие',
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=800&auto=format&fit=crop&q=80',
        hostName: hostName || 'Ведущий площадки',
        codePrefix: codePrefix || '',
        mapX: typeof mapX === 'number' ? mapX : 50,
        mapY: typeof mapY === 'number' ? mapY : 50
      });

      res.status(201).json(newGame);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/games/:id', (req: Request, res: Response) => {
    try {
      const updated = db.updateGame(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Игра не найдена' });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/games/:id', (req: Request, res: Response) => {
    try {
      const success = db.deleteGame(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Игра не найдена' });
      }
      res.json({ success: true, message: 'Игровая точка успешно удалена' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- PARTICIPANTS ROUTES ---
  app.get('/api/participants', (req: Request, res: Response) => {
    try {
      const participants = db.getAllParticipants();
      res.json(participants);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Participant Login / Find by (name + email/phone) or single search query
  app.post('/api/participants/login', (req: Request, res: Response) => {
    try {
      const { query, name, email, phone } = req.body;
      const searchParams = {
        query: typeof query === 'string' ? query.trim() : undefined,
        name: typeof name === 'string' ? name.trim() : undefined,
        email: typeof email === 'string' ? email.trim() : undefined,
        phone: typeof phone === 'string' ? phone.trim() : undefined
      };

      if (!searchParams.query && !searchParams.name && !searchParams.email && !searchParams.phone) {
        return res.status(400).json({
          success: false,
          error: 'Укажите данные для входа (имя и почту/телефон или поисковый запрос)'
        });
      }

      const result = db.findParticipantForLogin(searchParams);
      if (result.participant) {
        return res.json({
          success: true,
          participant: result.participant,
          matches: result.matches
        });
      }

      if (result.matches && result.matches.length > 0) {
        return res.json({
          success: true,
          requiresSelection: true,
          matches: result.matches,
          message: result.message
        });
      }

      return res.status(404).json({
        success: false,
        error: result.message || 'Участник не найден. Проверьте правильность ввода или зарегистрируйтесь.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Check if participant already exists by name/email/phone
  app.post('/api/participants/check', (req: Request, res: Response) => {
    try {
      const { name, email, phone } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Имя не указано' });
      }

      const existing = db.findExistingParticipant(name, email, phone);
      if (existing) {
        return res.json({
          exists: true,
          participant: existing
        });
      }

      return res.json({ exists: false, participant: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/participants', (req: Request, res: Response) => {
    try {
      const { name, email, phone, cityOrTeam, checkExisting, forceNew } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Имя обязательно для регистрации' });
      }

      // If user wants to check if already registered, prevent accidental loss of data
      if (checkExisting && !forceNew) {
        const existing = db.findExistingParticipant(name, email, phone);
        if (existing) {
          return res.status(200).json({
            alreadyExists: true,
            participant: existing,
            message: `Участник «${existing.name}» уже зарегистрирован с этими данными. Чтобы не потерять ваши пройденные игры, войдите в существующий профиль.`
          });
        }
      }

      const participant = db.createParticipant({ name, email, phone, cityOrTeam });
      res.status(201).json(participant);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Sync participant from client local storage (ensures registration never disappears)
  app.post('/api/participants/sync', (req: Request, res: Response) => {
    try {
      const { participant } = req.body;
      if (!participant || !participant.id || !participant.name) {
        return res.status(400).json({ error: 'Некорректные данные участника' });
      }

      const synced = db.syncParticipant(participant);
      res.json({ success: true, participant: synced });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/participants/:id', (req: Request, res: Response) => {
    try {
      const participant = db.getParticipantById(req.params.id);
      if (!participant) {
        return res.status(404).json({ error: 'Участник не найден' });
      }
      res.json(participant);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/participants/:id/progress', (req: Request, res: Response) => {
    try {
      const participant = db.getParticipantById(req.params.id);
      if (!participant) {
        return res.status(404).json({ error: 'Участник не найден' });
      }
      const allGames = db.getAllGames();
      const activeGames = allGames.filter(g => g.status === 'active');
      const completedList = participant.completedGames || [];

      res.json({
        participantId: participant.id,
        participantName: participant.name,
        completedCount: completedList.length,
        totalActiveGames: activeGames.length,
        totalGames: allGames.length,
        percentage: Math.round((completedList.length / Math.max(1, activeGames.length)) * 100),
        completedGames: completedList
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- CODES ROUTES ---
  app.post('/api/codes/verify', (req: Request, res: Response) => {
    try {
      const { participantId, code } = req.body;
      if (!participantId || !code) {
        return res.status(400).json({
          success: false,
          errorCode: 'NOT_FOUND',
          message: 'Укажите идентификатор участника и проверочный код'
        });
      }

      const result = db.verifyGameCode(participantId, code);
      return res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: 'Ошибка сервера при проверке кода',
        error: err.message
      });
    }
  });

  app.get('/api/codes', (req: Request, res: Response) => {
    try {
      const gameId = req.query.gameId as string | undefined;
      const codes = db.getAllCodes(gameId);
      res.json(codes);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/codes/generate', (req: Request, res: Response) => {
    try {
      const { gameId, count } = req.body;
      if (!gameId) {
        return res.status(400).json({ error: 'Выберите игру' });
      }
      const numCount = Math.min(Math.max(1, parseInt(count, 10) || 10), 500);
      const generated = db.generateCodes(gameId, numCount);
      res.status(201).json({ count: generated.length, codes: generated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Ensure 500 sequential codes for all games
  app.post('/api/codes/ensure-500', (req: Request, res: Response) => {
    try {
      const added = db.ensureCodesPerGame(500);
      res.json({ success: true, added, totalCodes: db.getAllCodes().length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- ADMIN STATS & HISTORY ROUTES ---
  app.get('/api/admin/stats', (req: Request, res: Response) => {
    try {
      const stats = db.getAdminStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/participants/:id/history', (req: Request, res: Response) => {
    try {
      const completions = db.getCompletionsByParticipant(req.params.id);
      res.json(completions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/participants/:id', (req: Request, res: Response) => {
    try {
      const success = db.deleteParticipant(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Участник не найден' });
      }
      res.json({ success: true, message: 'Участник удален' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/reset', (req: Request, res: Response) => {
    try {
      const { password, mode } = req.body || {};
      if (password !== 'kalyk2025shynyk') {
        return res.status(403).json({
          error: 'Неверный пароль подтверждения. Для сброса фестиваля требуется специальный пароль администратора.'
        });
      }

      const resetMode = mode === 'resetProgressOnly' ? 'resetProgressOnly' : 'cleanAll';
      db.resetVenue(resetMode);
      res.json({
        success: true,
        message: resetMode === 'cleanAll'
          ? 'Фестиваль полностью сброшен для новой площадки. Все игры и коды на нулевой позиции.'
          : 'Прогресс игр и коды сброшены. Участники могут проходить игры заново с 0.'
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- MAP BACKGROUND & CIRCLE SETTINGS ---
  app.get('/api/settings/map', (req: Request, res: Response) => {
    try {
      const mapBackgroundUrl = db.getMapBackgroundUrl();
      const circleSettings = db.getCircleSettings();
      res.json({ mapBackgroundUrl, circleSettings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/map-settings', (req: Request, res: Response) => {
    try {
      const { mapBackgroundUrl, circleSettings } = req.body || {};
      let savedUrl = db.getMapBackgroundUrl();
      if (typeof mapBackgroundUrl === 'string') {
        savedUrl = db.setMapBackgroundUrl(mapBackgroundUrl);
      }
      let savedCircle = db.getCircleSettings();
      if (circleSettings && typeof circleSettings === 'object') {
        savedCircle = db.setCircleSettings(circleSettings);
      }
      res.json({ success: true, mapBackgroundUrl: savedUrl, circleSettings: savedCircle });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/map-circle', (req: Request, res: Response) => {
    try {
      const circleSettings = req.body || {};
      const savedCircle = db.setCircleSettings(circleSettings);
      res.json({ success: true, circleSettings: savedCircle });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/map-background', (req: Request, res: Response) => {
    try {
      const { mapBackgroundUrl } = req.body || {};
      const savedUrl = db.setMapBackgroundUrl(mapBackgroundUrl || '');
      res.json({ success: true, mapBackgroundUrl: savedUrl, circleSettings: db.getCircleSettings() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/map-background', (req: Request, res: Response) => {
    try {
      db.setMapBackgroundUrl('');
      res.json({ success: true, mapBackgroundUrl: '', circleSettings: db.getCircleSettings() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- LOCAL NETWORK & QR CODE ASSISTANT FOR OFFLINE DEPLOYMENT ---
  app.get('/api/admin/network-info', (req: Request, res: Response) => {
    try {
      const interfaces = os.networkInterfaces();
      const addresses: { iface: string; address: string; family: string }[] = [];
      for (const name of Object.keys(interfaces)) {
        const ifaceList = interfaces[name];
        if (ifaceList) {
          for (const iface of ifaceList) {
            if (iface.family === 'IPv4' && !iface.internal) {
              addresses.push({
                iface: name,
                address: iface.address,
                family: iface.family,
              });
            }
          }
        }
      }
      res.json({
        port: PORT,
        addresses,
        hostname: os.hostname(),
        platform: os.platform(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- VITE MIDDLEWARE OR STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
