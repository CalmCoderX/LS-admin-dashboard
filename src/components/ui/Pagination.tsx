import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
  totalItems?: number;
  itemsPerPage?: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showInfo = true,
  totalItems = 0,
  itemsPerPage = 20,
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-t border-bg-light-6 dark:border-gray-700">
      {showInfo && (
        <div className="flex items-center text-sm text-text-secondary">
          <span>
            Showing {startItem} to {endItem} of {totalItems} results
          </span>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
            currentPage <= 1
              ? 'text-text-secondary cursor-not-allowed'
              : 'text-text-primary hover:bg-bg-light-1 dark:hover:bg-gray-700'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex items-center space-x-1">
          {visiblePages.map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...'}
              className={clsx(
                'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                page === currentPage
                  ? 'bg-brand-navy dark:bg-blue-600 text-white'
                  : page === '...'
                  ? 'text-text-secondary cursor-default'
                  : 'text-text-primary hover:bg-bg-light-1 dark:hover:bg-gray-700'
              )}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
            currentPage >= totalPages
              ? 'text-text-secondary cursor-not-allowed'
              : 'text-text-primary hover:bg-bg-light-1 dark:hover:bg-gray-700'
          )}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
