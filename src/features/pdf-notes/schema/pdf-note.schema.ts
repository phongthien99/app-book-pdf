import { z } from 'zod';

export const PdfNotesSchemaVersion = 1;

export const PdfNoteModeSchema = z.enum(['plain', 'cornell']);

export const PdfNoteSchema = z.object({
  id: z.string(),
  pageNumber: z.number().int().positive(),
  mode: PdfNoteModeSchema.optional(),
  text: z.string().optional(),
  cue: z.string().optional(),
  notes: z.string().optional(),
  summary: z.string().optional(),
  createdAt: z.string(),
});

export const PdfNotesSchema = z.array(PdfNoteSchema);

export const PdfNotesStorageSchema = z.object({
  version: z.literal(PdfNotesSchemaVersion),
  notes: PdfNotesSchema,
});

export const CreatePdfNoteSchema = z
  .object({
    pageNumber: z.number().int().positive(),
    mode: PdfNoteModeSchema,
    text: z.string().optional(),
    cue: z.string().optional(),
    notes: z.string().optional(),
    summary: z.string().optional(),
  })
  .refine(
    (input) =>
      input.mode === 'cornell'
        ? Boolean(input.cue?.trim() || input.notes?.trim() || input.summary?.trim())
        : Boolean(input.text?.trim()),
    'Note content is required',
  );

export const ImportedPdfNotesSchema = z
  .union([
    PdfNotesSchema,
    z.object({
      notes: PdfNotesSchema,
    }),
  ])
  .transform((input) => (Array.isArray(input) ? input : input.notes));

export type PdfNoteMode = z.infer<typeof PdfNoteModeSchema>;
export type PdfNote = z.infer<typeof PdfNoteSchema>;
export type CreatePdfNoteInput = z.infer<typeof CreatePdfNoteSchema>;
