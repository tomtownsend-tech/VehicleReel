import { z } from 'zod';

export const createOptionSchema = z.object({
  vehicleId: z.string().min(1),
  rateType: z.enum(['PER_DAY', 'PACKAGE']),
  rateCents: z.number().int().positive('Rate must be positive'),
  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid start date'),
  endDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid end date'),
  responseDeadlineHours: z.number().int().min(12).max(72),
  confirmationWindowHours: z.number().int().min(12).max(48),
});

export type CreateOptionInput = z.infer<typeof createOptionSchema>;
