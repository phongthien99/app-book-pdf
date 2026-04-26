import { useQuery } from '@tanstack/react-query';

import { pdfNoteRepository } from '../repositories/pdf-note.repository';

export const pdfNotesQueryKey = (pdfUrl: string | null) => ['pdf-notes', pdfUrl] as const;

export function usePdfNotesQuery(pdfUrl: string | null) {
  return useQuery({
    queryKey: pdfNotesQueryKey(pdfUrl),
    queryFn: () => pdfNoteRepository.getAll(pdfUrl),
  });
}
