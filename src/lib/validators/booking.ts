import { z } from 'zod';

export const bookingDetailsSchema = z.object({
  locationAddress: z.string().max(500).optional(),
  locationPin: z.string().url().max(1000).optional(),
  specialInstructions: z.string().max(2000).optional(),
  dailyCallTimes: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    callTime: z.string().max(50),
  })).optional(),
});

export const checkInSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const assignCoordinatorSchema = z.object({
  bookingId: z.string().min(1),
  coordinatorId: z.string().min(1),
});
