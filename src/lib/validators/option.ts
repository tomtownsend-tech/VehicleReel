import { z } from 'zod';
import { toUTCDate, todayUTC } from '@/lib/utils/date';

export const createOptionSchema = z.object({
  vehicleId: z.string().min(1),
  rateType: z.enum(['PER_DAY', 'PACKAGE']),
  rateCents: z.number().int().positive('Rate must be positive'),
  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid start date'),
  endDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid end date'),
  responseDeadlineHours: z.number().int().min(12).max(72),
  confirmationWindowHours: z.number().int().min(12).max(48),
}).refine((data) => {
  const start = toUTCDate(data.startDate);
  const end = toUTCDate(data.endDate);
  return end >= start;
}, { message: 'End date must be on or after start date', path: ['endDate'] })
.refine((data) => {
  const start = toUTCDate(data.startDate);
  const today = todayUTC();
  return start >= today;
}, { message: 'Start date must not be in the past', path: ['startDate'] });

export type CreateOptionInput = z.infer<typeof createOptionSchema>;
