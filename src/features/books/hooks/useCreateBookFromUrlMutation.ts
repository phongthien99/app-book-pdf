import { useMutation } from '@tanstack/react-query';

import { parseCreateBookFromUrl } from '../dto/book.dto';
import { bookRepository } from '../repositories/book.repository';

export function useCreateBookFromUrlMutation() {
  return useMutation({
    mutationFn: async (rawInput: unknown) => {
      const valid = parseCreateBookFromUrl(rawInput);

      return bookRepository.createFromUrl(valid);
    },
  });
}
