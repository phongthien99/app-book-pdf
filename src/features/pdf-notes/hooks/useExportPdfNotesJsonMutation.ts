import { useMutation } from '@tanstack/react-query';

import { pdfNoteRepository } from '../repositories/pdf-note.repository';
import type { PdfNote } from '../schema/pdf-note.schema';

type ExportPdfNotesJsonInput = {
  notes: PdfNote[];
  pdfTitle: string;
  pdfUrl: string | null;
};

export function useExportPdfNotesJsonMutation() {
  return useMutation({
    mutationFn: ({ notes, pdfTitle, pdfUrl }: ExportPdfNotesJsonInput) => {
      pdfNoteRepository.exportNotesJson(notes, pdfTitle, pdfUrl);

      return Promise.resolve();
    },
  });
}
