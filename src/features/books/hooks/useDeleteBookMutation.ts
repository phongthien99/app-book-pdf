import { useMutation, useQueryClient } from '@tanstack/react-query';

import { bookRepository } from '../repositories/book.repository';

export function useDeleteBookMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookId: string) => bookRepository.delete(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}
