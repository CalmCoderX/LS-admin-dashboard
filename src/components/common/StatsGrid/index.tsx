'use client';

import React from 'react';
import clsx from 'clsx';
import { StatsCardSkeleton } from '@/components/ui/SkeletonLoader';

export interface StatCard {
  id: string;
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  change?: {
    value: string | number;
    trend: 'up' | 'down' | 'neutral';
    label?: string;
  };
  subtitle?: string;
  onClick?: () => void;
}

export interface StatsGridProps {
  stats: StatCard[];
  isLoading?: boolean;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

const getGridClass = (columns: number) => {
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

const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
  switch (trend) {
    case 'up':
      return 'text-status-success';
    case 'down':
      return 'text-status-error';
    case 'neutral':
    default:
      return 'text-text-secondary';
  }
};

export default function StatsGrid({
  stats,
  isLoading = false,
  columns = 4,
  className
}: StatsGridProps) {
  if (isLoading) {
    return <StatsCardSkeleton count={stats.length || columns} gridCols={columns} />;
  }

  return (
    <div className={clsx(
      'grid gap-6',
      getGridClass(columns),
      className
    )}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        const isClickable = !!stat.onClick;

        return (
          <div
            key={stat.id}
            className={clsx(
              'card transition-all duration-200',
              isClickable && 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
            )}
            onClick={stat.onClick}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-secondary mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-text-primary mb-1">
                  {typeof stat.value === 'number'
                    ? stat.value.toLocaleString()
                    : stat.value
                  }
                </p>

                {stat.change && (
                  <div className={clsx(
                    'flex items-center gap-1 text-xs font-medium',
                    getTrendColor(stat.change.trend)
                  )}>
                    <span>
                      {stat.change.trend === 'up' && '+'}
                      {stat.change.value}
                    </span>
                    {stat.change.label && (
                      <span className="text-text-secondary">
                        {stat.change.label}
                      </span>
                    )}
                  </div>
                )}

                {stat.subtitle && (
                  <p className="text-xs text-text-secondary mt-1">
                    {stat.subtitle}
                  </p>
                )}
              </div>

              <div className={clsx(
                'flex-shrink-0 p-2',
                isClickable && 'group-hover:scale-110 transition-transform'
              )}>
                <Icon className={clsx(
                  'w-8 h-8',
                  stat.iconColor || 'text-brand-navy'
                )} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
