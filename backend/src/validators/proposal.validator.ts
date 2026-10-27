import { z } from 'zod';

export const createProposalSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(255, 'Title cannot exceed 255 characters'),
  abstract: z
    .string()
    .min(20, 'Abstract must be at least 20 characters explaining project scope'),
  domain: z
    .string()
    .min(2, 'Domain must be at least 2 characters')
    .max(100, 'Domain cannot exceed 100 characters'),
  subjectCode: z
    .string()
    .min(1, 'Subject code cannot be empty')
    .optional()
    .default('CAPSTONE-01'),
  subjectName: z
    .string()
    .min(1, 'Subject name cannot be empty')
    .optional()
    .default('Major Capstone Project'),
  techStack: z
    .array(z.string().min(1, 'Tech stack item cannot be empty'))
    .min(1, 'Please specify at least one technology stack tag')
    .max(15, 'Maximum 15 technology tags permitted'),
  assignedFacultyId: z
    .string()
    .uuid('Invalid faculty UUID')
    .optional()
    .nullable(),
  initialStatus: z
    .enum(['DRAFT', 'SUBMITTED'])
    .optional()
    .default('DRAFT'),
  coMemberStudentIds: z
    .array(z.string().uuid('Invalid student member UUID'))
    .optional()
    .default([]),
});

export const updateProposalSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(255, 'Title cannot exceed 255 characters')
    .optional(),
  abstract: z
    .string()
    .min(20, 'Abstract must be at least 20 characters explaining project scope')
    .optional(),
  domain: z
    .string()
    .min(2, 'Domain must be at least 2 characters')
    .max(100, 'Domain cannot exceed 100 characters')
    .optional(),
  subjectCode: z
    .string()
    .min(1, 'Subject code cannot be empty')
    .optional(),
  subjectName: z
    .string()
    .min(1, 'Subject name cannot be empty')
    .optional(),
  techStack: z
    .array(z.string().min(1, 'Tech stack item cannot be empty'))
    .min(1, 'Please specify at least one technology stack tag')
    .max(15, 'Maximum 15 technology tags permitted')
    .optional(),
  assignedFacultyId: z
    .string()
    .uuid('Invalid faculty UUID')
    .optional()
    .nullable(),
});

export const reviewProposalSchema = z.object({
  status: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'], {
    errorMap: () => ({ message: 'Review decision must be APPROVED, CHANGES_REQUESTED, or REJECTED' }),
  }),
  facultyComments: z
    .string()
    .min(5, 'Faculty evaluation remarks must be at least 5 characters'),
});

export const addProposalMemberSchema = z.object({
  studentId: z.string().uuid('Invalid student member UUID'),
});

export const respondMemberInviteSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED'], {
    errorMap: () => ({ message: 'Invitation response must be ACCEPTED or DECLINED' }),
  }),
});

export const updateProjectRepoSchema = z.object({
  repositoryUrl: z
    .string()
    .url('Must be a valid repository URL (e.g., https://github.com/org/repo)')
    .max(255, 'Repository URL cannot exceed 255 characters'),
});

export type CreateProposalInput = z.input<typeof createProposalSchema>;
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;
export type ReviewProposalInput = z.infer<typeof reviewProposalSchema>;
export type AddProposalMemberInput = z.infer<typeof addProposalMemberSchema>;
export type RespondMemberInviteInput = z.infer<typeof respondMemberInviteSchema>;
export type UpdateProjectRepoInput = z.infer<typeof updateProjectRepoSchema>;
