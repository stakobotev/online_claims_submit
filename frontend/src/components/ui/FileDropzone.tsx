import { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/classNames';
import { formatFileSize, getTotalSize } from '../../utils/fileSize';

interface FileDropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxTotalBytes?: number;
  accept?: string[];
  error?: string;
}

export function FileDropzone({
  files,
  onChange,
  maxFiles = 3,
  maxTotalBytes = 5 * 1024 * 1024,
  accept = ['application/pdf', 'image/bmp', 'image/jpeg', 'image/png', 'image/tiff'],
  error,
}: FileDropzoneProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;
      const arr = Array.from(incoming);
      const combined = [...files, ...arr];
      if (combined.length > maxFiles) {
        setLocalError(t('dropzone.tooManyFiles', { max: maxFiles }));
        return;
      }
      const badType = arr.find((f) => !accept.includes(f.type));
      if (badType) {
        setLocalError(t('dropzone.unsupportedType', { name: badType.name }));
        return;
      }
      if (getTotalSize(combined) > maxTotalBytes) {
        setLocalError(t('dropzone.sizeExceeded', { max: formatFileSize(maxTotalBytes) }));
        return;
      }
      setLocalError(null);
      onChange(combined);
    },
    [files, maxFiles, maxTotalBytes, accept, onChange, t],
  );

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
    setLocalError(null);
  };

  const displayError = error || localError;

  return (
    <div>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          dragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400',
          displayError ? 'border-red-400' : '',
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        aria-label={t('dropzone.label', 'Upload attachments')}
      >
        <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="mt-2 text-sm text-gray-600">
          {t('dropzone.hint', { max: maxFiles, size: formatFileSize(maxTotalBytes) })}
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF, BMP, JPG, PNG, TIFF</p>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple
          accept={accept.join(',')}
          onChange={(e) => addFiles(e.target.files)}
          aria-label={t('dropzone.label', 'Upload attachments')}
        />
      </div>
      {displayError && (
        <p className="mt-1 text-sm text-red-600" role="alert">{displayError}</p>
      )}
      {files.length > 0 && (
        <ul className="mt-3 space-y-1">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5 text-sm">
              <span className="truncate text-gray-700">{f.name}</span>
              <span className="ml-2 shrink-0 text-gray-400">{formatFileSize(f.size)}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="ml-2 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-1 focus:ring-red-400 rounded"
                aria-label={t('dropzone.remove', { name: f.name })}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-xs text-gray-400">
        {t('dropzone.tally', {
          count: files.length,
          max: maxFiles,
          size: formatFileSize(getTotalSize(files)),
          maxSize: formatFileSize(maxTotalBytes),
        })}
      </p>
    </div>
  );
}
