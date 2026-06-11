'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Loader2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'select' | 'input';
}

export interface SearchFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  isSearching?: boolean;

  filters?: FilterField[];
  showFilters?: boolean;
  onToggleFilters?: () => void;

  showDeleted?: boolean;
  onToggleDeleted?: () => void;
  deletedLabel?: string;

  onClearFilters?: () => void;
  className?: string;

  extraActions?: React.ReactNode;
}

export default function SearchFilters({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  isSearching = false,

  filters = [],
  showFilters = false,
  onToggleFilters,

  showDeleted = false,
  onToggleDeleted,
  deletedLabel = "Show Deleted",

  onClearFilters,
  className,

  extraActions
}: SearchFiltersProps) {
  const [screenSize, setScreenSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('xl');

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth;
        if (width < 768) setScreenSize('sm');
        else if (width < 1024) setScreenSize('md');
        else if (width < 1280) setScreenSize('lg');
        else setScreenSize('xl');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getGridColumns = () => {
    switch (screenSize) {
      case 'sm': return 1;
      case 'md': return Math.min(filters.length, 2);
      case 'lg': return Math.min(filters.length, 3);
      case 'xl': return Math.min(filters.length, 4);
      default: return Math.min(filters.length, 4);
    }
  };
  const hasActiveFilters = filters.some(filter => filter.value !== '') || searchValue !== '';

  return (
    <div className={clsx('card', className)}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-medium-2 dark:text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input-field pl-10 pr-10 w-full"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-medium-2 dark:text-gray-400 animate-spin" />
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Extra Actions */}
          {extraActions}

          {/* Filter Toggle */}
          {onToggleFilters && filters.length > 0 && (
            <button
              onClick={onToggleFilters}
              className={clsx(
                'btn-secondary flex items-center gap-2',
                showFilters && 'bg-brand-navy text-white hover:bg-brand-blue-1 dark:bg-blue-600 dark:hover:bg-blue-700'
              )}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          )}

          {/* Show Deleted Toggle */}
          {onToggleDeleted && (
            <button
              onClick={onToggleDeleted}
              className={clsx(
                'btn-secondary flex items-center gap-2',
                showDeleted && 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
              )}
            >
              <AlertTriangle className="w-4 h-4" />
              {showDeleted ? deletedLabel.replace('Show', 'Hide') : deletedLabel}
            </button>
          )}
        </div>
      </div>

      {/* Filter Options */}
      {showFilters && filters.length > 0 && (
        <div className="mt-4 pt-4 border-t border-bg-light-6 dark:border-gray-700">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${getGridColumns()}, 1fr)`
            }}
          >
            {filters.map((filter) => (
              <div key={filter.id}>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {filter.label}
                </label>
                {filter.type === 'input' ? (
                  <input
                    type="text"
                    placeholder={filter.placeholder}
                    value={filter.value}
                    onChange={(e) => filter.onChange(e.target.value)}
                    className="input-field"
                  />
                ) : (
                  <select
                    value={filter.value}
                    onChange={(e) => filter.onChange(e.target.value)}
                    className="input-field"
                  >
                    {filter.options.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && onClearFilters && (
            <div className="mt-4 pt-4 border-t border-bg-light-6 dark:border-gray-700">
              <button
                onClick={onClearFilters}
                className="text-sm text-brand-navy hover:text-brand-navy-dark dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
