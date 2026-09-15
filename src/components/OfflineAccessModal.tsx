import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Wifi, QrCode, Download, Printer, Copy, Check, Server, RefreshCw, X, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../services/api';

interface OfflineAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineAccessModal: React.FC<OfflineAccessModalProps> = ({ isOpen, onClose }) => {
  const [networkAddresses, setNetworkAddresses] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [port, setPort] = useState<number>(3000);
  const [customHost, setCustomHost] = useState<string>('');
  const [wifiSsid, setWifiSsid] = useState<string>('Igry-Narodov-Rossii');
  const [wifiPassword, setWifiPassword] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Load network info on mount
  useEffect(() => {
    if (!isOpen) return;
    loadNetworkInfo();
  }, [isOpen]);

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

  // Generate QR Code whenever accessUrl changes
  useEffect(() => {
    if (!accessUrl) return;
    QRCode.toDataURL(accessUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [accessUrl]);

  if (!isOpen) return null;

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
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white relative border-b border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-serif tracking-tight">
                Офлайн подключение и QR-коды для площадки
              </h3>
              <p className="text-xs text-gray-300">
                Генератор доступа для смартфонов участников фестиваля без интернета
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Quick Notice */}
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 leading-relaxed">
            <Wifi className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Для работы на фестивальной поляне:</strong> подключите ноутбук к офлайн Wi-Fi роутеру.
              Смартфоны участников подключаются к этой же сети Wi-Fi и сканируют данный QR-код. Внешний интернет не требуется!
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Left: Configuration */}
            <div className="space-y-4">
              {/* Local IP Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-red-600" />
                    <span>IP-адрес ноутбука на поляне</span>
                  </label>
                  <button
                    type="button"
                    onClick={loadNetworkInfo}
                    className="text-[11px] text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Обновить</span>
                  </button>
                </div>

                {networkAddresses.length > 0 ? (
                  <select
                    value={selectedAddress}
                    onChange={(e) => {
                      setSelectedAddress(e.target.value);
                      setCustomHost('');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono bg-gray-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  >
                    {networkAddresses.map((ip) => (
                      <option key={ip} value={ip}>
                        {ip} (локальная сеть)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customHost}
                    onChange={(e) => setCustomHost(e.target.value)}
                    placeholder="Например 192.168.1.100"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                )}
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Определяется автоматически через сетевую карту ноутбука
                </span>
              </div>

              {/* Custom Host override */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Или укажите вручную (IP или локальный домен)
                </label>
                <input
                  type="text"
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Wi-Fi Details for the poster */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <span className="text-xs font-bold text-gray-800 block">
                  Данные Wi-Fi для таблички на стенде
                </span>
                <div>
                  <label className="text-[11px] text-gray-500 block mb-0.5">Имя сети (SSID):</label>
                  <input
                    type="text"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    placeholder="Igry-Narodov-Rossii"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold bg-white focus:outline-hidden focus:ring-1 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 block mb-0.5">Пароль (если есть):</label>
                  <input
                    type="text"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder="Без пароля (открытая сеть)"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* URL Display and Copy */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Итоговая ссылка входа
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={accessUrl}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono bg-gray-100 text-gray-800 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Скопировать ссылку"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Скопировано' : 'Копия'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: QR Code Preview & Actions */}
            <div className="flex flex-col items-center justify-center p-5 bg-gray-50 rounded-2xl border border-gray-200 text-center space-y-3">
              <span className="text-xs font-bold text-gray-800">
                QR-код для участников
              </span>

              {qrDataUrl ? (
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-200 inline-block">
                  <img
                    src={qrDataUrl}
                    alt="QR Code фестиваля"
                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 bg-gray-200 rounded-2xl animate-pulse flex items-center justify-center text-xs text-gray-400">
                  Генерация QR...
                </div>
              )}

              <p className="text-[11px] text-gray-500 max-w-xs">
                Участник наводит камеру смартфона и сразу открывает карту и игры
              </p>

              <div className="flex items-center gap-2 w-full pt-1">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  disabled={!qrDataUrl}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать PNG</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!qrDataUrl}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Печать стенда</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>Сервер фестиваля: порт {port} (0.0.0.0)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Hidden printable A4 sheet */}
      <div id="print-festival-stand" className="hidden print:block fixed inset-0 bg-white p-8 text-black z-[9999]">
        <div className="max-w-2xl mx-auto border-4 border-red-700 p-8 rounded-3xl text-center space-y-6">
          <div className="space-y-1">
            <span className="text-sm font-bold tracking-widest text-red-700 uppercase">
              Интерактивный квест-фестиваль
            </span>
            <h1 className="text-3xl font-extrabold font-serif text-gray-950">
              ИГРЫ НАРОДОВ РОССИИ
            </h1>
            <p className="text-sm text-gray-600">
              22 традиционные игры • Маршрутный лист • Сертификат мастера
            </p>
          </div>

          <div className="py-2 flex justify-center">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-72 h-72 object-contain border-2 border-gray-300 p-2 rounded-2xl"
              />
            )}
          </div>

          <div className="bg-gray-100 p-4 rounded-2xl space-y-2 text-left text-sm">
            <div className="font-bold text-gray-900 border-b border-gray-300 pb-1">
              Как подключиться со своего телефона:
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs">1</span>
              <span>Подключитесь к сети Wi-Fi: <strong>{wifiSsid}</strong> {wifiPassword ? `(пароль: ${wifiPassword})` : '(без пароля)'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs">2</span>
              <span>Наведите камеру смартфона на QR-код выше</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs">3</span>
              <span>Или введите в браузере адрес: <strong className="font-mono text-red-700">{accessUrl}</strong></span>
            </div>
          </div>

          <div className="text-xs text-gray-500 pt-2">
            Проходите испытания у ведущих на площадке, получайте проверочные коды и соберите полный сертификат!
          </div>
        </div>
      </div>
    </div>
  );
};
