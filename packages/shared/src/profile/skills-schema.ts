import { z } from 'zod';
import type { SkillUserStatus, UserSkillEvidenceMap } from '../matching/gap-analysis.js';

export const SKILL_PROFICIENCY_VALUES = [
  'production_senior',
  'working_knowledge',
  'studying',
  'none',
] as const;

export type SkillProficiency = (typeof SKILL_PROFICIENCY_VALUES)[number];

export const profileSkillEntrySchema = z.object({
  canonical: z.string().min(1),
  proficiency: z.enum(SKILL_PROFICIENCY_VALUES),
  years: z.number().min(0).max(50).optional(),
  evidence: z.string().min(1),
});

export const profileSkillsSchema = z.object({
  version: z.string().min(1),
  owner: z.string().min(1),
  updatedAt: z.string().min(1),
  skills: z.array(profileSkillEntrySchema).min(1),
});

export type ProfileSkillEntry = z.infer<typeof profileSkillEntrySchema>;
export type ProfileSkillsDocument = z.infer<typeof profileSkillsSchema>;

export const PROFICIENCY_SCORE_WEIGHT: Record<SkillProficiency, number> = {
  production_senior: 1.0,
  working_knowledge: 0.55,
  studying: 0.25,
  none: 0.0,
};

export function proficiencyToUserStatus(proficiency: SkillProficiency): SkillUserStatus {
  switch (proficiency) {
    case 'production_senior':
      return 'strong_evidence';
    case 'working_knowledge':
    case 'studying':
      return 'partial_evidence';
    case 'none':
      return 'gap';
  }
}

export function proficiencyLabelPtBr(proficiency: SkillProficiency): string {
  switch (proficiency) {
    case 'production_senior':
      return 'Produção Sênior';
    case 'working_knowledge':
      return 'Prática / Portfólio';
    case 'studying':
      return 'Em Estudo';
    case 'none':
      return 'Sem Evidência (Gap)';
  }
}

export function buildProficiencyIndex(
  doc: ProfileSkillsDocument,
): Map<string, ProfileSkillEntry> {
  const map = new Map<string, ProfileSkillEntry>();
  for (const entry of doc.skills) {
    const key = entry.canonical.toLowerCase().trim();
    if (key.length > 0) {
      map.set(key, { ...entry, canonical: key });
    }
  }
  return map;
}

export function profileSkillsToEvidenceMap(doc: ProfileSkillsDocument): UserSkillEvidenceMap {
  const result: UserSkillEvidenceMap = {};
  for (const entry of doc.skills) {
    const key = entry.canonical.toLowerCase().trim();
    if (key.length === 0) continue;
    result[key] = {
      status: proficiencyToUserStatus(entry.proficiency),
      evidence: entry.evidence,
      doc: 'profile/skills.json',
      section: proficiencyLabelPtBr(entry.proficiency),
    };
  }
  return result;
}
