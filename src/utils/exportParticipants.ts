import { Participant, Game } from '../types';

export function downloadParticipantsJSON(participants: Participant[], games: Game[]): void {
  const gamesMap = new Map(games.map(g => [g.id, `#${g.number} ${g.name}`]));

  const exportData = {
    festival: 'Игры Народов России',
    exportedAt: new Date().toISOString(),
    totalParticipants: participants.length,
    participants: participants.map(p => {
      const completedGamesList = (p.completedGames || []).map(gid => gamesMap.get(gid) || gid);
      return {
        id: p.id,
        name: p.name,
        email: p.email || '',
        phone: p.phone || '',
        cityOrTeam: p.cityOrTeam || '',
        completedCount: p.completedGames?.length || 0,
        totalGames: games.length,
        completionPercent: games.length > 0 ? Math.round(((p.completedGames?.length || 0) / games.length) * 100) : 0,
        completedGames: completedGamesList,
        registeredAt: p.createdAt ? new Date(p.createdAt).toLocaleString('ru-RU') : ''
      };
    })
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  triggerDownload(blob, `uchastniki_festivalya_${getTimestampString()}.json`);
}

export function downloadParticipantsCSV(participants: Participant[], games: Game[]): void {
  const gamesMap = new Map(games.map(g => [g.id, `#${g.number} ${g.name}`]));

  const headers = [
    'ID',
    'Имя участника',
    'Email',
    'Телефон',
    'Город / Команда',
    'Пройдено игр',
    'Всего игр',
    'Процент (%)',
    'Список пройденных игр',
    'Дата регистрации'
  ];

  const escapeCSV = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = participants.map(p => {
    const completedCount = p.completedGames?.length || 0;
    const percent = games.length > 0 ? Math.round((completedCount / games.length) * 100) : 0;
    const completedGamesList = (p.completedGames || [])
      .map(gid => gamesMap.get(gid) || gid)
      .join('; ');
    const registeredDate = p.createdAt ? new Date(p.createdAt).toLocaleString('ru-RU') : '';

    return [
      escapeCSV(p.id),
      escapeCSV(p.name),
      escapeCSV(p.email),
      escapeCSV(p.phone),
      escapeCSV(p.cityOrTeam),
      escapeCSV(completedCount),
      escapeCSV(games.length),
      escapeCSV(`${percent}%`),
      escapeCSV(completedGamesList),
      escapeCSV(registeredDate)
    ].join(';');
  });

  // UTF-8 BOM (\uFEFF) ensures Excel and Numbers properly render Cyrillic characters
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `uchastniki_festivalya_${getTimestampString()}.csv`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getTimestampString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}_${hh}-${mm}`;
}
