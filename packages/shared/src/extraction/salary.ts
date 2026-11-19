import { normalizeText } from '../util/text.js';
import type { ExtractedSalary } from './schema.js';
import type { SALARY_CURRENCY_VALUES } from './schema.js';

type Currency = (typeof SALARY_CURRENCY_VALUES)[number];

function formatVariants(value: number): string[] {
  const variants = new Set<string>();
  variants.add(String(value));
  for (const locale of ['pt-BR', 'en-US']) {
    const formatter = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
      useGrouping: true,
    });
    variants.add(formatter.format(value));
  }
  if (Number.isInteger(value) && value >= 1000) {
    variants.add(value.toLocaleString('pt-BR'));
    variants.add(value.toLocaleString('en-US'));
  }
  return [...variants];
}

const CURRENCY_TOKENS: Record<Currency, readonly string[]> = {
  BRL: ['r$', 'brl', 'reais'],
  USD: ['us$', '$', 'usd', 'dólares', 'dollars'],
  EUR: ['€', 'eur', 'euros'],
  GBP: ['£', 'gbp', 'pounds'],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function salaryAmountsEvidenced(salary: ExtractedSalary, description: string): boolean {
  if (!salary.published) {
    return true;
  }
  const text = normalizeText(description).toLowerCase();
  const amounts = [salary.min, salary.max].filter((value): value is number => value !== null);
  if (amounts.length === 0) {
    return false;
  }
  const currencies = salary.currency === null ? [] : CURRENCY_TOKENS[salary.currency];
  return amounts.every((amount) => {
    const variants = formatVariants(amount).map((variant) => variant.toLowerCase());
    if (amount >= 1000) {
      return variants.some((variant) => text.includes(variant));
    }
    const currencyPattern = currencies.length > 0 ? currencies.map(escapeRegExp).join('|') : '';
    return variants.some((variant) => {
      const escaped = escapeRegExp(variant);
      const withCurrency =
        currencyPattern.length > 0
          ? new RegExp(`(?:${currencyPattern})\\s*${escaped}|${escaped}\\s*(?:${currencyPattern})`).test(text)
          : false;
      const hourly = new RegExp(`${escaped}\\s*(?:/\\s*h|por hora|per hour|hour|hora)`).test(text);
      return withCurrency || hourly;
    });
  });
}
