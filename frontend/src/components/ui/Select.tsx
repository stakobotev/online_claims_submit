import { forwardRef } from 'react';
import { cn } from '../../utils/classNames';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, id, children, placeholder, ...props }, ref) => (
    <div className="w-full">
      <select
        ref={ref}
        id={id}
        className={cn(
          'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300',
          className,
        )}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error && id ? `${id}-error` : undefined}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      {error && (
        <p id={id ? `${id}-error` : undefined} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  ),
);

Select.displayName = 'Select';
