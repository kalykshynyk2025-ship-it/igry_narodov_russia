import React, { useState } from 'react';
import { User, Phone, MapPin, ArrowRight, ShieldCheck, LogIn, UserPlus, Search, CheckCircle2, AlertTriangle, X, Mail, Users, Shield, Lock, AlertCircle, Eye } from 'lucide-react';
import { Participant } from '../types';
import { api } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onSelectParticipant: (participant: Participant) => void;
  onRegister: (
    name: string,
    email?: string,
    phone?: string,
    cityOrTeam?: string,
    options?: { forceNew?: boolean }
  ) => Promise<Participant>;
  onClose?: () => void;
  canClose?: boolean;
  participants?: Participant[];
  totalGamesCount?: number;
  onAdminSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onSelectParticipant,
  onRegister,
  onClose,
  canClose = false,
  participants = [],
  totalGamesCount = 15,
  onAdminSuccess
}) => {
  // Tabs: 'login' (Вход), 'register' (Регистрация), 'admin' (Вход для администратора)
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'admin'>('login');

  // Login form state
  const [loginName, setLoginName] = useState('');
  const [loginEmailOrPhone, setLoginEmailOrPhone] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSelectionMessage, setLoginSelectionMessage] = useState<string | null>(null);
  const [matchedParticipants, setMatchedParticipants] = useState<Participant[]>([]);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCityOrTeam, setRegCityOrTeam] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [existingMatch, setExistingMatch] = useState<Participant | null>(null);
  const [familyMatchName, setFamilyMatchName] = useState<string | null>(null);

  // Admin form state
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  if (!isOpen) return null;

  // Handle Admin Submit
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminLoading(true);
    try {
      const res = await api.adminLogin(adminUsername.trim(), adminPassword);
      if (res.success) {
        if (onAdminSuccess) {
          onAdminSuccess();
        }
        if (onClose) {
          onClose();
        }
      } else {
        setAdminError(res.error || 'Неверный логин или пароль администратора');
      }
    } catch {
      setAdminError('Ошибка авторизации. Проверьте соединение.');
    } finally {
      setAdminLoading(false);
    }
  };

  // Check on registration form if name/email/phone already exists
  const checkForDuplicate = (nameVal: string, emailVal: string, phoneVal: string) => {
    const trimmedName = nameVal.trim().toLowerCase();
    const trimmedEmail = emailVal.trim().toLowerCase();
    const digits = phoneVal.replace(/\D/g, '');

    if (!trimmedName && !trimmedEmail && digits.length < 5) {
      setExistingMatch(null);
      setFamilyMatchName(null);
      return;
    }

    // Exact duplicate check (same person: same name and same email/phone)
    const exact = participants.find(p => {
      const pName = p.name.trim().toLowerCase();
      const pEmail = (p.email || '').trim().toLowerCase();
      const pPhone = (p.phone || '').replace(/\D/g, '');

      // Name matches AND (email matches OR phone matches)
      if (trimmedName && pName === trimmedName) {
        if (trimmedEmail && pEmail && pEmail === trimmedEmail) return true;
        if (digits.length >= 7 && pPhone && pPhone === digits) return true;
      }
      return false;
    });

    if (exact) {
      setExistingMatch(exact);
      setFamilyMatchName(null);
      return;
    }

    setExistingMatch(null);

    // Family check: same email, but different name (encouraging notice)
    if (trimmedEmail) {
      const familyMember = participants.find(p => {
        const pEmail = (p.email || '').trim().toLowerCase();
        const pName = p.name.trim().toLowerCase();
        return pEmail === trimmedEmail && pName !== trimmedName;
      });
      if (familyMember) {
        setFamilyMatchName(familyMember.name);
        return;
      }
    }

    setFamilyMatchName(null);
  };

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = loginName.trim();
    const contact = loginEmailOrPhone.trim();

    if (!name && !contact) {
      setLoginError('Пожалуйста, введите ваше имя и/или электронную почту (телефон)');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);
    setLoginSelectionMessage(null);
    setMatchedParticipants([]);

    try {
      const isEmail = contact.includes('@');
      const res = await api.loginParticipant({
        name: name || undefined,
        email: isEmail ? contact.toLowerCase() : undefined,
        phone: !isEmail && contact ? contact : undefined,
        query: contact || name
      });

      if (res.success && res.participant) {
        onSelectParticipant(res.participant);
        if (onClose) onClose();
      } else if (res.matches && res.matches.length > 0) {
        setMatchedParticipants(res.matches);
        setLoginSelectionMessage(
          res.message ||
          (res.matches.length > 1
            ? `Найдено участников: ${res.matches.length}. Выберите нужный профиль:`
            : 'Пожалуйста, выберите ваш профиль:')
        );
      } else {
        setLoginError(
          res.error ||
          'Участник не найден. Проверьте правильность введённых данных или создайте новый профиль в разделе «Регистрация».'
        );
      }
    } catch {
      setLoginError('Ошибка при проверке данных. Пожалуйста, попробуйте снова.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent, forceNew = false) => {
    e.preventDefault();
    if (!regName.trim()) {
      setRegError('Пожалуйста, укажите ваше имя или позывной');
      return;
    }

    // If exact duplicate detected and not forced, stop and prompt to log in instead
    if (existingMatch && !forceNew) {
      setRegError('Этот участник уже зарегистрирован! Нажмите «Войти в профиль», чтобы не потерять данные.');
      return;
    }

    setRegLoading(true);
    setRegError(null);

    try {
      const participant = await onRegister(regName, regEmail, regPhone, regCityOrTeam, { forceNew });
      onSelectParticipant(participant);
      if (onClose) onClose();
    } catch {
      setRegError('Не удалось зарегистрироваться. Пожалуйста, попробуйте снова.');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={() => {
        if (onClose) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner Header */}
        <div className="p-5 sm:p-6 bg-gray-900 text-white relative border-b border-gray-800">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              id="auth-modal-collapse-header-btn"
              className="absolute right-4 top-4 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-semibold"
              title="Свернуть окно и посмотреть карточки игр и схему точек"
            >
              <span>Свернуть</span>
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center shadow-md text-white font-bold text-xl border border-red-500 font-serif shrink-0">
              ИР
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight">
                Игры народов России
              </h1>
              <p className="text-xs text-gray-300">
                Маршрутный лист и личный кабинет участника квеста
              </p>
            </div>
          </div>

          {/* Mode Tabs (Вход / Регистрация / Администратор) */}
          <div className="grid grid-cols-3 gap-1.5 mt-5 p-1 bg-gray-800/80 rounded-2xl border border-gray-700/50">
            <button
              type="button"
              id="auth-tab-login"
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
                setLoginSelectionMessage(null);
                setMatchedParticipants([]);
              }}
              className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Войти</span>
            </button>

            <button
              type="button"
              id="auth-tab-register"
              onClick={() => {
                setActiveTab('register');
                setRegError(null);
              }}
              className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="truncate">Регистрация</span>
            </button>

            <button
              type="button"
              id="auth-tab-admin"
              onClick={() => {
                setActiveTab('admin');
                setAdminError(null);
              }}
              className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Админ</span>
            </button>
          </div>
        </div>

        {/* Tab 1: ВХОД (ДЛЯ ТЕХ КТО УЖЕ ЗАРЕГИСТРИРОВАН) */}
        {activeTab === 'login' && (
          <div className="p-5 sm:p-6 space-y-4">
            {/* Family & Data safety banner */}
            <div className="p-3 bg-red-50/70 border border-red-100 rounded-2xl flex items-start gap-3">
              <Users className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-700 leading-relaxed">
                <span className="font-bold text-gray-900 block mb-0.5">Вход для участников и семей:</span>
                Введите ваше <strong>имя</strong> и <strong>почту или телефон</strong>. Если вы участвуете семьёй с одной общей почтой — система покажет всех членов семьи для удобного выбора!
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              {/* Field 1: Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                  Имя участника
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="login-name-input"
                    value={loginName}
                    onChange={(e) => {
                      setLoginName(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="Например: Александр или Мария"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-gray-50 border border-gray-300 focus:border-red-600 focus:bg-white focus:outline-none text-sm text-gray-900 transition-colors"
                  />
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  {loginName && (
                    <button
                      type="button"
                      onClick={() => setLoginName('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Field 2: Email or Phone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                  Электронная почта или телефон
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="login-contact-input"
                    value={loginEmailOrPhone}
                    onChange={(e) => {
                      setLoginEmailOrPhone(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="family@mail.ru или +7 (999) 000-00-00"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-gray-50 border border-gray-300 focus:border-red-600 focus:bg-white focus:outline-none text-sm text-gray-900 transition-colors"
                  />
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  {loginEmailOrPhone && (
                    <button
                      type="button"
                      onClick={() => setLoginEmailOrPhone('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Можно указать оба поля для точного поиска, либо только имя / почту.
                </div>
              </div>

              {loginError && (
                <div className="text-xs text-red-600 font-medium px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                id="login-submit-btn"
                disabled={loginLoading || (!loginName.trim() && !loginEmailOrPhone.trim())}
                className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer mt-1"
              >
                <LogIn className="w-4 h-4" />
                <span>{loginLoading ? 'Поиск профиля...' : 'Найти и войти в профиль'}</span>
              </button>
            </form>

            {/* Prompt when multiple family members / matches need selection */}
            {matchedParticipants.length > 0 && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2.5 animate-in fade-in">
                <div className="text-xs font-bold text-amber-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{loginSelectionMessage || 'Выберите ваш профиль из списка:'}</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {matchedParticipants.map(p => {
                    const doneCount = p.completedGames.length;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          onSelectParticipant(p);
                          if (onClose) onClose();
                        }}
                        className="p-2.5 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-200 flex items-center justify-between gap-2.5 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {p.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-red-700 truncate">
                              {p.name}
                            </div>
                            <div className="text-[11px] text-gray-500 truncate flex items-center gap-2">
                              {p.email && <span>{p.email}</span>}
                              {p.phone && <span>{p.phone}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
                            {doneCount} / {totalGamesCount}
                          </span>
                          <span className="text-xs font-bold text-red-600 group-hover:underline">
                            Войти →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Switch links: Register & Admin */}
            <div className="pt-2 border-t border-gray-100 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setRegError(null);
                }}
                className="text-xs text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Ещё не регистрировались? Создать новый профиль</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  id="auth-collapse-login-btn"
                  className="w-full py-2.5 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 hover:text-gray-900 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs mt-1"
                >
                  <Eye className="w-4 h-4 text-red-600" />
                  <span>Свернуть и посмотреть карточки игр и схему точек</span>
                </button>
              )}

              <button
                type="button"
                id="auth-switch-to-admin-btn"
                onClick={() => {
                  setActiveTab('admin');
                  setAdminError(null);
                }}
                className="text-[11px] text-gray-400 hover:text-red-600 inline-flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-gray-50"
              >
                <Shield className="w-3.5 h-3.5 text-gray-400" />
                <span>Вход для администратора / ведущего</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: РЕГИСТРАЦИЯ (НОВЫЙ УЧАСТНИК) */}
        {activeTab === 'register' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-600 leading-relaxed">
              Заполните имя и контакт. Вы всегда сможете войти в свой профиль на любом телефоне по имени и почте или телефону.
            </div>

            {/* Duplicate detection warning */}
            {existingMatch && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
                <div className="flex items-start gap-2 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Участник с такими данными уже найден!</span>
                </div>
                <p className="text-gray-700">
                  Участник <strong>«{existingMatch.name}»</strong> уже зарегистрирован (пройдено точек:{' '}
                  <strong>{existingMatch.completedGames.length}</strong>).
                  Войдите в него, чтобы не потерять ваши пройденные точки.
                </p>
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectParticipant(existingMatch);
                      if (onClose) onClose();
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Войти в этот аккаунт</span>
                  </button>
                </div>
              </div>
            )}

            {/* Family member notice */}
            {familyMatchName && !existingMatch && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
                <Users className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold block text-blue-950">Семейное участие:</span>
                  На эту почту уже зарегистрирован член семьи (<strong>«{familyMatchName}»</strong>).
                  Отлично! Для вас будет создан отдельный личный кабинет с этой же семейной почтой.
                </div>
              </div>
            )}

            <form onSubmit={(e) => handleRegisterSubmit(e, false)} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                  Имя и фамилия участника *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    id="participant-name-input"
                    value={regName}
                    onChange={(e) => {
                      setRegName(e.target.value);
                      if (regError) setRegError(null);
                      checkForDuplicate(e.target.value, regEmail, regPhone);
                    }}
                    placeholder="Например: Иван Смирнов"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-gray-50 border border-gray-300 focus:border-red-600 focus:bg-white focus:outline-none text-sm text-gray-900 transition-colors"
                  />
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                  Электронная почта (рекомендуется для семьи)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="participant-email-input"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      checkForDuplicate(regName, e.target.value, regPhone);
                    }}
                    placeholder="семья@mail.ru"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-gray-50 border border-gray-300 focus:border-red-600 focus:bg-white focus:outline-none text-sm text-gray-900 transition-colors"
                  />
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  Можно использовать одну общую почту на всю семью — у каждого свой маршрутный лист!
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                  Телефон или контакт в Telegram (необязательно)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="participant-phone-input"
                    value={regPhone}
                    onChange={(e) => {
                      setRegPhone(e.target.value);
                      checkForDuplicate(regName, regEmail, e.target.value);
                    }}
                    placeholder="+7 (999) 000-00-00 или @username"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-gray-50 border border-gray-300 focus:border-red-600 focus:bg-white focus:outline-none text-sm text-gray-900 transition-colors"
                  />
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                  Город или Команда (необязательно)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="participant-team-input"
                    value={regCityOrTeam}
                    onChange={(e) => setRegCityOrTeam(e.target.value)}
                    placeholder="Например: Москва / «Богатыри»"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-gray-50 border border-gray-300 focus:border-red-600 focus:bg-white focus:outline-none text-sm text-gray-900 transition-colors"
                  />
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {regError && (
                <div className="text-xs text-red-600 font-medium px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                  {regError}
                </div>
              )}

              <button
                type="submit"
                id="start-game-submit-btn"
                disabled={regLoading || !regName.trim()}
                className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer mt-1"
              >
                <span>{regLoading ? 'Регистрация...' : 'Зарегистрироваться и начать квест'}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              {existingMatch && (
                <button
                  type="button"
                  onClick={(e) => handleRegisterSubmit(e, true)}
                  className="w-full py-1.5 text-center text-xs text-gray-500 hover:text-gray-800 underline cursor-pointer"
                >
                  Это другой человек с таким же именем (создать новый профиль)
                </button>
              )}
            </form>

            {/* Switch to Login & Admin links */}
            <div className="pt-2 border-t border-gray-100 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setLoginError(null);
                  setLoginSelectionMessage(null);
                  setMatchedParticipants([]);
                }}
                className="text-xs text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Уже участвуете? Войти по имени и почте</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  id="auth-collapse-register-btn"
                  className="w-full py-2.5 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 hover:text-gray-900 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs mt-1"
                >
                  <Eye className="w-4 h-4 text-red-600" />
                  <span>Свернуть и посмотреть карточки игр и схему точек</span>
                </button>
              )}

              <button
                type="button"
                id="reg-switch-to-admin-btn"
                onClick={() => {
                  setActiveTab('admin');
                  setAdminError(null);
                }}
                className="text-[11px] text-gray-400 hover:text-red-600 inline-flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-gray-50"
              >
                <Shield className="w-3.5 h-3.5 text-gray-400" />
                <span>Вход для администратора / ведущего</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: ВХОД ДЛЯ АДМИНИСТРАТОРА */}
        {activeTab === 'admin' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="p-3 bg-gray-900 text-gray-200 rounded-2xl flex items-start gap-3 border border-gray-800">
              <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-xs leading-relaxed">
                <div className="font-bold text-white mb-0.5">Панель управления фестивалем:</div>
                Вход для организаторов и судей станций: генерация проверочных кодов, управление списком участников и сброс данных.
              </div>
            </div>

            {adminError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{adminError}</span>
              </div>
            )}

            <form onSubmit={handleAdminSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                  Логин администратора
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="admin-auth-username"
                    value={adminUsername}
                    onChange={(e) => {
                      setAdminUsername(e.target.value);
                      if (adminError) setAdminError(null);
                    }}
                    placeholder="Логин администратора"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-gray-50 border border-gray-300 focus:border-red-600 focus:bg-white focus:outline-none text-sm text-gray-900 transition-colors"
                    required
                  />
                  <Shield className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                  Пароль администратора
                </label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    id="admin-auth-password"
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      if (adminError) setAdminError(null);
                    }}
                    placeholder="Введите пароль"
                    className="w-full h-11 pl-10 pr-16 rounded-xl bg-gray-50 border border-gray-300 focus:border-red-600 focus:bg-white focus:outline-none text-sm text-gray-900 transition-colors"
                    required
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700 py-1 px-1.5 rounded cursor-pointer"
                  >
                    {showAdminPassword ? 'Скрыть' : 'Показать'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="admin-auth-submit-btn"
                disabled={adminLoading || !adminPassword}
                className="w-full h-12 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                <Shield className="w-4 h-4 text-red-500" />
                <span>{adminLoading ? 'Авторизация...' : 'Войти в панель управления'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setAdminError(null);
                }}
                className="text-xs text-gray-600 hover:text-red-700 inline-flex items-center gap-1 cursor-pointer font-medium"
              >
                <span>← Вернуться ко входу участников</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
