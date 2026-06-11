'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { platformAdminApi } from '@/lib/api';
import { ProcessingTask, ProcessingTasksApiResponse } from '@/types/api';
import {
  FileText,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Download,
  Eye,
  FileJson,
  FileCode,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { REPORT_STATUS_OPTIONS } from '@/constants/status';
import { getReportStatusBadge, getProgressColor } from '@/constants/badges';
import { getErrorMessage } from '@/utils/error';
import { TableSkeleton } from '@/components/ui/SkeletonLoader';
import PageHeader from '@/components/common/PageHeader';
import StatsGrid from '@/components/common/StatsGrid';
import Modal from '@/components/ui/Modal';
import { PermanentDeletionDialog } from '@/components/ui/DeletionDialog';

interface TaskFilters {
  status: string;
}


export default function ProcessingTasksPage() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState<TaskFilters>({
    status: '',
  });
  const [selectedTask, setSelectedTask] = useState<ProcessingTask | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    task: ProcessingTask | null;
  }>({ isOpen: false, task: null });
  const [downloadingFile, setDownloadingFile] = useState<{
    taskId: string;
    fileType: string;
  } | null>(null);

  // Fetch processing tasks with pagination and filters
  const { data: tasksResponse, isLoading: isLoadingTasks, error, isRefetching: isRefetchingTasks } = useQuery<ProcessingTasksApiResponse>({
    queryKey: ['processing-tasks', currentPage, pageSize, filters.status],
    queryFn: async () => {
      const params: any = {
        skip: (currentPage - 1) * pageSize,
        limit: pageSize,
      };
      if (filters.status) {
        params.status = filters.status;
      }
      return platformAdminApi.getProcessingTasks(params) as Promise<ProcessingTasksApiResponse>;
    },
  });

  // Extract data from response
  const tasks = tasksResponse?.data?.tasks || [];
  const metadata = tasksResponse?.metadata;
  const totalTasks = metadata?.total || 0;
  const totalPages = Math.ceil(totalTasks / pageSize);

  // Delete task mutation (API expects task_id UUID string, not numeric id)
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return platformAdminApi.deleteProcessingTask(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processing-tasks'] });
      toast.success('Task deleted successfully');
      setDeleteDialog({ isOpen: false, task: null });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error as any, 'Failed to delete task'));
    },
  });

  const handleFilterChange = (key: keyof TaskFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleViewDetails = (task: ProcessingTask) => {
    setSelectedTask(task);
    setShowDetailsModal(true);
  };

  const handleDeleteTask = (task: ProcessingTask) => {
    setDeleteDialog({ isOpen: true, task });
  };

  const handleConfirmDelete = () => {
    if (deleteDialog.task) {
      deleteTaskMutation.mutate(deleteDialog.task.task_id);
    }
  };

  const handleDownloadFile = async (taskId: string, fileType: 'json' | 'html' | 'pdf' | 'excel') => {
    setDownloadingFile({ taskId, fileType });
    try {
      const response = await platformAdminApi.downloadProcessingTaskResult(taskId, fileType);
      
      // Create blob and download
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data as BlobPart]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Determine filename
      const extension = fileType === 'excel' ? 'xlsx' : fileType;
      link.download = `result_${taskId}.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${fileType.toUpperCase()} file downloaded successfully`);
    } catch (error) {
      toast.error(getErrorMessage(error as any, `Failed to download ${fileType.toUpperCase()} file`));
    } finally {
      setDownloadingFile(null);
    }
  };


  // Calculate stats
  const stats = {
    total: totalTasks,
    pending: tasks.filter((t: ProcessingTask) => t.status === 'pending').length,
    processing: tasks.filter((t: ProcessingTask) => t.status === 'processing').length,
    completed: tasks.filter((t: ProcessingTask) => t.status === 'completed').length,
    failed: tasks.filter((t: ProcessingTask) => t.status === 'failed').length,
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <XCircle className="w-12 h-12 text-status-error mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">Error Loading Tasks</h3>
          <p className="text-text-secondary">There was an error loading the processing tasks.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Processing Tasks"
          description="Monitor and manage document processing tasks"
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ['processing-tasks'] });
          }}
          isRefreshing={isRefetchingTasks}
        />

        {/* Stats Cards */}
        <StatsGrid
          isLoading={isLoadingTasks}
          columns={5}
          stats={[
            {
              id: 'total',
              title: 'Total Tasks',
              value: stats.total,
              icon: FileText,
              iconColor: 'text-brand-navy'
            },
            {
              id: 'pending',
              title: 'Pending',
              value: stats.pending,
              icon: Clock,
              iconColor: 'text-gray-500'
            },
            {
              id: 'processing',
              title: 'Processing',
              value: stats.processing,
              icon: RefreshCw,
              iconColor: 'text-status-info'
            },
            {
              id: 'completed',
              title: 'Completed',
              value: stats.completed,
              icon: CheckCircle,
              iconColor: 'text-status-success'
            },
            {
              id: 'failed',
              title: 'Failed',
              value: stats.failed,
              icon: XCircle,
              iconColor: 'text-status-error'
            }
          ]}
        />

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-text-primary">Status:</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input-field w-48"
            >
              {REPORT_STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {filters.status && (
              <button
                onClick={() => handleFilterChange('status', '')}
                className="btn-secondary text-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Tasks Table */}
        <div className="card p-0 overflow-hidden">
          {isLoadingTasks ? (
            <TableSkeleton rows={pageSize} columns={7} />
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No Tasks Found</h3>
              <p className="text-text-secondary">
                {filters.status ? 'No tasks match your filters.' : 'No processing tasks yet.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="px-6 py-3 text-left">Task ID</th>
                      <th className="px-6 py-3 text-left">Title</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Progress</th>
                      <th className="px-6 py-3 text-left">Input Type</th>
                      <th className="px-6 py-3 text-left">Created</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-bg-light-6 dark:divide-gray-600">
                    {tasks.map((task: ProcessingTask) => (
                      <tr key={task.id} className="table-row">
                        <td className="px-6 py-4 font-mono text-sm text-text-primary">
                          {task.task_id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <p className="font-medium text-text-primary truncate">
                              {task.title || 'Untitled Task'}
                            </p>
                            {task.engine_name && (
                              <p className="text-xs text-text-secondary">
                                Engine: {task.engine_name}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">{getReportStatusBadge(task.status)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={clsx('h-full transition-all', getProgressColor(task.progress_percent || 0))}
                                style={{ width: `${task.progress_percent || 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-text-secondary">
                              {task.progress_percent || 0}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="badge badge-secondary capitalize">
                            {task.input_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary">
                          {task.created_at ? format(new Date(task.created_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewDetails(task)}
                              className="btn-icon"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task)}
                              className="btn-icon text-status-error hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Delete Task"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-text-secondary">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalTasks)} of {totalTasks} tasks
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="btn-secondary disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-text-secondary">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="btn-secondary disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Task Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedTask(null);
        }}
        title="Task Details"
        size="lg"
      >
        {selectedTask && (
          <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary">Task ID</label>
                <p className="font-mono text-sm text-text-primary">{selectedTask.task_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">Title</label>
                <p className="text-text-primary">{selectedTask.title || 'Untitled Task'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">Status</label>
                <div className="mt-1">{getReportStatusBadge(selectedTask.status)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">Progress</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full transition-all', getProgressColor(selectedTask.progress_percent || 0))}
                      style={{ width: `${selectedTask.progress_percent || 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{selectedTask.progress_percent || 0}%</span>
                </div>
                {selectedTask.status_message && (
                  <p className="text-sm text-text-secondary mt-1">{selectedTask.status_message}</p>
                )}
              </div>
              {selectedTask.engine_name && (
                <div>
                  <label className="text-sm font-medium text-text-secondary">Engine</label>
                  <p className="text-text-primary">{selectedTask.engine_name}</p>
                </div>
              )}
              {selectedTask.law_pack_name && (
                <div>
                  <label className="text-sm font-medium text-text-secondary">Law Pack</label>
                  <p className="text-text-primary">{selectedTask.law_pack_name}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-text-secondary">Input Type</label>
                <p className="text-text-primary capitalize">{selectedTask.input_type}</p>
              </div>
              {selectedTask.processing_time_seconds && (
                <div>
                  <label className="text-sm font-medium text-text-secondary">Processing Time</label>
                  <p className="text-text-primary">{selectedTask.processing_time_seconds}s</p>
                </div>
              )}
              {selectedTask.error_message && (
                <div>
                  <label className="text-sm font-medium text-status-error">Error Message</label>
                  <p className="text-sm text-status-error bg-red-50 dark:bg-red-900/20 p-3 rounded">
                    {selectedTask.error_message}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Created</label>
                  <p className="text-sm text-text-primary">
                    {selectedTask.created_at ? format(new Date(selectedTask.created_at), 'MMM dd, yyyy HH:mm:ss') : 'N/A'}
                  </p>
                </div>
                {selectedTask.completed_at && (
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Completed</label>
                    <p className="text-sm text-text-primary">
                      {format(new Date(selectedTask.completed_at), 'MMM dd, yyyy HH:mm:ss')}
                    </p>
                  </div>
                )}
              </div>
              {selectedTask.status === 'completed' && (selectedTask.result_json_path || selectedTask.result_html_path || selectedTask.result_pdf_path || selectedTask.result_excel_path) && (
                <div>
                  <label className="text-sm font-medium text-text-secondary mb-2 block">Result Files</label>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {selectedTask.result_json_path && (
                      <button
                        onClick={() => handleDownloadFile(selectedTask.task_id, 'json')}
                        disabled={downloadingFile?.taskId === selectedTask.task_id && downloadingFile?.fileType === 'json'}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download JSON result"
                      >
                        {downloadingFile?.taskId === selectedTask.task_id && downloadingFile?.fileType === 'json' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileJson className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">JSON</span>
                        {!(downloadingFile?.taskId === selectedTask.task_id && downloadingFile?.fileType === 'json') && (
                          <Download className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    {selectedTask.result_html_path && (
                      <button
                        onClick={() => handleDownloadFile(selectedTask.task_id, 'html')}
                        disabled={downloadingFile?.taskId === selectedTask.task_id && downloadingFile?.fileType === 'html'}
                        className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download HTML result"
                      >
                        {downloadingFile?.taskId === selectedTask.task_id && downloadingFile?.fileType === 'html' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileCode className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">HTML</span>
                        {!(downloadingFile?.taskId === selectedTask.task_id && downloadingFile?.fileType === 'html') && (
                          <Download className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    {selectedTask.result_pdf_path && (
                      <button
                        onClick={() => handleDownloadFile(selectedTask.task_id, 'pdf')}
                        disabled={downloadingFile?.taskId === selectedTask.task_id && downloadingFile?.fileType === 'pdf'}
                        className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download PDF result"
                      >
                        {downloadingFile?.taskId === selectedTask.task_id && downloadingFile?.fileType === 'pdf' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">PDF</span>
                        {!(downloadingFile?.taskId === selectedTask.task_id && downloadingFile?.fileType === 'pdf') && (
                          <Download className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    {selectedTask.result_excel_path && (
                      <button
                        onClick={() => handleDownloadFile(selectedTask.task_id, 'excel')}
                        disabled={downloadingFile?.taskId === selectedTask.task_id && downloadingFile?.fileType === 'excel'}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download Excel result"
                      >
                        {downloadingFile?.taskId === selectedTask.task_id && downloadingFile?.fileType === 'excel' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">Excel</span>
                        {!(downloadingFile?.taskId === selectedTask.task_id && downloadingFile?.fileType === 'excel') && (
                          <Download className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <PermanentDeletionDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, task: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Processing Task"
        description="Are you sure you want to permanently delete this processing task? This action cannot be undone."
        itemName={deleteDialog.task?.title || deleteDialog.task?.task_id}
        isLoading={deleteTaskMutation.isPending}
        consequences={[
          'The task and all associated data will be permanently removed',
          'Result files will be deleted from storage',
          'This action cannot be undone'
        ]}
        requiresConfirmation={true}
      />
    </DashboardLayout>
  );
}