import { cn } from '../../utils/classNames';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white shadow-sm', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: CardProps) {
  return <div className={cn('border-b border-gray-200 px-6 py-4', className)}>{children}</div>;
}

export function CardBody({ className, children }: CardProps) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

export function CardTitle({ className, children }: CardProps) {
  return <h2 className={cn('text-lg font-semibold text-gray-900', className)}>{children}</h2>;
}
