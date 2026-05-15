import { forwardRef } from 'react';
import { cn } from '../../utils/classNames';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, id, ...props }, ref) => (
    <div className="w-full">
      <input
        ref={ref}
        id={id}
        className={cn(
          'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300',
          className,
        )}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error && id ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={id ? `${id}-error` : undefined} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  ),
);

Input.displayName = 'Input';
