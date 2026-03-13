import { z } from 'zod';

const dailyDetailSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  callTime: z.string().max(50).optional(),
  locationAddress: z.string().max(500).optional(),
  locationPin: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
  actualHours: z.number().min(0).max(24).optional().nullable(),
});

export const bookingDetailsSchema = z.object({
  // Booking-level fields (kept for backward compat)
  locationAddress: z.string().max(500).optional(),
  locationPin: z.string().max(1000).optional(),
  specialInstructions: z.string().max(2000).optional(),
  // Per-day details
  days: z.array(dailyDetailSchema).optional(),
});

export const checkInSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const assignCoordinatorSchema = z.object({
  bookingId: z.string().min(1),
  coordinatorId: z.string().min(1),
});
