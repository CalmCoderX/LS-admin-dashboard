import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export default function LoadingSpinner({
  size = 'md',
  className = '',
  text
}: LoadingSpinnerProps) {
  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className={clsx('animate-spin text-brand-navy', sizeClasses[size])} />
        {text && (
          <p className="text-sm text-text-secondary">{text}</p>
        )}
      </div>
    </div>
  );
}
