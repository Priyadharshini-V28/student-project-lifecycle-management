import { z } from 'zod';

export const updateProgressSchema = z.object({
  completionPercentage: z
    .number()
    .min(0, 'Completion percentage must be at least 0')
    .max(100, 'Completion percentage cannot exceed 100'),
  studentRemarks: z.string().trim().optional(),
});

export const reviewMilestoneSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']),
  facultyRemarks: z.string().trim().optional(),
  completionPercentage: z.number().min(0).max(100).optional(),
});

export const createMilestoneSchema = z.object({
  title: z.string().min(3, 'Milestone title must be at least 3 characters'),
  description: z.string().trim().optional().default(''),
  startDate: z.string().or(z.date()),
  dueDate: z.string().or(z.date()),
  completionPercentage: z.number().min(0).max(100).optional().default(0),
}).refine((data) => new Date(data.dueDate) >= new Date(data.startDate), {
  message: 'Due date must be on or after start date',
  path: ['dueDate'],
});

export const updateScheduleSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().trim().optional(),
  startDate: z.string().or(z.date()).optional(),
  dueDate: z.string().or(z.date()).optional(),
}).refine((data) => {
  if (data.startDate && data.dueDate) {
    return new Date(data.dueDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'Due date must be on or after start date',
  path: ['dueDate'],
});

export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
export type ReviewMilestoneInput = z.infer<typeof reviewMilestoneSchema>;
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
