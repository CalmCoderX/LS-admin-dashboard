'use client';

import React from 'react';
import { useForm, FieldValues, UseFormProps, Path, DefaultValues, SubmitHandler } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import clsx from 'clsx';

export interface FormField<T extends FieldValues = FieldValues> {
  name: Path<T>;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio';
  placeholder?: string;
  required?: boolean;
  validation?: object;
  options?: Array<{ value: string | number; label: string }>;
  description?: string;
  disabled?: boolean;
  defaultValue?: string | number | boolean;
  colSpan?: 1 | 2;
}

export interface FormSection<T extends FieldValues = FieldValues> {
  title: string;
  description?: string;
  fields: FormField<T>[];
  columns?: 1 | 2;
}

export interface FormModalProps<T extends FieldValues = FieldValues> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sections: FormSection<T>[];
  onSubmit: (data: T) => void;
  isLoading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  defaultValues?: Partial<T>;
  mode?: 'create' | 'edit';
  formProps?: UseFormProps<T>;
}

export default function FormModal<T extends FieldValues = FieldValues>({
  isOpen,
  onClose,
  title,
  sections,
  onSubmit,
  isLoading = false,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  size = 'lg',
  defaultValues,
  mode = 'create',
  formProps
}: FormModalProps<T>) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<T>({
    defaultValues: (defaultValues || {}) as DefaultValues<T>,
    ...formProps
  });

  // Reset form when modal opens/closes or defaultValues change
  React.useEffect(() => {
    if (isOpen && defaultValues) {
      reset(defaultValues as DefaultValues<T>);
    } else if (!isOpen) {
      reset();
    }
  }, [isOpen, defaultValues, reset]);

  const onFormSubmit: SubmitHandler<T> = (data) => {
    onSubmit(data);
  };

  const renderField = (field: FormField<T>, sectionColumns: number = 1) => {
    const fieldError = errors[field.name];
    const fieldValue = watch(field.name);

    const validation = {
      required: field.required ? `${field.label} is required` : false,
      ...field.validation
    };

    const fieldClass = clsx(
      field.colSpan === 2 && sectionColumns === 2 ? 'md:col-span-2' : '',
      'space-y-2'
    );

    return (
      <div key={String(field.name)} className={fieldClass}>
        <label className="block text-sm font-medium text-text-primary">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {field.description && (
          <p className="text-xs text-text-secondary mb-2">{field.description}</p>
        )}

        {field.type === 'select' && (
          <select
            {...register(field.name, validation)}
            className="input-field"
            disabled={field.disabled || isLoading}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {field.type === 'textarea' && (
          <textarea
            {...register(field.name, validation)}
            placeholder={field.placeholder}
            rows={3}
            className="input-field resize-none"
            disabled={field.disabled || isLoading}
          />
        )}

        {field.type === 'checkbox' && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register(field.name, validation)}
              className="w-4 h-4 text-brand-navy bg-gray-100 border-gray-300 rounded focus:ring-brand-navy dark:bg-gray-700 dark:border-gray-600"
              disabled={field.disabled || isLoading}
            />
            <span className="text-sm text-text-primary">{field.placeholder || `Enable ${field.label}`}</span>
          </label>
        )}

        {['text', 'email', 'password', 'number'].includes(field.type) && (
          <input
            type={field.type}
            {...register(field.name, validation)}
            placeholder={field.placeholder}
            className="input-field"
            disabled={field.disabled || isLoading}
          />
        )}

        {fieldError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {String(fieldError.message) || 'This field is required'}
          </p>
        )}
      </div>
    );
  };

  const renderSection = (section: FormSection<T>, index: number) => (
    <div key={index} className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-text-primary">{section.title}</h3>
        {section.description && (
          <p className="text-sm text-text-secondary mt-1">{section.description}</p>
        )}
      </div>

      <div className={clsx(
        'grid gap-4',
        section.columns === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
      )}>
        {section.fields.map((field, fieldIndex) => (
          <div key={fieldIndex}>
            {renderField(field, section.columns)}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="p-6">
        <div className="space-y-6">
          {sections.map((section, index) => renderSection(section, index))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-bg-light-6 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Convenience hook for common form patterns
export function useFormModal<T extends FieldValues = FieldValues>(
  defaultValues?: Partial<T>,
  onSubmit?: (data: T) => void
) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  const handleSubmit = async (data: T) => {
    if (onSubmit) {
      setIsLoading(true);
      try {
        await onSubmit(data);
        close();
      } catch (error) {
        // Error handling can be done by the parent
        console.error('Form submission error:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return {
    isOpen,
    isLoading,
    open,
    close,
    handleSubmit
  };
}
