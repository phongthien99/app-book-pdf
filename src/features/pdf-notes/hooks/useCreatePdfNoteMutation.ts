import { useMutation, useQueryClient } from '@tanstack/react-query';

import { parseCreatePdfNote } from '../dto/pdf-note.dto';
import { pdfNoteRepository } from '../repositories/pdf-note.repository';
import type { CreatePdfNoteInput } from '../schema/pdf-note.schema';
import { pdfNotesQueryKey } from './usePdfNotesQuery';

export function useCreatePdfNoteMutation(pdfUrl: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rawInput: CreatePdfNoteInput) => {
      const input = parseCreatePdfNote(rawInput);

      return pdfNoteRepository.create(pdfUrl, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pdfNotesQueryKey(pdfUrl) });
    },
  });
}
