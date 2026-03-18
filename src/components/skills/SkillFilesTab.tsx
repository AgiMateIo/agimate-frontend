'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { SkillFileEntry } from '@/types';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { TrashIcon, ArrowDownTrayIcon, DocumentIcon, FolderIcon } from '@heroicons/react/24/outline';

interface SkillFilesTabProps {
  skillId: string;
  isOwner: boolean;
}

export default function SkillFilesTab({ skillId, isOwner }: SkillFilesTabProps) {
  const t = useTranslations('Skills');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<SkillFileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingPaths, setDeletingPaths] = useState<Set<string>>(new Set());

  const fetchFiles = useCallback(async () => {
    try {
      setError(null);
      const data = await apiService.getSkillFiles(skillId);
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [skillId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiService.uploadSkillFile(skillId, formData);
      await fetchFiles();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (filePath: string) => {
    setDeletingPaths(prev => new Set(prev).add(filePath));

    try {
      await apiService.deleteSkillFile(skillId, filePath);
      setFiles(prev => prev.filter(f => f.path !== filePath));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    } finally {
      setDeletingPaths(prev => {
        const next = new Set(prev);
        next.delete(filePath);
        return next;
      });
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const blob = await apiService.downloadSkillFile(skillId, filePath);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Filter out SKILL.md and directories for display
  const displayFiles = files.filter(f => !f.directory && f.path !== 'SKILL.md');

  if (loading) {
    return <div className="text-center py-8 text-muted">{t('loading')}</div>;
  }

  return (
    <div className="space-y-4">
      {isOwner && (
        <div className="flex items-center gap-3">
          <Button
            onClick={() => fileInputRef.current?.click()}
            loading={uploading}
            disabled={uploading}
          >
            {uploading ? t('uploading') : t('uploadFile')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      )}

      {uploadError && <ErrorAlert>{uploadError}</ErrorAlert>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {displayFiles.length === 0 ? (
        <div className="text-center py-8 text-muted">
          {t('noFiles')}
        </div>
      ) : (
        <div className="space-y-2">
          {displayFiles.map((file) => (
            <div
              key={file.path}
              className="flex items-center justify-between bg-surface-secondary rounded-lg p-3 border border-border"
            >
              <div className="flex items-center gap-3 min-w-0">
                {file.directory ? (
                  <FolderIcon className="h-5 w-5 text-muted shrink-0" />
                ) : (
                  <DocumentIcon className="h-5 w-5 text-muted shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.path}</p>
                  <p className="text-xs text-muted">{formatFileSize(file.size)}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleDownload(file.path, file.name)}
                  className="p-2 text-muted hover:text-foreground transition-colors rounded-lg"
                  title={t('download')}
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                </button>

                {isOwner && (
                  <button
                    onClick={() => handleDelete(file.path)}
                    disabled={deletingPaths.has(file.path)}
                    className="p-2 text-muted hover:text-error transition-colors rounded-lg disabled:opacity-50"
                    title={t('deleteFile')}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
