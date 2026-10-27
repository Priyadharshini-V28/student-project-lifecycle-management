import { z } from 'zod';

export const ReassignProjectGuideSchema = z.object({
  newFacultyGuideId: z.string().min(1, 'Target faculty guide ID is required'),
  reason: z.string().min(5, 'Reallocation reason must be at least 5 characters long'),
});

export type ReassignProjectGuideInput = z.infer<typeof ReassignProjectGuideSchema>;

export const AssignProposalGuideSchema = z.object({
  facultyId: z.string().min(1, 'Target faculty guide ID is required'),
  allocateProject: z.boolean().optional(),
});

export type AssignProposalGuideInput = z.infer<typeof AssignProposalGuideSchema>;

export const UpdateFacultyCapacitySchema = z.object({
  maxProjects: z
    .number({ invalid_type_error: 'Maximum projects must be a number' })
    .int('Maximum projects must be an integer')
    .min(1, 'Maximum projects must be at least 1')
    .max(20, 'Maximum projects cannot exceed 20'),
});

export type UpdateFacultyCapacityInput = z.infer<typeof UpdateFacultyCapacitySchema>;
