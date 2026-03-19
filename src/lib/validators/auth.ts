import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['OWNER', 'PRODUCTION', 'ART_DEPARTMENT']),
  phone: z.string().min(1, 'Phone number is required'),
  companyName: z.string().optional(),
  acceptTc: z.literal(true, { message: 'You must accept the Terms & Conditions' }),
  acceptPopia: z.literal(true, { message: 'You must consent to POPIA data processing' }),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
