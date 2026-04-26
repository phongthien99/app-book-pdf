import { useMutation, useQueryClient } from '@tanstack/react-query';

import { parsePdfNotesImport } from '../dto/pdf-note.dto';
import { pdfNoteRepository } from '../repositories/pdf-note.repository';
import { pdfNotesQueryKey } from './usePdfNotesQuery';

export function useImportPdfNotesMutation(pdfUrl: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const importedNotes = parsePdfNotesImport(await file.text());

      return pdfNoteRepository.importMany(pdfUrl, importedNotes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pdfNotesQueryKey(pdfUrl) });
    },
  });
}
