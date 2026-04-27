import { useState } from 'react';
import { ZodError } from 'zod';

import { useIsMobile } from '../../../hooks/use-is-mobile';
import { useBooksQuery } from '../hooks/useBooksQuery';
import { useCreateBookConfigMutation } from '../hooks/useCreateBookConfigMutation';
import { useCreateBookFromFileMutation } from '../hooks/useCreateBookFromFileMutation';
import { useCreateBookFromUrlMutation } from '../hooks/useCreateBookFromUrlMutation';
import { useDeleteBookMutation } from '../hooks/useDeleteBookMutation';
import { useImportBookConfigsMutation } from '../hooks/useImportBookConfigsMutation';
import type { SelectBookHandler } from '../hooks/hooks.types';
import type { BooksFacade, OpenPdfTab } from './book.facade.types';
import type { CreateBookConfigInput } from '../schema/book.schema';

interface UseBooksFacadeOptions {
  onSelectBook: SelectBookHandler;
}

const defaultConfig: CreateBookConfigInput = {
  title: '',
  author: '',
  description: '',
  coverUrl: '',
  pdfUrl: '',
};

export function useBooksFacade({ onSelectBook }: UseBooksFacadeOptions): BooksFacade {
  const isMobile = useIsMobile();
  const { data: books = [], isLoading: loading, error } = useBooksQuery();
  const createFromUrl = useCreateBookFromUrlMutation();
  const createFromFile = useCreateBookFromFileMutation();
  const createConfig = useCreateBookConfigMutation();
  const importConfigs = useImportBookConfigsMutation();
  const deleteBookMutation = useDeleteBookMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<OpenPdfTab>('url');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [config, setConfig] = useState<CreateBookConfigInput>(defaultConfig);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const resetDialog = () => {
    setUrl('');
    setFile(null);
    setJsonFile(null);
    setJsonText('');
    setConfig(defaultConfig);
    setDialogTab('url');
    setDialogError(null);
  };

  const closeDialog = () => {
    resetDialog();
    setDialogOpen(false);
  };

  const handleError = (err: Error) => {
    if (err instanceof ZodError) {
      setDialogError(err.issues[0]?.message ?? 'Invalid book config');
      return;
    }

    setDialogError(err.message);
  };

  const submitUrl = () => {
    createFromUrl.mutate(
      { pdfUrl: url },
      {
        onSuccess: (book) => {
          onSelectBook(book);
          closeDialog();
        },
        onError: handleError,
      },
    );
  };

  const submitFile = () => {
    createFromFile.mutate(
      { file },
      {
        onSuccess: (book) => {
          onSelectBook(book);
          closeDialog();
        },
        onError: handleError,
      },
    );
  };

  const submitConfig = () => {
    createConfig.mutate(config, {
      onSuccess: (book) => {
        onSelectBook(book);
        closeDialog();
      },
      onError: handleError,
    });
  };

  const submitJson = () => {
    const source = jsonFile ?? jsonText.trim();
    if (!source) return;

    importConfigs.mutate(source, {
      onSuccess: () => {
        closeDialog();
      },
      onError: handleError,
    });
  };

  const deleteBook = (bookId: string) => {
    deleteBookMutation.mutate(bookId);
  };

  const submitting =
    createFromUrl.isPending || createFromFile.isPending || createConfig.isPending || importConfigs.isPending;
  const canSubmit =
    dialogTab === 'url'
      ? url.trim().length > 0
      : dialogTab === 'file'
        ? file !== null
        : dialogTab === 'config'
          ? config.title.trim().length > 0 && config.pdfUrl.trim().length > 0
          : jsonFile !== null || jsonText.trim().length > 0;

  return {
    books,
    loading,
    error: error?.message ?? null,
    isMobile,
    dialogOpen,
    openDialog: () => setDialogOpen(true),
    closeDialog,
    dialogTab,
    setDialogTab,
    url,
    setUrl: (nextUrl) => {
      setUrl(nextUrl);
      setDialogError(null);
    },
    clearUrl: () => setUrl(''),
    file,
    setFile: (nextFile) => {
      setFile(nextFile);
      setDialogError(null);
    },
    jsonFile,
    setJsonFile: (nextFile) => {
      setJsonFile(nextFile);
      setDialogError(null);
    },
    jsonText,
    setJsonText: (nextJsonText) => {
      setJsonText(nextJsonText);
      setDialogError(null);
    },
    config,
    setConfigField: (field, value) => {
      setConfig((currentConfig) => ({ ...currentConfig, [field]: value }));
      setDialogError(null);
    },
    submitUrl,
    submitFile,
    submitConfig,
    submitJson,
    deleteBook,
    canSubmit,
    submitting,
    deleting: deleteBookMutation.isPending,
    dialogError,
  };
}
