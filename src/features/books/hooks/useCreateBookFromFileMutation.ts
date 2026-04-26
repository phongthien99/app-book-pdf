import { useMutation } from '@tanstack/react-query';

import { parseCreateBookFromFile } from '../dto/book.dto';
import { bookRepository } from '../repositories/book.repository';

export function useCreateBookFromFileMutation() {
  return useMutation({
    mutationFn: async (rawInput: unknown) => {
      const valid = parseCreateBookFromFile(rawInput);

      return bookRepository.createFromFile(valid);
    },
  });
}
