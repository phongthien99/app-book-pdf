import { useMutation, useQueryClient } from '@tanstack/react-query';

import { parseCreateBookConfig } from '../dto/book.dto';
import { bookRepository } from '../repositories/book.repository';

export function useCreateBookConfigMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rawInput: unknown) => {
      const valid = parseCreateBookConfig(rawInput);

      return bookRepository.createConfig(valid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}
