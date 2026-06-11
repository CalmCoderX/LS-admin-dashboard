'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { platformAdminApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/error';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import clsx from 'clsx';
import { LawPack } from '@/types/api';

interface EngineCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EngineCreateDialog({ isOpen, onClose, onSuccess }: EngineCreateDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    queue_url: '',
    service_name: '',
    description: '',
    version: '',
    law_pack_ids: [] as number[],
  });

  // Fetch unassigned law packs (for new engine creation)
  const { data: lawPacksData, isLoading: isLoadingLawPacks } = useQuery({
    queryKey: ['unassigned-law-packs'],
    queryFn: () => platformAdminApi.getUnassignedLawPacks() as Promise<{ law_packs: Array<LawPack & { is_assigned_to_this_engine: boolean; is_assigned_to_other_engine: boolean }> }>,
    refetchOnWindowFocus: false,
    enabled: isOpen, // Only fetch when dialog is open
  });

  // Create engine mutation
  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      queue_url: string;
      service_name: string;
      version?: string;
      description?: string;
      law_pack_ids?: number[];
    }) => platformAdminApi.createEngine(data),
    onSuccess: (_, variables) => {
      const hasLawPacks = variables.law_pack_ids && variables.law_pack_ids.length > 0;
      toast.success(
        hasLawPacks 
          ? 'Engine created successfully. Law packs assigned to engine.'
          : 'Engine created successfully. You can assign law packs later.'
      );
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create engine'));
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createMutation.mutate({
      name: formData.name,
      queue_url: formData.queue_url,
      service_name: formData.service_name,
      version: formData.version,
      description: formData.description,
      law_pack_ids: formData.law_pack_ids,
    });
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number | number[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLawPackToggle = (lawPackId: number) => {
    setFormData(prev => ({
      ...prev,
      law_pack_ids: prev.law_pack_ids.includes(lawPackId)
        ? prev.law_pack_ids.filter(id => id !== lawPackId)
        : [...prev.law_pack_ids, lawPackId]
    }));
  };

  // Server already filters for active law packs when active=true parameter is used
  const activeLawPacks = lawPacksData?.law_packs || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Engine" size='lg'>
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        {/* Basic Information */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-2">
                Engine Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="input-field w-full"
                required
                placeholder="e.g., Legal Analysis Engine v1"
              />
            </div>

            <div>
              <label htmlFor="version" className="block text-sm font-medium text-text-secondary mb-2">
                Version
              </label>
              <input
                type="text"
                id="version"
                value={formData.version}
                onChange={(e) => handleInputChange('version', e.target.value)}
                className="input-field w-full"
                placeholder="e.g., 1.2.0"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="queue_url" className="block text-sm font-medium text-text-secondary mb-2">
                Queue URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="queue_url"
                value={formData.queue_url}
                onChange={(e) => handleInputChange('queue_url', e.target.value)}
                className="input-field w-full"
                required
                placeholder="https://sqs.us-east-1.amazonaws.com/123456789012/lexa-engine-law-queue"
              />
              <p className="mt-1 text-xs text-text-secondary">
                Full AWS SQS queue URL for this engine's worker queue
              </p>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="service_name" className="block text-sm font-medium text-text-secondary mb-2">
                ECS Service Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="service_name"
                value={formData.service_name}
                onChange={(e) => handleInputChange('service_name', e.target.value)}
                className="input-field w-full"
                required
                placeholder="lexa-engine-law-service"
              />
              <p className="mt-1 text-xs text-text-secondary">
                ECS service name used for worker health checks
              </p>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="input-field w-full"
                placeholder="Describe the engine's purpose and capabilities..."
              />
            </div>
          </div>

          {/* Law Pack Selection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Law Packs to Assign (Optional)
            </label>
            <p className="text-xs text-text-secondary mb-4">
              Optionally select which law packs should be assigned to this engine. Selected law packs will be sent to the engine with each processing request. You can assign law packs later if you skip this step.
            </p>

            {isLoadingLawPacks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-brand-navy" />
                <span className="ml-2 text-text-secondary">Loading law packs...</span>
              </div>
            ) : activeLawPacks.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <p>No unassigned law packs available.</p>
                <p className="text-xs mt-2">All active law packs are already assigned to engines. You can still create the engine and assign law packs later.</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto border border-bg-light-6 dark:border-gray-700 rounded-md">
                <div className="space-y-0">
                  {activeLawPacks.map((lawPack: LawPack) => (
                    <label
                      key={lawPack.id}
                      className={clsx(
                        'flex items-center p-4 cursor-pointer hover:bg-bg-light-1 dark:hover:bg-gray-800 border-b border-bg-light-6 dark:border-gray-700 last:border-b-0',
                        formData.law_pack_ids.includes(lawPack.id) && 'bg-blue-50 dark:bg-blue-900/20'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={formData.law_pack_ids.includes(lawPack.id)}
                        onChange={() => handleLawPackToggle(lawPack.id)}
                        className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              {lawPack.name}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {lawPack.jurisdiction} • v{lawPack.version}
                            </p>
                          </div>
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                              {lawPack.status}
                            </span>
                          </div>
                        </div>
                        {lawPack.description && (
                          <p className="text-xs text-text-secondary mt-1">
                            {lawPack.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-2 text-sm text-text-secondary">
              Selected: {formData.law_pack_ids.length} law pack{formData.law_pack_ids.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={createMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Engine
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
