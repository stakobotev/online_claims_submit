import { forwardRef } from 'react';
import { cn } from '../../utils/classNames';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div>
      <label className={cn('flex items-start gap-2 cursor-pointer', className)} htmlFor={id}>
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error && id ? `${id}-error` : undefined}
          {...props}
        />
        <span className="text-sm text-gray-700">{label}</span>
      </label>
      {error && (
        <p id={id ? `${id}-error` : undefined} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  ),
);

Checkbox.displayName = 'Checkbox';
