import { z } from 'zod';

export const getNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isRead: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export type GetNotificationsQuery = z.infer<typeof getNotificationsQuerySchema>;
