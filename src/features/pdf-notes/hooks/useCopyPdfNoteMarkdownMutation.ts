import { useMutation } from '@tanstack/react-query';

import { pdfNoteRepository } from '../repositories/pdf-note.repository';
import type { PdfNote } from '../schema/pdf-note.schema';

type CopyPdfNoteMarkdownInput = {
  note: PdfNote;
  pdfTitle: string;
  pdfUrl: string | null;
};

export function useCopyPdfNoteMarkdownMutation() {
  return useMutation({
    mutationFn: ({ note, pdfTitle, pdfUrl }: CopyPdfNoteMarkdownInput) =>
      pdfNoteRepository.copyNoteMarkdown(note, pdfTitle, pdfUrl),
  });
}
