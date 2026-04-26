import { useMutation, useQueryClient } from '@tanstack/react-query';

import { parseImportBookConfigs } from '../dto/book.dto';
import { bookRepository } from '../repositories/book.repository';

type ImportBookConfigsSource = File | string;

export function useImportBookConfigsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (source: ImportBookConfigsSource) => {
      const rawText = typeof source === 'string' ? source : await source.text();
      let rawJson: unknown;

      try {
        rawJson = JSON.parse(rawText);
      } catch {
        throw new Error('JSON is invalid');
      }

      const valid = parseImportBookConfigs(rawJson);

      return bookRepository.createConfigs(valid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}
