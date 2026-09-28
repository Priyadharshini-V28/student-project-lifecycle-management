import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(1, 'Last name cannot be empty').optional(),

  // Student specific updates
  semester: z.coerce.number().int().min(1).max(8).optional(),
  cgpa: z.coerce.number().min(0.0).max(10.0).optional(),

  // Faculty specific updates
  designation: z.string().min(2, 'Designation must be at least 2 characters').optional(),
  specialization: z.string().min(2, 'Specialization must be at least 2 characters').optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'New password must contain at least one number'),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password cannot be the same as current password',
    path: ['newPassword'],
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
