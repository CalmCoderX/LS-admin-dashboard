'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Server } from 'lucide-react';
import { platformAdminApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/error';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { Engine } from '@/types/api';

interface EngineEditDialogProps {
  engine: Engine;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EngineEditDialog({ engine, isOpen, onClose, onSuccess }: EngineEditDialogProps) {
  const [formData, setFormData] = useState({
    name: engine.name,
    queue_url: engine.queue_url,
    service_name: engine.service_name,
    status: engine.status,
    description: engine.description || '',
    version: engine.version || '',
  });

  // Update engine mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{
      name: string;
      queue_url: string;
      service_name: string;
      status: string;
      description: string;
      version: string;
    }> }) =>
      platformAdminApi.updateEngine(id, data),
    onSuccess: () => {
      toast.success('Engine updated successfully');
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update engine'));
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updateData: Partial<{
      name: string;
      queue_url: string;
      service_name: string;
      status: string;
      description: string;
      version: string;
    }> = {};

    if (formData.name !== engine.name) updateData.name = formData.name;
    if (formData.queue_url !== engine.queue_url) updateData.queue_url = formData.queue_url;
    if (formData.service_name !== engine.service_name) updateData.service_name = formData.service_name;
    if (formData.status !== engine.status) updateData.status = formData.status;
    if (formData.description !== (engine.description || '')) updateData.description = formData.description;
    if (formData.version !== (engine.version || '')) updateData.version = formData.version;

    updateMutation.mutate({
      id: engine.id,
      data: updateData
    });
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Engine" size='lg'>
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-brand-navy/10 dark:bg-blue-500/10 rounded-full flex items-center justify-center">
              <Server className="w-5 h-5 text-brand-navy dark:text-blue-400" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-text-primary">Edit Engine</h3>
            <p className="text-sm text-text-secondary">
              Update engine configuration and settings
            </p>
          </div>
        </div>

        {/* Form Fields */}
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
          </div>

          <div>
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
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-text-secondary mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="input-field w-full"
              required
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
              <option value="error">Error</option>
            </select>
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


        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={updateMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Engine'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
