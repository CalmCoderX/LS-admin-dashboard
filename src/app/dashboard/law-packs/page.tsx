'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { platformAdminApi } from '@/lib/api';
import {
  LawPack,
  LawPackListResponse,
  OrganizationAssignment,
  OrganizationAssignmentsResponse,
  TierRestrictions
} from '@/types/api';
import {
  BookOpen,
  Upload,
  Download,
  Plus,
  Edit,
  Trash2,
  FileText,
  Calendar,
  Globe,
  Badge,
  CheckCircle,
  AlertTriangle,
  Clock,
  Loader2,
  Files,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { LAW_PACK_STATUS_OPTIONS } from '@/constants/status';
import { getLawPackStatusBadge } from '@/constants/badges';
import { getErrorMessage } from '@/utils/error';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/common/PageHeader';
import StatsGrid from '@/components/common/StatsGrid';
import SearchFilters, { FilterField } from '@/components/common/SearchFilters';
import { useDebounce } from '@/hooks/useDebounce';

interface LawPackFilters {
  search: string;
  jurisdiction: string;
  status: string;
  version: string;
}

function getLawPackLanguageBadge(lawPack: LawPack): {
  label: 'EN' | 'PT' | 'EN/PT';
  className: string;
} {
  // Prefer the explicit supported_languages field when present.
  const explicit = lawPack.supported_languages;
  if (explicit === 'both') {
    return {
      label: 'EN/PT',
      className:
        'px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium',
    };
  }
  if (explicit === 'pt') {
    return {
      label: 'PT',
      className:
        'px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded text-xs font-medium',
    };
  }
  if (explicit === 'en') {
    return {
      label: 'EN',
      className:
        'px-2 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 rounded text-xs font-medium',
    };
  }

  // Fallback for legacy rows with no supported_languages value: infer from metadata presence.
  const enName = lawPack.name?.trim() || '';
  const ptName = lawPack.name_pt?.trim() || '';
  const hasEnglishMetadata = !!(
    lawPack.badge?.trim() ||
    lawPack.description?.trim() ||
    lawPack.tags?.trim() ||
    lawPack.region?.trim()
  );
  const hasDistinctEnglishName =
    !!enName && (!ptName || enName.toLowerCase() !== ptName.toLowerCase());
  const hasEnglish = hasEnglishMetadata || hasDistinctEnglishName;
  const hasPortuguese = !!(
    lawPack.name_pt?.trim() ||
    lawPack.badge_pt?.trim() ||
    lawPack.description_pt?.trim() ||
    lawPack.tags_pt?.trim() ||
    lawPack.region_pt?.trim()
  );

  if (hasEnglish && hasPortuguese) {
    return {
      label: 'EN/PT',
      className:
        'px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium',
    };
  }

  if (hasPortuguese) {
    return {
      label: 'PT',
      className:
        'px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded text-xs font-medium',
    };
  }

  return {
    label: 'EN',
    className:
      'px-2 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 rounded text-xs font-medium',
  };
}


const JURISDICTION_OPTIONS = [
  { value: '', label: 'All Jurisdictions' },
  { value: 'US', label: 'United States' },
  { value: 'EU', label: 'European Union' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'BR', label: 'Brazil' },
  { value: 'GLOBAL', label: 'Global' },
];

// Form data interface for create/update operations (supports en/pt)
interface LawPackFormData {
  name: string;
  jurisdiction: string;
  version: string;
  launch_date: string;
  status: string;
  badge: string;
  tags: string;
  type: string;
  region: string;
  description: string;
  name_pt: string;
  badge_pt: string;
  tags_pt: string;
  region_pt: string;
  description_pt: string;
  type_pt: string;
  files?: File[];
  /**
   * Library description language(s): controls which metadata fields are kept
   * (EN / PT / Both). This is the renamed "Supported Language" control.
   */
  descriptionLanguages?: 'en' | 'pt' | 'both';
  /**
   * Language(s) the engine actually works on for this pack. Independent from
   * descriptionLanguages. Drives the language badge on the user dashboard.
   */
  supportedLanguages?: 'en' | 'pt' | 'both';
}

function LawPackModal({
  isOpen,
  isLoading,
  onClose,
  lawPack,
  onSave,
  uploadProgress,
  isUploading,
}: {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  lawPack?: LawPack | null;
  onSave: (data: LawPackFormData) => void;
  uploadProgress?: Record<number, number>;
  isUploading?: boolean;
}) {
  const isEditing = !!lawPack;
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  // Library description language(s) — controls which metadata fields are shown/kept.
  const [descriptionLanguages, setDescriptionLanguages] = useState<'en' | 'pt' | 'both'>('en');
  // Engine-level supported language(s) — independent control shown above library description.
  const [supportedLanguages, setSupportedLanguages] = useState<'en' | 'pt' | 'both'>('en');

  const { register, handleSubmit, formState: { errors }, setValue, reset, clearErrors, watch } = useForm<Omit<LawPackFormData, 'files'>>({
    defaultValues: {
      name: '',
      jurisdiction: '',
      version: '',
      launch_date: '',
      status: 'draft',
      badge: '',
      tags: '',
      type: '',
      region: '',
      description: '',
      name_pt: '',
      badge_pt: '',
      tags_pt: '',
      region_pt: '',
      description_pt: '',
      type_pt: '',
    }
  });

  // Load law pack data when editing or reset when creating
  useEffect(() => {
    if (isOpen) {
      if (isEditing && lawPack) {
        setValue('name', lawPack.name || '');
        setValue('jurisdiction', lawPack.jurisdiction || '');
        setValue('version', lawPack.version || '');
        setValue('launch_date', lawPack.launch_date ? lawPack.launch_date.split('T')[0] : '');
        setValue('status', lawPack.status || 'draft');
        setValue('badge', lawPack.badge || '');
        setValue('tags', lawPack.tags || '');
        setValue('type', lawPack.type || '');
        setValue('region', lawPack.region || '');
        setValue('description', lawPack.description || '');
        setValue('name_pt', lawPack.name_pt || '');
        setValue('badge_pt', lawPack.badge_pt || '');
        setValue('tags_pt', lawPack.tags_pt || '');
        setValue('region_pt', lawPack.region_pt || '');
        setValue('description_pt', lawPack.description_pt || '');
        setValue('type_pt', lawPack.type_pt || '');
        const enName = lawPack.name?.trim() || '';
        const ptName = lawPack.name_pt?.trim() || '';
        const hasEnMetadata = !!(
          lawPack.badge ??
          lawPack.description ??
          lawPack.tags ??
          lawPack.region ??
          lawPack.type
        );
        const hasEnNameDistinctFromPt =
          !!enName && (!ptName || enName.toLowerCase() !== ptName.toLowerCase());
        const hasEn = hasEnMetadata || hasEnNameDistinctFromPt;
        const hasPt = !!(
          lawPack.name_pt ??
          lawPack.badge_pt ??
          lawPack.description_pt ??
          lawPack.tags_pt ??
          lawPack.region_pt ??
          lawPack.type_pt
        );
        setDescriptionLanguages(hasEn && hasPt ? 'both' : hasPt ? 'pt' : 'en');
        // Use the explicit supported_languages field when available; fall back to 'en'.
        setSupportedLanguages((lawPack.supported_languages as 'en' | 'pt' | 'both') || 'en');
      } else {
        reset({
          name: '',
          jurisdiction: '',
          version: '',
          launch_date: '',
          status: 'draft',
          badge: '',
          tags: '',
          type: '',
          region: '',
          description: '',
          name_pt: '',
          badge_pt: '',
          tags_pt: '',
          region_pt: '',
          description_pt: '',
          type_pt: '',
        });
        setDescriptionLanguages('en');
        setSupportedLanguages('en');
      }
      setSelectedFiles([]);
      clearErrors();
    }
  }, [isOpen, lawPack, isEditing, setValue, reset, clearErrors]);

  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      reset();
      setSelectedFiles([]);
    }
  }, [isOpen, reset]);

  const onSubmit = (data: Omit<LawPackFormData, 'files'>) => {
    // Validate file upload for new law packs only
    if (!isEditing && selectedFiles.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }

    onSave({
      ...data,
      files: isEditing ? undefined : selectedFiles.length > 0 ? selectedFiles : undefined,
      descriptionLanguages,
      supportedLanguages,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length > 0) {
      // Validate all files are JSONL format
      const invalidFiles = files.filter(file => {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        return fileExtension !== 'jsonl';
      });
      
      if (invalidFiles.length > 0) {
        toast.error('Invalid file format. All law pack files must be JSONL format (.jsonl)');
        e.target.value = ''; // Clear the input
        setSelectedFiles([]);
        return;
      }
    }
    
    setSelectedFiles(files);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lawPack ? 'Edit Law Pack' : 'Create New Law Pack'}
      size="lg"
      disableClose={isLoading}
    >
      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Version *
            </label>
            <input
              type="text"
              {...register('version', { required: 'Version is required' })}
              className="input-field"
              placeholder="e.g., 2024.1"
              disabled={isLoading}
            />
            {errors.version && (
              <p className="text-sm text-red-600">{errors.version.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Launch Date *
            </label>
            <input
              type="date"
              {...register('launch_date', { required: 'Launch date is required' })}
              className="input-field"
              disabled={isLoading}
            />
            {errors.launch_date && (
              <p className="text-sm text-red-600">{errors.launch_date.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Jurisdiction *
            </label>
            <select
              {...register('jurisdiction', { required: 'Jurisdiction is required' })}
              className="input-field"
              disabled={isLoading}
            >
              <option value="">Select Jurisdiction</option>
              {JURISDICTION_OPTIONS.slice(1).map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {errors.jurisdiction && (
              <p className="text-sm text-red-600">{errors.jurisdiction.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Status *
            </label>
            <select
              {...register('status', { required: 'Status is required' })}
              className="input-field"
              disabled={isLoading}
            >
              {LAW_PACK_STATUS_OPTIONS.slice(1).map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {errors.status && (
              <p className="text-sm text-red-600">{errors.status.message}</p>
            )}
          </div>
        </div>

        {/* Supported Language - engine-level language support (drives user-dashboard badge) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-primary">
            Supported Language *
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Language(s) the engine works on for this law pack. Drives the language badge shown on the user dashboard.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="supported_languages"
                checked={supportedLanguages === 'en'}
                onChange={() => setSupportedLanguages('en')}
                className="border-gray-300 dark:border-gray-600 text-brand-navy focus:ring-brand-navy"
                disabled={isLoading}
              />
              <span className="text-sm font-medium text-text-primary">English</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="supported_languages"
                checked={supportedLanguages === 'pt'}
                onChange={() => setSupportedLanguages('pt')}
                className="border-gray-300 dark:border-gray-600 text-brand-navy focus:ring-brand-navy"
                disabled={isLoading}
              />
              <span className="text-sm font-medium text-text-primary">Portuguese</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="supported_languages"
                checked={supportedLanguages === 'both'}
                onChange={() => setSupportedLanguages('both')}
                className="border-gray-300 dark:border-gray-600 text-brand-navy focus:ring-brand-navy"
                disabled={isLoading}
              />
              <span className="text-sm font-medium text-text-primary">Both</span>
            </label>
          </div>
        </div>

        {/* Library Description - controls which metadata fields are captured/kept */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-primary">
            Library Description *
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Select the language(s) in which the library description, badge, tags, and region will be provided. Fields below will be shown for the selected language(s).
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="description_languages"
                checked={descriptionLanguages === 'en'}
                onChange={() => setDescriptionLanguages('en')}
                className="border-gray-300 dark:border-gray-600 text-brand-navy focus:ring-brand-navy"
                disabled={isLoading}
              />
              <span className="text-sm font-medium text-text-primary">English</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="description_languages"
                checked={descriptionLanguages === 'pt'}
                onChange={() => setDescriptionLanguages('pt')}
                className="border-gray-300 dark:border-gray-600 text-brand-navy focus:ring-brand-navy"
                disabled={isLoading}
              />
              <span className="text-sm font-medium text-text-primary">Portuguese</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="description_languages"
                checked={descriptionLanguages === 'both'}
                onChange={() => setDescriptionLanguages('both')}
                className="border-gray-300 dark:border-gray-600 text-brand-navy focus:ring-brand-navy"
                disabled={isLoading}
              />
              <span className="text-sm font-medium text-text-primary">Both</span>
            </label>
          </div>
        </div>

        {/* English fields */}
        {(descriptionLanguages === 'en' || descriptionLanguages === 'both') && (
          <div className="space-y-4 border border-bg-light-6 dark:border-gray-600 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-text-primary">English</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-text-primary">Law Pack Name *</label>
                <input
                  type="text"
                  {...register('name', { required: (descriptionLanguages === 'en' || descriptionLanguages === 'both') ? 'Law pack name is required' : false })}
                  className="input-field"
                  placeholder="e.g., GDPR Compliance Pack 2024"
                  disabled={isLoading}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Badge</label>
                <input
                  type="text"
                  {...register('badge')}
                  className="input-field"
                  placeholder="e.g., New"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Region</label>
                <input
                  type="text"
                  {...register('region')}
                  className="input-field"
                  placeholder="Europe, North America, Global"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Type</label>
                <input
                  type="text"
                  {...register('type')}
                  className="input-field"
                  placeholder="regulation, guidance, template"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">Description</label>
              <textarea
                {...register('description')}
                className="input-field"
                rows={3}
                placeholder="Describe this law pack and its contents..."
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">Tags</label>
              <input
                type="text"
                {...register('tags')}
                className="input-field"
                placeholder="privacy, data-protection, GDPR"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">Comma-separated tags</p>
            </div>
          </div>
        )}

        {/* Portuguese fields */}
        {(descriptionLanguages === 'pt' || descriptionLanguages === 'both') && (
          <div className="space-y-4 border border-bg-light-6 dark:border-gray-600 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-text-primary">Portuguese</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-text-primary">Law Pack Name (Portuguese) *</label>
                <input
                  type="text"
                  {...register('name_pt', { required: (descriptionLanguages === 'pt' || descriptionLanguages === 'both') ? 'Law pack name (Portuguese) is required' : false })}
                  className="input-field"
                  placeholder="e.g., Pacote de Conformidade GDPR"
                  disabled={isLoading}
                />
                {errors.name_pt && (
                  <p className="text-sm text-red-600">{errors.name_pt.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Badge (Portuguese)</label>
                <input
                  type="text"
                  {...register('badge_pt')}
                  className="input-field"
                  placeholder="e.g., Novo"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Region (Portuguese)</label>
                <input
                  type="text"
                  {...register('region_pt')}
                  className="input-field"
                  placeholder="Europa, América do Norte"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Type (Portuguese)</label>
                <input
                  type="text"
                  {...register('type_pt')}
                  className="input-field"
                  placeholder="regulamento, orientação, modelo"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">Description (Portuguese)</label>
              <textarea
                {...register('description_pt')}
                className="input-field"
                rows={3}
                placeholder="Descreva o conteúdo deste pacote..."
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">Tags (Portuguese)</label>
              <input
                type="text"
                {...register('tags_pt')}
                className="input-field"
                placeholder="privacidade, proteção de dados"
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        {/* File upload section - only shown when creating new law packs */}
        {!isEditing && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Law Pack Files * (Multiple files allowed)
            </label>
            <div className="border-2 border-dashed border-bg-light-6 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".jsonl"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                disabled={isLoading}
              />
              <label 
                htmlFor="file-upload" 
                className={isLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
              >
                <Upload className="w-8 h-8 text-text-secondary mx-auto mb-2" />
                <p className="text-text-secondary">
                  {selectedFiles.length > 0 
                    ? `${selectedFiles.length} file(s) selected` 
                    : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  JSONL files only (.jsonl) - Multiple files allowed
                </p>
                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {selectedFiles.map((file, index) => {
                      const progress = uploadProgress?.[index] ?? 0;
                      const isUploadingFile = isUploading && progress > 0 && progress < 100;
                      
                      return (
                        <div key={index} className="text-left">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm text-text-primary">
                              {file.name} ({formatFileSize(file.size)})
                            </p>
                            {isUploadingFile && (
                              <span className="text-xs text-text-secondary">
                                {Math.round(progress)}%
                              </span>
                            )}
                            {!isUploadingFile && progress >= 100 && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          {isUploadingFile && (
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">At least one file is required for new law packs</p>
          </div>
        )}

        {/* File info section - shown when editing to display current files */}
        {isEditing && lawPack?.file_count && lawPack.file_count > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Current Files
            </label>
            <div className="bg-bg-light-1 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-text-secondary" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {lawPack.file_count} file(s) associated with this law pack
                  </p>
                  <p className="text-xs text-text-secondary">
                    File updates are not allowed during law pack editing
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary flex items-center" disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isUploading 
              ? 'Uploading Files...' 
              : isEditing 
                ? 'Update Law Pack' 
                : 'Create Law Pack'}
          </button>
        </div>
      </form>
      </div>
    </Modal>
  );
}

function OrganizationAssignmentsTab() {
  const queryClient = useQueryClient();
  const [selectedOrg, setSelectedOrg] = useState<OrganizationAssignment | null>(null);
  const [selectedLawPacks, setSelectedLawPacks] = useState<number[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Fetch organization assignments
  const { data: assignmentsData, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['organization-assignments'],
    queryFn: () => platformAdminApi.getOrganizationAssignments({ skip: 0, limit: 100 }) as Promise<OrganizationAssignmentsResponse>,
  });

  // Fetch all law packs for assignment
  const { data: lawPacksData } = useQuery({
    queryKey: ['law-packs-for-assignment'],
    queryFn: () => platformAdminApi.getLawPacks() as Promise<LawPackListResponse>,
  });

  const organizations = assignmentsData?.organizations || [];
  const availableLawPacks = lawPacksData?.law_packs || [];

    // Single-request sync: send only selected law pack IDs; backend assigns new and unassigns removed
  const syncLawPacksMutation = useMutation({
    mutationFn: ({ orgId, lawPackIds }: { orgId: number; lawPackIds: number[] }) =>
      platformAdminApi.syncOrganizationLawPacks(orgId, lawPackIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-assignments'] });
      toast.success('Law pack assignments updated successfully');
      setShowAssignModal(false);
      setSelectedOrg(null);
      setSelectedLawPacks([]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update law pack assignments'));
    },
  });

  // Unassignment mutation
  const unassignMutation = useMutation({
    mutationFn: async ({ orgId, lawPackId }: { orgId: number; lawPackId: number }) =>
      platformAdminApi.unassignLawPackWithValidation(orgId, lawPackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-assignments'] });
      toast.success('Law pack unassigned successfully');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to unassign law pack'));
    },
  });

  const handleAssign = () => {
    if (!selectedOrg) return;
    // Single API call: send only selected law pack IDs; backend syncs (assign new, unassign removed)
    syncLawPacksMutation.mutate({
      orgId: selectedOrg.organization.id,
      lawPackIds: selectedLawPacks,
    });
  };

  const handleUnassign = (orgId: number, lawPackId: number) => {
    unassignMutation.mutate({ orgId, lawPackId });
  };

  const openAssignModal = (org: OrganizationAssignment) => {
    setSelectedOrg(org);
    // Pre-select already assigned law packs
    const assignedIds = org.assigned_law_packs.map(alp => alp.id);
    setSelectedLawPacks(assignedIds);
    setShowAssignModal(true);
  };

  const toggleLawPackSelection = (lawPackId: number) => {
    setSelectedLawPacks(prev =>
      prev.includes(lawPackId)
        ? prev.filter(id => id !== lawPackId)
        : [...prev, lawPackId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLawPacks.length === availableLawPacks.length) {
      setSelectedLawPacks([]);
    } else {
      setSelectedLawPacks(availableLawPacks.map(lp => lp.id));
    }
  };

  const getRestrictionStatus = (restrictions: TierRestrictions) => {
    if (!restrictions.can_change) {
      return { color: 'text-red-600', text: 'No Changes Allowed' };
    }
    if (!restrictions.can_change_now) {
      return { color: 'text-yellow-600', text: 'Cooldown Active' };
    }
    if (restrictions.max_law_packs !== -1 && restrictions.current_count >= restrictions.max_law_packs) {
      return { color: 'text-orange-600', text: 'Limit Reached' };
    }
    return { color: 'text-green-600', text: 'Can Change' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Organization Law Pack Assignments</h2>
        <p className="text-text-secondary">Manage law pack assignments with tier-based restrictions</p>
      </div>

      {/* Organizations List */}
      {assignmentsLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {organizations.map((orgAssignment) => {
            const { organization, assigned_law_packs, restrictions } = orgAssignment;
            const restrictionStatus = getRestrictionStatus(restrictions);

            return (
              <div key={organization.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-primary mb-1">
                      {organization.name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                      <span>Tier: <span className="font-medium">{organization.tier_name}</span></span>
                      <span>Status: <span className="font-medium">{organization.subscription_status || 'Active'}</span></span>
                      <span className={restrictionStatus.color}>
                        {restrictionStatus.text}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => openAssignModal(orgAssignment)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Manage Law Packs
                  </button>
                </div>

                {/* Tier Restrictions Info */}
                <div className="bg-bg-light-1 dark:bg-gray-800 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-text-primary mb-2">Tier Restrictions</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-text-secondary">Max Law Packs:</span>
                      <span className="font-medium text-text-primary ml-2">
                        {restrictions.max_law_packs === -1 ? 'Unlimited' : restrictions.max_law_packs}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary">Current Count:</span>
                      <span className="font-medium text-text-primary ml-2">{restrictions.current_count}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary">Cooldown:</span>
                      <span className="font-medium text-text-primary ml-2">
                        {restrictions.cooldown_days === -1 ? 'No restrictions' :
                         restrictions.cooldown_days === 0 ? 'Changes disabled' :
                         restrictions.cooldown_days === null ? 'None' :
                         `${restrictions.cooldown_days} days`}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary">Next Change:</span>
                      <span className="font-medium text-text-primary ml-2">
                        {restrictions.next_change_allowed ?
                          format(new Date(restrictions.next_change_allowed), 'MMM dd, yyyy') : 'Now'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Assigned Law Packs */}
                <div>
                  <h4 className="font-medium text-text-primary mb-3">
                    Assigned Law Packs ({assigned_law_packs.length})
                  </h4>
                  {assigned_law_packs.length === 0 ? (
                    <div className="text-center py-8 text-text-secondary">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No law packs assigned</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {assigned_law_packs.map((lawPack) => (
                        <div key={lawPack.id} className="border border-bg-light-6 rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-text-primary text-sm">{lawPack.name || 'Untitled'}</h5>
                            <button
                              onClick={() => handleUnassign(organization.id, lawPack.id)}
                              className="p-1 text-text-secondary hover:text-status-error transition-colors"
                              title="Unassign"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-xs text-text-secondary space-y-1">
                            <p>Jurisdiction: {lawPack.jurisdiction}</p>
                            <p>Version: {lawPack.version}</p>
                            <p>Assigned: {lawPack.assigned_at ? format(new Date(lawPack.assigned_at), 'MMM dd, yyyy') : 'Unknown'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assignment Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedOrg(null);
          setSelectedLawPacks([]);
        }}
        title={`Manage Law Packs for ${selectedOrg?.organization.name}`}
        size="lg"
      >
        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-text-primary">
                Select Law Packs ({selectedLawPacks.length} selected)
              </label>
              <button
                onClick={toggleSelectAll}
                className="text-sm text-brand-navy hover:text-brand-navy/80 transition-colors"
              >
                {selectedLawPacks.length === availableLawPacks.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto border border-bg-light-6 rounded-lg">
              <div className="space-y-0">
                {availableLawPacks.map((lawPack) => {
                  const isSelected = selectedLawPacks.includes(lawPack.id);
                  const isCurrentlyAssigned = selectedOrg?.assigned_law_packs.some(alp => alp.id === lawPack.id);

                  return (
                    <label
                      key={lawPack.id}
                      className={`flex items-center gap-3 p-4 border-b border-bg-light-6 last:border-b-0 cursor-pointer transition-colors hover:bg-bg-light-1 dark:hover:bg-gray-800 ${
                        isSelected ? 'bg-brand-navy/5 dark:bg-brand-navy/10' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleLawPackSelection(lawPack.id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-brand-navy focus:ring-brand-navy"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-medium text-text-primary text-sm">{lawPack.name || lawPack.name_pt || 'Untitled'}</h4>
                          {lawPack.name && lawPack.name_pt && lawPack.name !== lawPack.name_pt && (
                            <span className="text-xs text-text-secondary">({lawPack.name_pt})</span>
                          )}
                          {isCurrentlyAssigned && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                              Currently Assigned
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-text-secondary">
                          <span>{lawPack.jurisdiction}</span>
                          <span>v{lawPack.version}</span>
                          <span className={`px-2 py-1 rounded-full ${
                            lawPack.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                            lawPack.status === 'draft' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                            'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}>
                            {lawPack.status}
                          </span>
                        </div>
                        {(lawPack.description || lawPack.description_pt) && (
                          <p className="text-xs text-text-secondary mt-1 line-clamp-1">
                            {lawPack.description || lawPack.description_pt}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
                {availableLawPacks.length === 0 && (
                  <div className="text-center py-8 text-text-secondary">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No law packs available</p>
                  </div>
                )}
              </div>
            </div>
          </div>



          <div className="flex justify-between items-center">
            <div className="text-sm text-text-secondary">
              <span>
                {selectedLawPacks.length} law pack{selectedLawPacks.length > 1 ? 's' : ''} selected
                {selectedLawPacks.length === 0 && selectedOrg && selectedOrg.assigned_law_packs.length > 0 && (
                  <span className="ml-2 text-orange-600">
                    (will unassign all current law packs)
                  </span>
                )}
                {selectedLawPacks.length > 0 && selectedOrg && selectedOrg.assigned_law_packs.some(alp => selectedLawPacks.includes(alp.id)) && (
                  <span className="ml-2 text-yellow-600">
                    (includes currently assigned packs)
                  </span>
                )}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedOrg(null);
                  setSelectedLawPacks([]);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAssign()}
                disabled={syncLawPacksMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {syncLawPacksMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {syncLawPacksMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function LawPacksPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'law-packs' | 'assignments'>('law-packs');
  const [filters, setFilters] = useState<LawPackFilters>({
    search: '',
    jurisdiction: '',
    status: '',
    version: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLawPack, setEditingLawPack] = useState<LawPack | null>(null);
  const [showFileListModal, setShowFileListModal] = useState(false);
  const [loadingFilesForLawPack, setLoadingFilesForLawPack] = useState<number | null>(null);
  const [selectedLawPackFiles, setSelectedLawPackFiles] = useState<{
    lawPack: LawPack;
    files: Array<{ url: string; filename: string; original_filename: string; order_index: number }>;
  } | null>(null);


  const debouncedSearch = useDebounce(filters.search, 500);

  const isSearching = filters.search !== debouncedSearch && filters.search.length > 0;

  // Fetch law packs from backend with server-side filtering
  const { data: lawPacksData, isLoading, isRefetching: isRefetchingLawPacks } = useQuery({
    queryKey: ['law-packs', debouncedSearch, filters.jurisdiction, filters.status],
    queryFn: () => platformAdminApi.getLawPacks({
      active: filters.status === 'active' ? true : undefined
    }) as Promise<LawPackListResponse>,
  });

  const lawPacks = lawPacksData?.law_packs || [];

  const filteredLawPacks = lawPacks.filter(pack => {
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      const matchName = pack.name?.toLowerCase().includes(term);
      const matchNamePt = pack.name_pt?.toLowerCase().includes(term);
      if (!matchName && !matchNamePt) return false;
    }
    if (filters.jurisdiction && pack.jurisdiction !== filters.jurisdiction) {
      return false;
    }
    if (filters.status && filters.status !== 'active' && pack.status !== filters.status) {
      return false;
    }
    return true;
  });

  const handleFilterChange = (key: keyof LawPackFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filterFields: FilterField[] = [
    {
      id: 'jurisdiction',
      label: 'Jurisdiction',
      value: filters.jurisdiction,
      onChange: (value) => handleFilterChange('jurisdiction', value),
      options: JURISDICTION_OPTIONS
    },
    {
      id: 'status',
      label: 'Status',
      value: filters.status,
      onChange: (value) => handleFilterChange('status', value),
      options: [...LAW_PACK_STATUS_OPTIONS]
    }
  ];

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [isUploading, setIsUploading] = useState(false);

  // Function to upload file to S3 using presigned URL
  const uploadFileToS3 = async (
    file: File,
    presignedUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/jsonl');
      xhr.send(file);
    });
  };

  const createLawPackInProgressRef = useRef(false);

  const createLawPackMutation = useMutation({
    mutationFn: async (data: LawPackFormData) => {
      if (createLawPackInProgressRef.current) {
        throw new Error('Create already in progress. Please wait.');
      }
      if (!data.files || data.files.length === 0) {
        throw new Error('At least one file is required');
      }

      createLawPackInProgressRef.current = true;
      setIsUploading(true);
      setUploadProgress({});

      try {
        const filenames = data.files.map((file) => file.name);
        const presignedResponse = await platformAdminApi.generatePresignedUploadUrls({
          filenames,
          content_types: data.files.map((file) => file.type || 'application/jsonl'),
        });

        const uploadUrls = presignedResponse?.upload_urls;
        if (!Array.isArray(uploadUrls) || uploadUrls.length !== data.files.length) {
          throw new Error('Invalid response from server: upload URLs count does not match files. Please try again.');
        }

        const uploadedFiles: Array<{ s3_key: string; original_filename: string; order_index: number }> = [];

        for (let i = 0; i < data.files.length; i++) {
          const file = data.files[i];
          const uploadInfo = uploadUrls[i];
          if (!uploadInfo?.url || !uploadInfo?.s3_key) {
            throw new Error(`Invalid upload URL for file ${(file as File).name}. Please try again.`);
          }
          if (!(file instanceof File)) {
            throw new Error(`Invalid file at index ${i}`);
          }

          await uploadFileToS3(file, uploadInfo.url, (progress) => {
            setUploadProgress((prev) => ({ ...prev, [i]: progress }));
          });

          uploadedFiles.push({
            s3_key: uploadInfo.s3_key,
            original_filename: uploadInfo.filename,
            order_index: i,
          });
        }

        const content: {
          en?: { name: string; badge?: string; description?: string; tags?: string; region?: string; type?: string };
          pt?: { name: string; badge?: string; description?: string; tags?: string; region?: string; type?: string };
        } = {};
        if (data.descriptionLanguages === 'en' || data.descriptionLanguages === 'both') {
          content.en = {
            name: data.name,
            badge: data.badge || undefined,
            description: data.description || undefined,
            tags: data.tags || undefined,
            region: data.region || undefined,
            type: data.type || undefined,
          };
        }
        if (data.descriptionLanguages === 'pt' || data.descriptionLanguages === 'both') {
          content.pt = {
            name: data.name_pt ?? '',
            badge: data.badge_pt || undefined,
            description: data.description_pt || undefined,
            tags: data.tags_pt || undefined,
            region: data.region_pt || undefined,
            type: data.type_pt || undefined,
          };
        }

        const lawPackData = {
          jurisdiction: data.jurisdiction,
          version: data.version,
          launch_date: data.launch_date,
          status: data.status,
          description_languages: data.descriptionLanguages,
          supported_languages: data.supportedLanguages,
          files: uploadedFiles,
          // Legacy outer ``type`` is still included so single-language payloads
          // without ``content`` stay backwards compatible. Per-language type lives
          // inside ``content.en.type`` / ``content.pt.type`` above.
          type: data.type || undefined,
          ...(Object.keys(content).length > 0 ? { content } : { name: data.name, badge: data.badge || undefined, tags: data.tags || undefined, region: data.region || undefined, description: data.description || undefined }),
        };

        return await platformAdminApi.createLawPackFromUrls(lawPackData);
      } finally {
        createLawPackInProgressRef.current = false;
        setIsUploading(false);
        setUploadProgress({});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['law-packs'] });
      queryClient.invalidateQueries({ queryKey: ['law-packs-for-assignment'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-law-packs'] });
      queryClient.invalidateQueries({ queryKey: ['assignable-law-packs'] });
      queryClient.invalidateQueries({ queryKey: ['organization-assignments'] });
      toast.success('Law pack created successfully');
      setShowCreateModal(false);
      setUploadProgress({});
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to create law pack'));
      setUploadProgress({});
    },
  });

  const updateLawPackMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: LawPackFormData }) => {
        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('jurisdiction', data.jurisdiction);
        formData.append('version', data.version);
        formData.append('launch_date', data.launch_date);
        formData.append('status', data.status);
      formData.append('badge', data.badge || '');
      if (data.tags) formData.append('tags', data.tags);
      if (data.type) formData.append('type', data.type);
      if (data.region) formData.append('region', data.region);
      if (data.description) formData.append('description', data.description);
      formData.append('name_pt', data.name_pt ?? '');
      formData.append('badge_pt', data.badge_pt ?? '');
      if (data.tags_pt != null) formData.append('tags_pt', data.tags_pt);
      if (data.region_pt != null) formData.append('region_pt', data.region_pt);
      if (data.description_pt != null) formData.append('description_pt', data.description_pt);
      if (data.type_pt != null) formData.append('type_pt', data.type_pt);
      if (data.descriptionLanguages) formData.append('description_languages', data.descriptionLanguages);
      if (data.supportedLanguages) formData.append('supported_languages', data.supportedLanguages);

      return platformAdminApi.updateLawPack(id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['law-packs'] });
      queryClient.invalidateQueries({ queryKey: ['law-packs-for-assignment'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-law-packs'] });
      queryClient.invalidateQueries({ queryKey: ['assignable-law-packs'] });
      queryClient.invalidateQueries({ queryKey: ['organization-assignments'] });
      toast.success('Law pack updated successfully');
      setEditingLawPack(null);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to update law pack'));
    },
  });


  const handleCreateLawPack = (data: LawPackFormData) => {
    createLawPackMutation.mutate(data);
  };

  const handleUpdateLawPack = (data: LawPackFormData) => {
    if (editingLawPack) {
      updateLawPackMutation.mutate({ id: editingLawPack.id, data });
    }
  };

  const handleShowFileList = async (lawPack: LawPack) => {
    setLoadingFilesForLawPack(lawPack.id);
    try { 
      // Get the download URLs from backend
      const response = await platformAdminApi.downloadLawPack(lawPack.id) as {
        files?: Array<{ url: string; filename: string; original_filename: string; order_index: number }>;
        download_url?: string;
        expires_in_seconds: number;
        total_files?: number;
      };
      
      // Handle new format with multiple files
      if (response.files && Array.isArray(response.files) && response.files.length > 0) {
        setSelectedLawPackFiles({
          lawPack,
          files: response.files
        });
        setShowFileListModal(true);
      } else {
        toast.error('No files available for download');
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to load law pack files'));
    } finally {
      setLoadingFilesForLawPack(null);
    }
  };

  const handleDownloadFile = (fileInfo: { url: string; filename: string; original_filename: string; order_index: number }) => {
    const link = document.createElement('a');
    link.href = fileInfo.url;
    link.download = fileInfo.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloading ${fileInfo.original_filename}...`);
  };


  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Law Packs Management</h1>
            <p className="text-text-secondary">
              Manage legal document packages and compliance materials
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="card">
          <div className="flex border-b border-bg-light-6 dark:border-gray-600">
            <button
              onClick={() => setActiveTab('law-packs')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'law-packs'
                  ? 'text-brand-navy dark:text-blue-400 border-b-2 border-brand-navy dark:border-blue-400 bg-brand-navy/5 dark:bg-blue-500/20'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Law Packs Management
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'assignments'
                  ? 'text-brand-navy dark:text-blue-400 border-b-2 border-brand-navy dark:border-blue-400 bg-brand-navy/5 dark:bg-blue-500/20'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Organization Assignments
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'law-packs' ? (
          <>
            {/* Law Packs Tab Header */}
            <PageHeader
              title="Law Packs Management"
              description="Create, edit, and manage law pack files"
              actions={[
                {
                  id: 'create-law-pack',
                  label: 'Create Law Pack',
                  icon: Plus,
                  onClick: () => setShowCreateModal(true),
                  variant: 'primary'
                }
              ]}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['law-packs'] })}
              isRefreshing={isRefetchingLawPacks}
            />

            {/* Stats Cards */}
            <StatsGrid
              isLoading={isLoading}
              columns={3}
              stats={[
                {
                  id: 'total',
                  title: 'Total Law Packs',
                  value: lawPacks.length,
                  icon: BookOpen,
                  iconColor: 'text-brand-navy'
                },
                {
                  id: 'active',
                  title: 'Active Packs',
                  value: lawPacks.filter((p: LawPack) => p.status === 'active').length,
                  icon: CheckCircle,
                  iconColor: 'text-status-success'
                },
                {
                  id: 'draft',
                  title: 'Draft Packs',
                  value: lawPacks.filter((p: LawPack) => p.status === 'draft').length,
                  icon: Clock,
                  iconColor: 'text-status-warning'
                }
              ]}
            />

            {/* Filters and Search */}
            <SearchFilters
              searchValue={filters.search}
              onSearchChange={(value) => handleFilterChange('search', value)}
              searchPlaceholder="Search law packs by name..."
              isSearching={isSearching}
              filters={filterFields}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
              onClearFilters={() => setFilters({ search: '', jurisdiction: '', status: '', version: '' })}
            />

        {/* Law Packs Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2 w-3/4" />
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/5" />
                  </div>
                </div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-4 w-full" />
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-bg-light-6">
                  <div className="flex items-center gap-4">
                    <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLawPacks.map((lawPack) => (
            <div key={lawPack.id} className="card hover:shadow-custom-lg transition-shadow">
              {(() => {
                const languageBadge = getLawPackLanguageBadge(lawPack);
                return (
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-primary mb-1">{lawPack.name || lawPack.name_pt || 'Untitled Law Pack'}</h3>
                  {lawPack.name && lawPack.name_pt && lawPack.name !== lawPack.name_pt && (
                    <p className="text-sm text-text-secondary mb-2" title="Portuguese name">{lawPack.name_pt}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {getLawPackStatusBadge(lawPack.status)}
                    <span className={languageBadge.className} title="Supported languages">
                      {languageBadge.label}
                    </span>
                    {lawPack.badge && (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                        {lawPack.badge}
                      </span>
                    )}
                    {lawPack.badge_pt && (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium" title="Portuguese badge">
                        {lawPack.badge_pt}
                      </span>
                    )}
                  </div>
                </div>
              </div>
                );
              })()}

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-text-secondary shrink-0" />
                  <span className="text-text-secondary shrink-0">Jurisdiction:</span>
                  <span className="text-text-primary font-medium">{lawPack.jurisdiction}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="w-4 h-4 text-text-secondary shrink-0" />
                  <span className="text-text-secondary shrink-0">Version:</span>
                  <span className="text-text-primary font-medium">{lawPack.version}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-text-secondary shrink-0" />
                  <span className="text-text-secondary shrink-0">Launch:</span>
                  <span className="text-text-primary">{format(new Date(lawPack.launch_date), 'MMM dd, yyyy')}</span>
                </div>
                {(lawPack.type || lawPack.type_pt) && (
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-text-secondary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-text-secondary">Type:</span>
                    {lawPack.type && <span className="text-text-primary capitalize ml-1">{lawPack.type}</span>}
                    {lawPack.type && lawPack.type_pt && <span className="text-text-secondary mx-1">|</span>}
                    {lawPack.type_pt && <span className="text-text-primary capitalize" title="Portuguese">{lawPack.type_pt}</span>}
                  </div>
                </div>
                )}
                {(lawPack.region || lawPack.region_pt) && (
                  <div className="flex items-start gap-2">
                    <Globe className="w-4 h-4 text-text-secondary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-text-secondary">Region:</span>
                      {lawPack.region && <span className="text-text-primary ml-1">{lawPack.region}</span>}
                      {lawPack.region && lawPack.region_pt && <span className="text-text-secondary mx-1">|</span>}
                      {lawPack.region_pt && <span className="text-text-primary" title="Portuguese">{lawPack.region_pt}</span>}
                    </div>
                  </div>
                )}
              </div>

              {(lawPack.description || lawPack.description_pt) && (
                <div className="text-sm text-text-secondary mt-3 space-y-1">
                  {lawPack.description && (
                    <p className="line-clamp-2">{lawPack.description}</p>
                  )}
                  {lawPack.description_pt && (
                    <p className="line-clamp-2 text-text-secondary/90" title="Portuguese description">{lawPack.description_pt}</p>
                  )}
                </div>
              )}

              {(lawPack.tags || lawPack.tags_pt) && (
                <div className="pt-3 mt-3 border-t border-bg-light-6 dark:border-gray-600">
                  <div className="flex flex-wrap gap-1">
                    {lawPack.tags?.split(',').map((tag, index) => (
                      <span key={`en-${index}`} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                        {tag.trim()}
                      </span>
                    ))}
                    {lawPack.tags_pt?.split(',').map((tag, index) => (
                      <span key={`pt-${index}`} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs" title="Portuguese">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end pt-4 mt-4 border-t border-bg-light-6">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleShowFileList(lawPack)}
                    disabled={loadingFilesForLawPack !== null}
                    className="p-1 text-text-secondary hover:text-brand-navy transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="View Files"
                  >
                    {loadingFilesForLawPack === lawPack.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Files className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setEditingLawPack(lawPack)}
                    disabled={loadingFilesForLawPack !== null}
                    className="p-1 text-text-secondary hover:text-brand-navy transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            ))}
          </div>
        )}

        {!isLoading && filteredLawPacks.length === 0 && (
          <div className="card text-center py-12">
            <BookOpen className="w-12 h-12 text-text-secondary mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No Law Packs Found</h3>
            <p className="text-text-secondary mb-4">
              {filters.search || filters.jurisdiction || filters.status
                ? 'No law packs match your current filters.'
                : 'Get started by creating your first law pack.'
              }
            </p>
            {!(filters.search || filters.jurisdiction || filters.status) && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                Create Law Pack
              </button>
            )}
          </div>
        )}
        </>
        ) : (
          /* Organization Assignments Tab */
          <OrganizationAssignmentsTab />
        )}

        {/* Create/Edit Modal */}
        <LawPackModal
          isOpen={showCreateModal || !!editingLawPack}
          onClose={() => {
            setShowCreateModal(false);
            setEditingLawPack(null);
            setUploadProgress({});
            setIsUploading(false);
          }}
          lawPack={editingLawPack}
          onSave={editingLawPack ? handleUpdateLawPack : handleCreateLawPack}
          isLoading={createLawPackMutation.isPending || updateLawPackMutation.isPending || isUploading}
          uploadProgress={uploadProgress}
          isUploading={isUploading}
        />

        {/* File List Modal */}
        <Modal
          isOpen={showFileListModal}
          onClose={() => {
            setShowFileListModal(false);
            setSelectedLawPackFiles(null);
          }}
          title={`Files - ${selectedLawPackFiles?.lawPack.name || ''}`}
          size="md"
        >
          <div className="p-6">
            {selectedLawPackFiles && selectedLawPackFiles.files.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-text-secondary mb-4">
                  Select a file to download. This law pack contains {selectedLawPackFiles.files.length} file(s).
                </p>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedLawPackFiles.files.map((fileInfo, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-bg-light-6 rounded-lg hover:bg-bg-light-1 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-5 h-5 text-text-secondary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {fileInfo.original_filename}
                          </p>
                          <p className="text-xs text-text-secondary">
                            File {fileInfo.order_index + 1} of {selectedLawPackFiles.files.length}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadFile(fileInfo)}
                        className="p-2 text-brand-navy hover:bg-brand-navy hover:text-white rounded transition-colors"
                        title={`Download ${fileInfo.original_filename}`}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-text-secondary mx-auto mb-4 opacity-50" />
                <p className="text-text-secondary">No files available</p>
              </div>
            )}
          </div>
        </Modal>



      </div>
    </DashboardLayout>
  );
}
