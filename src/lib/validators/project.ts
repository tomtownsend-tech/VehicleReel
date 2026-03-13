import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'Name must be 120 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid start date'),
  endDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid end date'),
  shootDayHours: z.number().int().refine((v) => v === 10 || v === 12, 'Shoot day must be 10 or 12 hours').optional(),
}).refine((data) => {
  return new Date(data.endDate) >= new Date(data.startDate);
}, { message: 'End date must be on or after start date', path: ['endDate'] });

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid start date').optional(),
  endDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid end date').optional(),
  shootDayHours: z.number().int().refine((v) => v === 10 || v === 12, 'Shoot day must be 10 or 12 hours').optional(),
});

export const addOptionSchema = z.object({
  optionId: z.string().min(1, 'Option ID is required'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
