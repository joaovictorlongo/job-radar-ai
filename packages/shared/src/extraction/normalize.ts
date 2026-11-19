import type { Extraction } from './schema.js';

const PT_STOPWORDS = [
  'para',
  'com',
  'não',
  'uma',
  'desenvolvimento',
  'experiência',
  'requisitos',
  'trabalho',
  'você',
  'são',
  'como',
  'mais',
  'dos',
  'das',
  'pela',
  'pelo',
  'nos',
  'nas',
  'será',
  'sobre',
];

const EN_STOPWORDS = [
  'the',
  'and',
  'with',
  'experience',
  'requirements',
  'work',
  'you',
  'are',
  'for',
  'this',
  'that',
  'will',
  'have',
  'our',
  'your',
  'from',
  'about',
  'team',
];

function countMatches(text: string, words: readonly string[]): number {
  let total = 0;
  for (const word of words) {
    const matches = text.match(new RegExp(`(?<![a-z])${word}(?![a-z])`, 'g'));
    total += matches?.length ?? 0;
  }
  return total;
}

export function detectLanguage(text: string): 'pt' | 'en' | null {
  const normalized = text.toLowerCase();
  const pt = countMatches(normalized, PT_STOPWORDS);
  const en = countMatches(normalized, EN_STOPWORDS);
  if (Math.max(pt, en) < 3) {
    return null;
  }
  if (pt >= en * 1.5) {
    return 'pt';
  }
  if (en >= pt * 1.5) {
    return 'en';
  }
  return null;
}

export function normalizeExtraction(extraction: Extraction, description: string): Extraction {
  const detected = detectLanguage(description);
  const requirementYears = extraction.requirements
    .map((requirement) => requirement.minYears)
    .filter((value): value is number => value !== null);
  const yearsRequired =
    extraction.yearsRequired ?? (requirementYears.length > 0 ? Math.max(...requirementYears) : null);

  return {
    ...extraction,
    lang: detected ?? extraction.lang,
    yearsRequired,
  };
}
