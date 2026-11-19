import * as cheerio from 'cheerio';
import { normalizeText } from '@job-radar/shared';

export function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe').remove();
  $('br').replaceWith('\n');
  $('p, li, h1, h2, h3, h4, h5, h6, div').each((_, element) => {
    $(element).append('\n');
  });
  return normalizeText($.root().text());
}
