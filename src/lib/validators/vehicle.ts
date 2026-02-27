import { z } from 'zod';

export const createVehicleSchema = z.object({
  type: z.enum(['CAR', 'BIKE', 'BOAT', 'PLANE', 'JET_SKI', 'SCOOTER', 'MOTORBIKE', 'RACING_CAR']),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  color: z.string().min(1, 'Color is required'),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  mileage: z.number().int().min(0).optional(),
  condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
  specialFeatures: z.array(z.string()).default([]),
  location: z.string().min(1, 'Location is required'),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const availabilityBlockSchema = z.object({
  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid start date'),
  endDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid end date'),
  reason: z.string().optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type AvailabilityBlockInput = z.infer<typeof availabilityBlockSchema>;
