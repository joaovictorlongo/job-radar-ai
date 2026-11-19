import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildProficiencyIndex,
  profileSkillsSchema,
  type ProfileSkillEntry,
  type ProfileSkillsDocument,
} from '@job-radar/shared';

let cachedMtime = 0;
let cachedDoc: ProfileSkillsDocument | null = null;
let cachedIndex: Map<string, ProfileSkillEntry> | null = null;

function resolveProfileSkillsPath(): string {
  // Suporta execução a partir da raiz do monorepo ou de apps/web
  const candidates = [
    resolve(process.cwd(), 'profile/skills.json'),
    resolve(process.cwd(), '../../profile/skills.json'),
  ];
  for (const candidate of candidates) {
    try {
      statSync(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return candidates[0]!;
}

export function loadProfileSkills(): {
  doc: ProfileSkillsDocument;
  index: Map<string, ProfileSkillEntry>;
} {
  const filePath = resolveProfileSkillsPath();
  const mtime = statSync(filePath).mtimeMs;

  if (cachedDoc && cachedIndex && mtime === cachedMtime) {
    return { doc: cachedDoc, index: cachedIndex };
  }

  const raw = readFileSync(filePath, 'utf8');
  const parsed = profileSkillsSchema.parse(JSON.parse(raw));
  const index = buildProficiencyIndex(parsed);

  cachedMtime = mtime;
  cachedDoc = parsed;
  cachedIndex = index;

  return { doc: parsed, index };
}
