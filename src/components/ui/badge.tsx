import { cn } from '@/lib/utils';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  className?: string;
}

const variants = {
  default: 'bg-white/10 text-white/70',
  success: 'bg-emerald-400/10 text-emerald-400',
  warning: 'bg-amber-400/10 text-amber-400',
  danger: 'bg-red-400/10 text-red-400',
  info: 'bg-blue-400/10 text-blue-400',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}
