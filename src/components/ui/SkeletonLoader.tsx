'use client';

import clsx from 'clsx';

interface SkeletonLoaderProps {
  className?: string;
}

export function SkeletonLoader({ className }: SkeletonLoaderProps) {
  return (
    <div className={clsx("animate-pulse bg-gray-200 dark:bg-gray-700 rounded", className)} />
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="table-header">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-6 py-3 text-left">
                <SkeletonLoader className="h-4 w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-bg-light-6 dark:divide-gray-600">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="table-row">
              {Array.from({ length: columns }).map((_, j) => (
                <td key={j} className="px-6 py-4">
                  {j === 0 ? (
                    // First column - organization name with avatar
                    <div className="flex items-center">
                      <SkeletonLoader className="w-10 h-10 rounded-lg" />
                      <div className="ml-3 space-y-2">
                        <SkeletonLoader className="h-4 w-32" />
                        <SkeletonLoader className="h-3 w-24" />
                      </div>
                    </div>
                  ) : j === 1 ? (
                    // Second column - tier badge
                    <SkeletonLoader className="h-6 w-20 rounded-full" />
                  ) : j === 2 ? (
                    // Third column - status badge
                    <SkeletonLoader className="h-6 w-16 rounded-full" />
                  ) : j === columns - 1 ? (
                    // Last column - action buttons
                    <div className="flex items-center gap-2">
                      <SkeletonLoader className="w-8 h-8 rounded" />
                      <SkeletonLoader className="w-8 h-8 rounded" />
                      <SkeletonLoader className="w-8 h-8 rounded" />
                    </div>
                  ) : (
                    // Other columns - regular content
                    <SkeletonLoader className="h-4 w-16" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface StatsCardSkeletonProps {
  count?: number;
  gridCols?: 2 | 3 | 4 | 5;
}

const getSkeletonGridClass = (columns: number) => {
  switch (columns) {
    case 2:
      return 'grid-cols-1 md:grid-cols-2';
    case 3:
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    case 4:
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    case 5:
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5';
    default:
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
  }
};

export function StatsCardSkeleton({ count = 4, gridCols = 4 }: StatsCardSkeletonProps) {
  return (
    <div className={clsx('grid gap-6', getSkeletonGridClass(gridCols))}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <SkeletonLoader className="h-4 w-20 mb-2" />
              <SkeletonLoader className="h-8 w-16 mb-1" />
              <SkeletonLoader className="h-3 w-24" />
            </div>
            <SkeletonLoader className="w-8 h-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Comprehensive page skeleton for loading states
export function CommonPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <SkeletonLoader className="h-8 w-48 mb-2" />
          <SkeletonLoader className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <SkeletonLoader className="h-10 w-24" />
          <SkeletonLoader className="h-10 w-20" />
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCardSkeleton count={4} />

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="p-6 border-b border-bg-light-6 dark:border-gray-700">
              <SkeletonLoader className="h-6 w-1/3 mb-2" />
              <SkeletonLoader className="h-4 w-2/3" />
            </div>
            <div className="p-6">
              <SkeletonLoader className="w-full rounded-lg h-80" />
            </div>
          </div>
          <TableSkeleton rows={8} columns={5} />
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card">
              <div className="mb-4">
                <SkeletonLoader className="h-6 w-1/3 mb-2" />
                <SkeletonLoader className="h-4 w-2/3" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: i === 0 ? 4 : 3 }).map((_, j) => (
                  <div key={j} className="flex items-center space-x-4">
                    <SkeletonLoader className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <SkeletonLoader className="h-4 w-full" />
                      <SkeletonLoader className="h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
