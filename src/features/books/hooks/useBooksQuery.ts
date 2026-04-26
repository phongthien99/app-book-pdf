import { useQuery } from '@tanstack/react-query';

import { bookRepository } from '../repositories/book.repository';

export function useBooksQuery() {
  return useQuery({
    queryKey: ['books'],
    queryFn: () => bookRepository.getAll(),
  });
}
