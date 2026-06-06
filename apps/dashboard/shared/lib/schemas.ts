import { z } from 'zod';

export const localizedStringSchema = z.object({
    ar: z.string().trim().min(1, 'Arabic value is required'),
    en: z.string().trim().optional(),
});

export type LocalizedStringFormValues = z.infer<typeof localizedStringSchema>;
