import { z } from 'zod';

// Token validation
export const tokenSchema = z.object({
  display: z.string().min(1).max(100),
  norm: z.string().min(1).max(100),
  vi: z.string().max(200).optional(),
});

// Panel validation
export const panelSchema = z.object({
  panel_id: z.number().int().positive(),
  image: z.string().min(1).max(10000), // Base64 or URL or emoji
  image_alt: z.string().max(200).optional(),
  sentence_en: z.string().min(1).max(500),
  sentence_vi: z.string().min(1).max(500),
  tokens: z.array(tokenSchema),
});

// Vocabulary word validation
export const vocabWordSchema = z.object({
  word: z.string().min(1).max(100),
  vi: z.string().min(1).max(200),
  ipa: z.string().max(100).optional(),
});

// Match game item validation
export const matchGameItemSchema = z.object({
  word: z.string().min(1).max(100),
  vi: z.string().min(1).max(200),
});

// Fill blank question validation
export const fillBlankQuestionSchema = z.object({
  sentence_en: z.string().min(1).max(500),
  answer: z.string().min(1).max(100),
  choices: z.array(z.string().min(1).max(100)).min(2).max(6),
});

// Story games validation
export const storyGamesSchema = z.object({
  match: z.array(matchGameItemSchema).min(0).max(20),
  fill_blank: z.array(fillBlankQuestionSchema).min(0).max(10),
});

// Full story validation
export const storySchema = z.object({
  id: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'ID must be lowercase alphanumeric with hyphens'),
  title_en: z.string().min(1).max(200).trim(),
  title_vi: z.string().min(1).max(200).trim(),
  level: z.enum(['Beginner', 'Elementary', 'Intermediate']),
  topics: z.array(z.string().min(1).max(50)).min(1).max(10),
  cover_image: z.string().min(1).max(10000),
  estimated_minutes: z.number().int().positive().max(120),
  published: z.boolean(),
  panels: z.array(panelSchema).min(1).max(50),
  vocabulary: z.array(vocabWordSchema).min(0).max(100),
  games: storyGamesSchema,
});

// Partial story update (for editing)
export const storyUpdateSchema = storySchema.partial().extend({
  id: z.string().min(1).max(200), // ID is required for updates
});

// Form input validation (before story creation)
export const storyFormSchema = z.object({
  title_en: z.string().min(1, 'English title is required').max(200).trim(),
  title_vi: z.string().min(1, 'Vietnamese title is required').max(200).trim(),
  level: z.enum(['Beginner', 'Elementary', 'Intermediate']),
  topics: z.array(z.string().min(1).max(50)).min(1, 'At least one topic is required'),
  cover_image: z.string().min(1, 'Cover image is required'),
  panels: z.array(z.object({
    sentence_en: z.string().min(1, 'English sentence is required').max(500),
    sentence_vi: z.string().min(1, 'Vietnamese sentence is required').max(500),
    image: z.string().min(1, 'Panel image is required'),
  })).min(1, 'At least one panel is required'),
  vocabulary: z.array(z.object({
    en: z.string().min(1).max(100),
    vi: z.string().min(1).max(200),
  })).optional(),
});

// Type exports
export type StoryFormInput = z.infer<typeof storyFormSchema>;
export type StoryInput = z.infer<typeof storySchema>;
export type StoryUpdateInput = z.infer<typeof storyUpdateSchema>;

// Helper: Validate and sanitize story data
export function validateStory(data: unknown): { success: true; data: StoryInput } | { success: false; errors: string[] } {
  try {
    const validated = storySchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

// Helper: Sanitize HTML to prevent XSS
export function sanitizeText(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Helper: Validate image URL or base64
export function isValidImage(imageString: string): boolean {
  // Check if it's a valid URL
  if (imageString.startsWith('http://') || imageString.startsWith('https://')) {
    try {
      new URL(imageString);
      return true;
    } catch {
      return false;
    }
  }
  
  // Check if it's base64
  if (imageString.startsWith('data:image/')) {
    return true;
  }
  
  // Check if it's an emoji (1-4 characters)
  if (imageString.length <= 4) {
    return true;
  }
  
  return false;
}
