export type NoteDraftSeed = {
  pageNumber: number;
  selectedText: string;
  requestId: number;
};

export type AutoSavedNoteSeed = {
  pageNumber: number;
  text: string;
  requestId: number;
  successMessage?: string;
};
