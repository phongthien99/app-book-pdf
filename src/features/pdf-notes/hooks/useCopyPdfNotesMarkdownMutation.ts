import { useMutation } from '@tanstack/react-query';

import { pdfNoteRepository } from '../repositories/pdf-note.repository';
import type { PdfNote } from '../schema/pdf-note.schema';

type CopyPdfNotesMarkdownInput = {
  notes: PdfNote[];
  pdfTitle: string;
  pdfUrl: string | null;
};

export function useCopyPdfNotesMarkdownMutation() {
  return useMutation({
    mutationFn: ({ notes, pdfTitle, pdfUrl }: CopyPdfNotesMarkdownInput) =>
      pdfNoteRepository.copyNotesMarkdown(notes, pdfTitle, pdfUrl),
  });
}
