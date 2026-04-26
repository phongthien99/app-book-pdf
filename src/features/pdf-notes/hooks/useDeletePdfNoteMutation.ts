import { useMutation, useQueryClient } from '@tanstack/react-query';

import { pdfNoteRepository } from '../repositories/pdf-note.repository';
import { pdfNotesQueryKey } from './usePdfNotesQuery';

export function useDeletePdfNoteMutation(pdfUrl: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => pdfNoteRepository.delete(pdfUrl, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pdfNotesQueryKey(pdfUrl) });
    },
  });
}
