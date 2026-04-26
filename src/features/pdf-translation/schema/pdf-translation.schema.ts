import { z } from 'zod';

export const PdfTranslationLanguageSchema = z.enum(['en', 'vi']);

export const TranslatePdfTextSchema = z.object({
  text: z.string().trim().min(1, 'Translation text is required'),
  sourceLanguage: PdfTranslationLanguageSchema.optional(),
  targetLanguage: PdfTranslationLanguageSchema.default('vi'),
});

export const PdfTranslationResultSchema = z.object({
  sourceLanguage: PdfTranslationLanguageSchema,
  targetLanguage: PdfTranslationLanguageSchema,
  sourceText: z.string(),
  translatedText: z.string(),
});

export type PdfTranslationLanguage = z.infer<typeof PdfTranslationLanguageSchema>;
export type TranslatePdfTextInput = z.infer<typeof TranslatePdfTextSchema>;
export type PdfTranslationResult = z.infer<typeof PdfTranslationResultSchema>;
