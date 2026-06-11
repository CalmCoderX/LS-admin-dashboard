'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Package, CheckCircle } from 'lucide-react';
import { platformAdminApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/error';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import clsx from 'clsx';
import { LawPack, Engine } from '@/types/api';

interface EngineDistributeDialogProps {
  engine: Engine;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EngineDistributeDialog({ engine, isOpen, onClose, onSuccess }: EngineDistributeDialogProps) {
  const queryClient = useQueryClient();
  
  // Initialize selected law packs (will be updated when data loads)
  const [selectedLawPacks, setSelectedLawPacks] = useState<number[]>([]);

  // Fetch assignable law packs for this engine
  const { data: lawPacksData, isLoading: isLoadingLawPacks } = useQuery({
    queryKey: ['assignable-law-packs', engine.id],
    queryFn: () => platformAdminApi.getAssignableLawPacks(engine.id) as Promise<{ law_packs: Array<LawPack & { is_assigned_to_this_engine: boolean; is_assigned_to_other_engine: boolean }> }>,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Always refetch when dialog opens
    enabled: isOpen,
    staleTime: 0, // Always consider data stale so it refetches when dialog opens
  });

  // Get currently assigned law pack IDs from the API response
  const currentlyAssignedIds = lawPacksData?.law_packs
    .filter(lp => lp.is_assigned_to_this_engine)
    .map(lp => lp.id) || [];

  // Update selected law packs when dialog opens or data loads
  useEffect(() => {
    if (isOpen && lawPacksData) {
      // Initialize with currently assigned law packs
      const assignedIds = lawPacksData.law_packs
        .filter(lp => lp.is_assigned_to_this_engine)
        .map(lp => lp.id);
      setSelectedLawPacks(assignedIds);
    }
  }, [isOpen, lawPacksData]);

  // Unified assignment management mutation
  const manageAssignmentMutation = useMutation({
    mutationFn: (lawPackIds: number[]) => platformAdminApi.manageEngineLawPacks(engine.id, lawPackIds),
    onSuccess: async (response) => {
      const messages = [];
      if (response.assigned_law_packs && response.assigned_law_packs.length > 0) {
        messages.push(`${response.assigned_law_packs.length} assigned`);
      }
      if (response.unassigned_law_packs && response.unassigned_law_packs.length > 0) {
        messages.push(`${response.unassigned_law_packs.length} unassigned`);
      }
      
      if (messages.length > 0) {
        toast.success(`Law pack assignments updated: ${messages.join(', ')}`);
      }
      
      // Invalidate and refetch queries to update the UI
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['assignable-law-packs', engine.id] }),
        queryClient.invalidateQueries({ queryKey: ['engines-admin'] }),
        queryClient.invalidateQueries({ queryKey: ['unassigned-law-packs'] }),
      ]);
      
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update law pack assignments'));
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate which law packs to assign and unassign
    const toAssign = selectedLawPacks.filter(id => !currentlyAssignedIds.includes(id));
    const toUnassign = currentlyAssignedIds.filter(id => !selectedLawPacks.includes(id));

    if (toAssign.length === 0 && toUnassign.length === 0) {
      onClose();
      return;
    }

    // Send the complete list of selected law packs (PUT method sets the state)
    manageAssignmentMutation.mutate(selectedLawPacks);
  };

  const toggleLawPackSelection = (lawPackId: number) => {
    setSelectedLawPacks(prev =>
      prev.includes(lawPackId)
        ? prev.filter(id => id !== lawPackId)
        : [...prev, lawPackId]
    );
  };

  const toggleSelectAll = () => {
    const allLawPackIds = availableLawPacks.map(lp => lp.id);
    if (selectedLawPacks.length === allLawPackIds.length) {
      setSelectedLawPacks([]);
    } else {
      setSelectedLawPacks(allLawPackIds);
    }
  };

  // Filter for available law packs
  const availableLawPacks = lawPacksData?.law_packs || [];
  
  // Calculate changes for display
  const toAssign = selectedLawPacks.filter(id => !currentlyAssignedIds.includes(id));
  const toUnassign = currentlyAssignedIds.filter(id => !selectedLawPacks.includes(id));
  const hasChanges = toAssign.length > 0 || toUnassign.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage Law Pack Assignments for "${engine.name}"`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        {/* Engine Info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-blue-500" />
            <div>
              <h4 className="font-medium text-text-primary">{engine.name}</h4>
              <p className="text-sm text-text-secondary">{engine.queue_url}</p>
              <p className="text-xs text-text-secondary">{engine.service_name}</p>
              <p className="text-xs text-text-secondary mt-1">
                Currently has {engine.supported_law_pack_count} law pack(s) assigned
              </p>
            </div>
          </div>
        </div>

        {/* Law Pack Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-medium text-text-primary">
              Manage Law Pack Assignments
            </h4>
            {availableLawPacks.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {selectedLawPacks.length === availableLawPacks.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {isLoadingLawPacks ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-brand-navy" />
              <span className="ml-2 text-text-secondary">Loading law packs...</span>
            </div>
          ) : availableLawPacks.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              <p>No law packs available for assignment to this engine.</p>
              <p className="text-xs mt-2">All active law packs are already assigned to other engines.</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto border border-bg-light-6 dark:border-gray-700 rounded-md">
              <div className="space-y-0">
                {availableLawPacks.map((lawPack: LawPack & { is_assigned_to_this_engine: boolean }) => {
                  const isCurrentlyAssigned = lawPack.is_assigned_to_this_engine;
                  const isSelected = selectedLawPacks.includes(lawPack.id);

                  return (
                    <label
                      key={lawPack.id}
                      className={clsx(
                        'flex items-center p-4 cursor-pointer hover:bg-bg-light-1 dark:hover:bg-gray-800 border-b border-bg-light-6 dark:border-gray-700 last:border-b-0',
                        isSelected && 'bg-blue-50 dark:bg-blue-900/20',
                        isCurrentlyAssigned && 'bg-green-50 dark:bg-green-900/20'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleLawPackSelection(lawPack.id)}
                        className="mr-3 rounded border-gray-300"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-text-primary truncate">
                            {lawPack.name}
                          </p>
                          {isCurrentlyAssigned && (
                            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <CheckCircle className="w-3 h-3" />
                              <span>Assigned</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-text-secondary mt-1">
                          <span>{lawPack.jurisdiction}</span>
                          <span>v{lawPack.version}</span>
                          <span className={clsx(
                            'px-2 py-0.5 rounded-full',
                            lawPack.status === 'active'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          )}>
                            {lawPack.status}
                          </span>
                        </div>
                        {lawPack.description && (
                          <p className="text-xs text-text-secondary mt-1 truncate">
                            {lawPack.description}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Changes Summary */}
        {hasChanges && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4 space-y-2">
            {toAssign.length > 0 && (
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>+{toAssign.length}</strong> law pack(s) will be assigned
              </p>
            )}
            {toUnassign.length > 0 && (
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>-{toUnassign.length}</strong> law pack(s) will be unassigned
              </p>
            )}
          </div>
        )}
        {!hasChanges && selectedLawPacks.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>{selectedLawPacks.length}</strong> law pack(s) currently assigned
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={manageAssignmentMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={manageAssignmentMutation.isPending || !hasChanges}
          >
            {manageAssignmentMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
