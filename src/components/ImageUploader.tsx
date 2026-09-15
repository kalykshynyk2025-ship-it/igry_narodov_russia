import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, Image as ImageIcon, Check, Loader2, X, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  label = 'Фотография игровой точки'
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'url' | 'presets'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isResolvingYandex, setIsResolvingYandex] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isYandexDiskUrl = (url: string) => {
    return url.includes('disk.yandex.ru') || url.includes('yadi.sk');
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Пожалуйста, выберите файл изображения (JPG, PNG, WebP)');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await api.uploadImage(file);
      onChange(result.url);
      setSuccessMessage(`Фото «${file.name}» успешно загружено!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Ошибка загрузки фото');
    } finally {
      setIsUploading(false);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleResolveUrl = async (urlToResolve?: string) => {
    const targetUrl = (urlToResolve || urlInput).trim();
    if (!targetUrl) {
      setErrorMessage('Введите ссылку на изображение');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    if (isYandexDiskUrl(targetUrl)) {
      setIsResolvingYandex(true);
      try {
        const result = await api.resolveImageUrl(targetUrl);
        if (result.error) {
          throw new Error(result.error);
        }
        onChange(result.url);
        setUrlInput('');
        setSuccessMessage(`Фото с Яндекс.Диска (${result.originalName || 'успешно'}) скачано и сохранено!`);
      } catch (err: any) {
        setErrorMessage(err.message || 'Не удалось загрузить фото с Яндекс.Диска');
      } finally {
        setIsResolvingYandex(false);
      }
    } else {
      // Direct image URL
      onChange(targetUrl);
      setUrlInput('');
      setSuccessMessage('Ссылка на фото сохранена');
    }
  };

  const curatedPresets = [
    {
      name: 'Фото с фестиваля (Яндекс.Диск)',
      url: '/uploads/yandex_disk_sample.jpg'
    },
    {
      name: 'Поляна и природа',
      url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Спорт / Состязания',
      url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Шахматы / Алтай Шатра',
      url: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Хакасские кости / Альчики',
      url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Северные нарты / Зима',
      url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&w=800&q=80'
    }
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block font-bold text-gray-900 text-xs">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setSuccessMessage(null);
            }}
            className="text-[11px] text-red-600 hover:text-red-700 font-medium flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3 h-3" />
            Очистить фото
          </button>
        )}
      </div>

      {/* Preview Card if image is present */}
      {value ? (
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-900 shadow-xs group">
          <div className="h-44 w-full relative">
            <img
              src={value}
              alt="Предпросмотр фото точки"
              className="w-full h-full object-cover"
              onError={(e) => {
                // If it was an unresolved yandex link
                if (isYandexDiskUrl(value)) {
                  handleResolveUrl(value);
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-black/30" />
          </div>

          {/* Info pill in overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium flex items-center gap-1.5 border border-white/10">
                <Check className="w-3 h-3 text-green-400" />
                {value.startsWith('/uploads/')
                  ? 'Сохранено на сервере'
                  : value.startsWith('data:image/')
                  ? 'Локальное фото'
                  : 'Внешняя ссылка'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-white/95 hover:bg-white text-gray-900 text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3 text-red-600" />
              Заменить фото
            </button>
          </div>
        </div>
      ) : null}

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-bold">
        <button
          type="button"
          onClick={() => { setActiveMode('upload'); setErrorMessage(null); }}
          className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeMode === 'upload' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Upload className="w-3.5 h-3.5 text-red-600" />
          <span>Загрузка файла</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveMode('url'); setErrorMessage(null); }}
          className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeMode === 'url' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5 text-red-600" />
          <span>Ссылка / Яндекс.Диск</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveMode('presets'); setErrorMessage(null); }}
          className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeMode === 'presets' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-red-600" />
          <span>Шаблоны</span>
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileInputChange}
        className="hidden"
        id="image-file-input"
      />

      {/* TAB 1: DIRECT FILE UPLOAD (DRAG & DROP + BUTTON) */}
      {activeMode === 'upload' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer select-none ${
            isDragging
              ? 'border-red-600 bg-red-50/70 scale-[1.01]'
              : 'border-gray-300 hover:border-red-500 bg-gray-50/50 hover:bg-red-50/20'
          } ${isUploading ? 'opacity-70 cursor-wait' : ''}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-2">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
              <p className="text-xs font-bold text-gray-800">Загрузка и оптимизация изображения...</p>
              <p className="text-[11px] text-gray-500">Фото сохраняется на сервер фестиваля</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">
                  Нажмите для выбора фото или перетащите файл сюда
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Поддерживаются форматы JPG, PNG, WebP с камеры смартфона или компьютера
                </p>
              </div>
              <span className="inline-block px-3 py-1 bg-white border border-gray-300 rounded-lg text-[11px] font-bold text-gray-700 shadow-2xs">
                Выбрать файл на устройстве
              </span>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: URL & YANDEX DISK RESOLVER */}
      {activeMode === 'url' && (
        <div className="space-y-3 bg-gray-50/60 p-4 rounded-2xl border border-gray-200">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Ссылка на фото или публичную страницу Яндекс.Диска
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="https://disk.yandex.ru/i/... или прямая ссылка"
                className="flex-1 h-10 px-3 rounded-xl bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-600"
              />
              <button
                type="button"
                onClick={() => handleResolveUrl()}
                disabled={isResolvingYandex || !urlInput.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                {isResolvingYandex ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Скачивание...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Загрузить</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Special Helper for Yandex Disk links */}
          {urlInput && isYandexDiskUrl(urlInput) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Обнаружена ссылка Яндекс.Диска!</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Яндекс.Диск открывает HTML-страницу просмотра, поэтому обычные браузеры не могут показать её в теге картинки. 
                Наш сервер автоматически скачает фото высокого разрешения через API Яндекс.Диска и сохранит его для квеста.
              </p>
            </div>
          )}

          {/* Explanation note */}
          <div className="text-[11px] text-gray-500 bg-white p-2.5 rounded-xl border border-gray-200/80 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
            <span>
              <strong>Совет:</strong> вы можете просто скопировать публичную ссылку с Яндекс.Диска (например, <code className="text-gray-700 bg-gray-100 px-1 py-0.5 rounded">https://disk.yandex.ru/i/VxBqkl_1PyQ9BQ</code>) — система конвертирует её в мгновенно загружаемое фото.
            </span>
          </div>
        </div>
      )}

      {/* TAB 3: CURATED PRESETS */}
      {activeMode === 'presets' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {curatedPresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onChange(preset.url);
                setSuccessMessage(`Выбран шаблон «${preset.name}»`);
              }}
              className="group relative h-20 rounded-xl overflow-hidden border border-gray-200 hover:border-red-600 transition-all text-left cursor-pointer"
            >
              <img
                src={preset.url}
                alt={preset.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/40 to-transparent p-2 flex flex-col justify-end">
                <span className="text-[11px] font-bold text-white line-clamp-1">
                  {preset.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Status Messages */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
};
