import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Wifi,
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  Server,
  RefreshCw,
  ShieldCheck,
  FileText,
  HelpCircle,
  ExternalLink,
  Laptop,
  Radio,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { Game } from '../types';

interface OfflineManagerTabProps {
  games: Game[];
}

export const OfflineManagerTab: React.FC<OfflineManagerTabProps> = ({ games }) => {
  const [networkAddresses, setNetworkAddresses] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [port, setPort] = useState<number>(3000);
  const [customHost, setCustomHost] = useState<string>('');
  const [wifiSsid, setWifiSsid] = useState<string>('Igry-Narodov-Rossii');
  const [wifiPassword, setWifiPassword] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeSubView, setActiveSubView] = useState<'poster' | 'stations' | 'instructions'>('poster');

  useEffect(() => {
    loadNetworkInfo();
  }, []);

  const loadNetworkInfo = async () => {
    setIsLoading(true);
    try {
      const info = await api.getNetworkInfo();
      setPort(info.port || 3000);
      const ipv4s = info.addresses.map((a) => a.address);
      setNetworkAddresses(ipv4s);
      if (ipv4s.length > 0) {
        setSelectedAddress(ipv4s[0]);
      } else if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        setSelectedAddress(window.location.hostname);
      } else {
        setSelectedAddress('192.168.1.100');
      }
    } catch {
      setSelectedAddress(typeof window !== 'undefined' ? window.location.hostname : '192.168.1.100');
    } finally {
      setIsLoading(false);
    }
  };

  const currentHost = customHost.trim() || selectedAddress || '192.168.1.100';
  const accessUrl = typeof window !== 'undefined' && window.location.protocol === 'https:' && !customHost
    ? window.location.origin
    : `http://${currentHost}:${port}`;

  useEffect(() => {
    if (!accessUrl) return;
    QRCode.toDataURL(accessUrl, {
      width: 500,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [accessUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(accessUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-Festival-Games-${currentHost}.png`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubView('poster')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSubView === 'poster'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Главный стенд и QR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('instructions')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSubView === 'instructions'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Памятка развертывания</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadNetworkInfo}
            className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Обновить список сетевых адаптеров"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Обновить IP</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Печать плаката (A4)</span>
          </button>
        </div>
      </div>

      {activeSubView === 'poster' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings Left Column */}
          <div className="lg:col-span-5 space-y-4">
            {/* IP configuration card */}
            <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Server className="w-4 h-4 text-red-600" />
                <h3 className="font-bold text-gray-900 text-sm">Сетевой адрес сервера поляны</h3>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  IP-адрес ноутбука в Wi-Fi сети:
                </label>
                {networkAddresses.length > 0 ? (
                  <select
                    value={selectedAddress}
                    onChange={(e) => {
                      setSelectedAddress(e.target.value);
                      setCustomHost('');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-mono bg-gray-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  >
                    {networkAddresses.map((ip) => (
                      <option key={ip} value={ip}>
                        {ip} (сетевой интерфейс)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-gray-500 italic mb-2">
                    В контейнере/облаке IP определяется динамически
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Или укажите вручную (например: 192.168.1.100)
                </label>
                <input
                  type="text"
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Итоговая ссылка для участников:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={accessUrl}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono bg-gray-100 text-gray-900 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Скопировано' : 'Копия'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Wi-Fi card */}
            <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Wifi className="w-4 h-4 text-red-600" />
                <h3 className="font-bold text-gray-900 text-sm">Параметры сети Wi-Fi для плаката</h3>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Имя Wi-Fi сети (SSID на роутере):
                </label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder="Igry-Narodov-Rossii"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Пароль от Wi-Fi (оставьте пустым для открытой сети):
                </label>
                <input
                  type="text"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  placeholder="Без пароля (рекомендуется)"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <strong>Совет для площадки:</strong> делайте Wi-Fi сеть открытой (без пароля), чтобы участники любого возраста мгновенно подключались без опечаток.
              </div>
            </div>
          </div>

          {/* Poster Right Column (Printable Preview) */}
          <div className="lg:col-span-7">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-red-600 shadow-lg text-center space-y-5 relative">
              <div className="space-y-1">
                <div className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 text-[11px] font-bold tracking-wider uppercase">
                  Интерактивный квест-фестиваль
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-gray-950 tracking-tight">
                  ИГРЫ НАРОДОВ РОССИИ
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">
                  Подключение со своего смартфона без интернета
                </p>
              </div>

              {/* QR Image */}
              <div className="py-2 flex flex-col items-center justify-center">
                {qrDataUrl ? (
                  <div className="p-4 bg-white rounded-3xl shadow-sm border-2 border-gray-200 inline-block">
                    <img
                      src={qrDataUrl}
                      alt="QR Code фестиваля"
                      className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-56 h-56 bg-gray-100 rounded-3xl animate-pulse flex items-center justify-center text-xs text-gray-400">
                    Генерация QR...
                  </div>
                )}
                <span className="text-[11px] text-gray-500 mt-2">
                  Наведите камеру смартфона для открытия карты фестиваля
                </span>
              </div>

              {/* Step by step box */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-left space-y-2.5 text-xs text-gray-800">
                <div className="font-bold text-gray-900 border-b border-gray-200 pb-1 flex items-center justify-between">
                  <span>Как войти в приложение:</span>
                  <span className="text-[10px] text-gray-500 font-mono">100% Офлайн</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    Подключитесь к Wi-Fi: <strong>{wifiSsid}</strong>
                    {wifiPassword ? <span> (пароль: <code>{wifiPassword}</code>)</span> : <span> (сеть без пароля)</span>}
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    Наведите камеру на QR-код или откройте в браузере: <strong className="font-mono text-red-700">{accessUrl}</strong>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    Изучайте 22 игры, находите точки на карте поляны и получайте проверочные коды у ведущих!
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать QR (PNG)</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Распечатать плакат A4</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Instructions Checklist */}
      {activeSubView === 'instructions' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold font-serif text-gray-950">
              Чек-лист готовности к работе на фестивальной поляне
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Следуйте этим шагам при установке оборудования на стадионе или в парке
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Оборудование</h3>
              <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
                <li>Ноутбук организатора (ОЗУ от 8 ГБ)</li>
                <li>Блок питания + удлинитель/пауэрбанк</li>
                <li>Wi-Fi роутер (Keenetic, TP-Link, MikroTik)</li>
                <li>Кабель Ethernet (ноутбук ↔ роутер)</li>
              </ul>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Настройка роутера</h3>
              <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
                <li>Включите роутер (интернет не нужен!)</li>
                <li>Сеть: <code>Igry-Narodov-Rossii</code></li>
                <li>Открытая сеть (без пароля)</li>
                <li>IP ноутбука: <code>192.168.1.100</code></li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Запуск сервера</h3>
              <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
                <li>В терминале: <code>npm start</code></li>
                <li>Порт: <code>3000</code> (привязан к 0.0.0.0)</li>
                <li>Разрешить брандмауэр Windows</li>
                <li>Повесить распечатанные QR-коды</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-700" />
              <span>Важные правила размещения роутера на открытой поляне:</span>
            </div>
            <p>
              Разместите Wi-Fi роутер в центре фестивальной площадки на высоте 1.5–2 метра от земли (на стойке, шатре или крыше судейской палатки). Тела людей поглощают радиосигнал 2.4/5 ГГц, поэтому поднятая антенна увеличивает дальность приема с 25 до 60+ метров!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
