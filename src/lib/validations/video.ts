import { z } from 'zod';

export const createVideoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  titleVi: z.string().min(1, 'Vietnamese title is required').max(200).trim(),
  description: z.string().max(1000).trim().optional().default(''),
  level: z.enum(['Beginner', 'Elementary', 'Intermediate']).optional(),
  topics: z.array(z.string().max(50)).max(10).optional().default([]),
  ageGroup: z.enum(['3-5', '6-8', '9-12']).optional(),
  category: z.enum(['video', 'music']).optional().default('video'),
});

export type CreateVideoInput = z.infer<typeof createVideoSchema>;
