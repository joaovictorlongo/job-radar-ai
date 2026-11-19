import { createHash } from 'node:crypto';

const ZERO_WIDTH = /[\u200b-\u200d\ufeff]/g;
const DASHES = /[\u2010-\u2015\u2212]/g;
const QUOTES = /[\u2018\u2019\u201c\u201d]/g;

export function normalizeText(input: string): string {
  return input
    .normalize('NFKC')
    .replace(ZERO_WIDTH, '')
    .replace(/\u00a0/g, ' ')
    .replace(DASHES, '-')
    .replace(QUOTES, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeForMatch(input: string): string {
  return normalizeText(input)
    .toLowerCase()
    .replace(/[.,;:!?()[\]{}"'`´]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function descriptionHash(description: string): string {
  return sha256Hex(normalizeText(description));
}
