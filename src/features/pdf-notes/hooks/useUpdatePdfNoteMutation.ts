import { useMutation, useQueryClient } from '@tanstack/react-query';

import { parseCreatePdfNote } from '../dto/pdf-note.dto';
import { pdfNoteRepository } from '../repositories/pdf-note.repository';
import type { CreatePdfNoteInput } from '../schema/pdf-note.schema';
import { pdfNotesQueryKey } from './usePdfNotesQuery';

type UpdatePdfNoteInput = {
  noteId: string;
  input: CreatePdfNoteInput;
};

export function useUpdatePdfNoteMutation(pdfUrl: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, input: rawInput }: UpdatePdfNoteInput) => {
      const input = parseCreatePdfNote(rawInput);

      return pdfNoteRepository.update(pdfUrl, noteId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pdfNotesQueryKey(pdfUrl) });
    },
  });
}
