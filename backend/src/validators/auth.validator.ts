import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Please provide a valid institutional email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['STUDENT', 'FACULTY']),
  departmentId: z.coerce.number().int().positive('Valid department ID is required'),

  // Student specific fields
  rollNumber: z.string().optional(),
  batchId: z.coerce.number().int().positive().optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
  cgpa: z.coerce.number().min(0).max(10).optional(),

  // Faculty specific fields
  employeeId: z.string().optional(),
  designation: z.string().optional(),
  specialization: z.string().optional(),
}).refine((data) => {
  if (data.role === 'STUDENT') {
    return !!data.rollNumber && !!data.batchId && !!data.semester;
  }
  return true;
}, {
  message: 'Students must provide rollNumber, batchId, and semester',
  path: ['rollNumber'],
}).refine((data) => {
  if (data.role === 'FACULTY') {
    return !!data.employeeId && !!data.designation && !!data.specialization;
  }
  return true;
}, {
  message: 'Faculty must provide employeeId, designation, and specialization',
  path: ['employeeId'],
});

export const loginSchema = z.object({
  email: z.string().email('Valid email address required'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
