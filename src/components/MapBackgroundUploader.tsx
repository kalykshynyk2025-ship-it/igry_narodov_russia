import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Link as LinkIcon, Trash2, Check, Loader2, AlertCircle, Sparkles, RefreshCw, X, Eye } from 'lucide-react';
import { api } from '../services/api';

interface MapBackgroundUploaderProps {
  currentUrl: string;
  onUpdate: (url: string) => void;
}

export const MapBackgroundUploader: React.FC<MapBackgroundUploaderProps> = ({
  currentUrl,
  onUpdate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(currentUrl);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setPreviewUrl(result.url);
      setSuccessMessage(`Файл «${file.name}» готов. Нажмите «Сохранить фон».`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Ошибка загрузки файла');
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

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleApplyUrl = async () => {
    if (!urlInput.trim()) return;
    setErrorMessage(null);
    setIsUploading(true);

    try {
      let finalUrl = urlInput.trim();
      if (finalUrl.includes('disk.yandex.ru') || finalUrl.includes('yadi.sk')) {
        const resolved = await api.resolveImageUrl(finalUrl);
        if (resolved.error) {
          setErrorMessage(resolved.error);
          setIsUploading(false);
          return;
        }
        finalUrl = resolved.url;
      }
      setPreviewUrl(finalUrl);
      setSuccessMessage('Ссылка принята. Нажмите «Сохранить фон».');
    } catch {
      setErrorMessage('Не удалось загрузить изображение по указанной ссылке');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveBackground = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await api.updateMapBackground(previewUrl);
      if (res.success) {
        onUpdate(previewUrl);
        setSuccessMessage('Задний фон карты успешно сохранён!');
        setTimeout(() => {
          setIsOpen(false);
          setSuccessMessage(null);
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Не удалось сохранить фон');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveBackground = async () => {
    setIsSaving(true);
    try {
      await api.removeMapBackground();
      setPreviewUrl('');
      onUpdate('');
      setSuccessMessage('Фон удалён. Возвращена стандартная векторная схема.');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Ошибка сброса фона');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 font-serif">
                Задний фон интерактивной схемы поляны
              </h3>
              {currentUrl ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  Пользовательский фон активен
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-semibold">
                  Стандартная векторная схема
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 max-w-xl">
              Загрузите реальную фотографию парка/стадиона, схему расстановки палаток или план площадки. Точки испытаний будут отображаться поверх неё.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setPreviewUrl(currentUrl);
              setIsOpen(true);
            }}
            id="open-map-bg-modal-btn"
            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{currentUrl ? 'Заменить фон схемы' : 'Загрузить фон схемы'}</span>
          </button>

          {currentUrl && (
            <button
              type="button"
              onClick={handleRemoveBackground}
              disabled={isSaving}
              id="remove-map-bg-btn"
              className="p-2 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 transition-colors cursor-pointer"
              title="Удалить фон и вернуть стандартную векторную схему"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mini preview bar if custom background is currently active */}
      {currentUrl && (
        <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-2xl border border-gray-200">
          <img
            src={currentUrl}
            alt="Миниатюра фона схемы"
            className="w-16 h-10 object-cover rounded-lg border border-gray-300 shadow-2xs"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-800 truncate">
              Текущий фон схемы поляны
            </div>
            <div className="text-[11px] text-gray-500 truncate">
              {currentUrl.startsWith('data:') ? 'Локальное изображение (base64)' : currentUrl}
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.open(currentUrl, '_blank')}
            className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Открыть оригинал</span>
          </button>
        </div>
      )}

      {/* Modal Dialog for Uploading Map Background */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-200 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 bg-gray-900 text-white flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center font-bold text-sm">
                  <ImageIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-serif text-white">
                    Загрузка фона схемы площадки
                  </h3>
                  <p className="text-xs text-gray-400">
                    JPG, PNG или WebP (рекомендуется формат 16:10 или 4:3)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('upload');
                    setErrorMessage(null);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Файл с устройства</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('url');
                    setErrorMessage(null);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'url'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Ссылка / Яндекс.Диск</span>
                </button>
              </div>

              {/* Upload Tab */}
              {activeTab === 'upload' && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-red-600 bg-red-50/50'
                      : 'border-gray-300 hover:border-red-400 bg-gray-50/70 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileInputChange}
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    className="hidden"
                  />

                  {isUploading ? (
                    <div className="flex flex-col items-center justify-center py-4 space-y-2">
                      <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                      <span className="text-xs font-semibold text-gray-700">
                        Обработка и сохранение изображения...
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-white shadow-2xs border border-gray-200 text-red-600 flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-bold text-gray-800">
                        Нажмите для выбора файла или перетащите сюда
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Поддерживаются JPG, PNG, WebP (план, схема, аэрофото поляны)
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* URL Tab */}
              {activeTab === 'url' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://... или публичная ссылка Яндекс.Диск"
                      className="flex-1 h-11 px-3.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-600 bg-gray-50 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrl}
                      disabled={isUploading || !urlInput.trim()}
                      className="px-4 h-11 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Загрузить'}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Поддерживаются прямые ссылки на изображения, а также публичные папки и файлы Яндекс.Диска.
                  </p>
                </div>
              )}

              {/* Messages */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Preview */}
              {previewUrl && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="text-xs font-bold text-gray-700">
                    Предпросмотр схемы поляны:
                  </div>
                  <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-gray-300 shadow-inner bg-gray-900">
                    <img
                      src={previewUrl}
                      alt="Предпросмотр схемы"
                      className="w-full h-full object-cover"
                      onError={() => setErrorMessage('Не удалось загрузить изображение по указанному адресу')}
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-mono">
                      Предпросмотр
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-100 cursor-pointer"
                >
                  Отмена
                </button>

                <button
                  type="button"
                  onClick={handleSaveBackground}
                  disabled={isSaving || !previewUrl}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Сохранить фон схемы</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
