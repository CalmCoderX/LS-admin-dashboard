'use client';

import { useEffect, useRef } from 'react';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  hasError?: boolean;
  className?: string;
}

function cellClass(digit: string, hasError: boolean, disabled: boolean): string {
  const base =
    'h-12 w-12 rounded-lg border text-center text-lg font-semibold transition-colors duration-200 outline-none';
  const state = disabled
    ? 'cursor-not-allowed opacity-50 border-bg-light-6 bg-white dark:border-gray-600 dark:bg-gray-900'
    : hasError
      ? 'border-red-400 bg-red-50 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-700 dark:bg-red-950/20 dark:text-red-100'
      : digit
        ? 'border-brand-navy bg-brand-navy/5 text-text-primary focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20 dark:border-blue-400 dark:bg-blue-950/20'
        : 'border-bg-light-6 bg-white text-text-primary focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20 dark:border-gray-600 dark:bg-gray-900';

  return `${base} ${state}`;
}

export default function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
  hasError = false,
  className = '',
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.split('').slice(0, length);
  while (digits.length < length) {
    digits.push('');
  }

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (value === '' && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [value]);

  const notifyComplete = (nextValue: string) => {
    if (nextValue.length === length && onComplete) {
      onComplete(nextValue);
    }
  };

  const handleChange = (index: number, digit: string) => {
    if (digit.length > 1) {
      digit = digit.slice(-1);
    }

    if (digit && !/^\d$/.test(digit)) {
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = digit;
    const newValue = newDigits.join('');
    onChange(newValue);
    notifyComplete(newValue);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newDigits = [...digits];

      if (digits[index]) {
        newDigits[index] = '';
        onChange(newDigits.join(''));
      } else if (index > 0) {
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedDigits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pastedDigits) {
      return;
    }

    onChange(pastedDigits);
    notifyComplete(pastedDigits);

    const nextIndex = Math.min(pastedDigits.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className={`flex justify-center gap-2 ${className}`.trim()}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={el => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          value={digit}
          onChange={e => handleChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cellClass(digit, hasError, disabled)}
          maxLength={1}
          autoComplete="one-time-code"
          aria-label={`Digit ${index + 1} of ${length}`}
        />
      ))}
    </div>
  );
}
