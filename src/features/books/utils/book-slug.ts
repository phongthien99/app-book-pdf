const NON_LATIN_VIETNAMESE_CHARS = /đ/g;
const NON_LATIN_VIETNAMESE_CHARS_UPPER = /Đ/g;
const COMBINING_MARKS = /[\u0300-\u036f]/g;
const NON_SLUG_CHARS = /[^a-z0-9]+/g;
const EDGE_HYPHENS = /^-+|-+$/g;

export function createBookSlug(title: string) {
  const slug = title
    .replace(NON_LATIN_VIETNAMESE_CHARS, 'd')
    .replace(NON_LATIN_VIETNAMESE_CHARS_UPPER, 'd')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(NON_SLUG_CHARS, '-')
    .replace(EDGE_HYPHENS, '');

  return slug || 'book';
}
