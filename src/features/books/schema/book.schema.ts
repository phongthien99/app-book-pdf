import { z } from 'zod';

export const BookSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  description: z.string(),
  coverUrl: z.string(),
  pdfUrl: z.string().min(1, 'PDF URL is required'),
});

export const BooksSchema = z.array(BookSchema);

export const CreateBookFromUrlSchema = z.object({
  pdfUrl: z.string().trim().url('PDF URL must be valid'),
});

export const CreateBookFromFileSchema = z.object({
  file: z.instanceof(File, { message: 'PDF file is required' }),
});

export const CreateBookConfigSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  author: z.string().trim(),
  description: z.string().trim(),
  coverUrl: z.union([z.literal(''), z.string().trim().url('Cover URL must be valid')]),
  pdfUrl: z.string().trim().url('PDF URL must be valid'),
});

export const ImportBookConfigsSchema = z
  .union([
    z.array(CreateBookConfigSchema),
    z.object({
      books: z.array(CreateBookConfigSchema),
    }),
  ])
  .transform((input) => (Array.isArray(input) ? input : input.books));

export type Book = z.infer<typeof BookSchema>;
export type CreateBookFromUrlInput = z.infer<typeof CreateBookFromUrlSchema>;
export type CreateBookFromFileInput = z.infer<typeof CreateBookFromFileSchema>;
export type CreateBookConfigInput = z.infer<typeof CreateBookConfigSchema>;
export type ImportBookConfigsInput = z.infer<typeof ImportBookConfigsSchema>;
