import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number): string {
  return `R${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 0 })}`;
}

export function formatVehicleType(type: string, customType?: string | null): string {
  if (type === 'OTHER' && customType) return customType;
  return type.toLowerCase().replace(/_/g, ' ');
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
