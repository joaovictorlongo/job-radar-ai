import { canonicalizeRequirement, type CanonicalRequirement } from '../domain/requirements.js';
import { normalizeText } from '../util/text.js';
import { salaryAmountsEvidenced } from './salary.js';
import type { Extraction, ExtractedRequirement } from './schema.js';

export type GroundingIssueCode =
  | 'evidence_not_found'
  | 'salary_not_evidenced'
  | 'salary_rule_violated';

export interface GroundingIssue {
  code: GroundingIssueCode;
  detail: string;
  requirement?: string;
}

export interface GroundedRequirement extends ExtractedRequirement {
  canonical: string;
  category: CanonicalRequirement['category'];
  known: boolean;
}

export interface GroundingResult {
  ok: boolean;
  extraction: (Omit<Extraction, 'requirements'> & { requirements: GroundedRequirement[] }) | null;
  issues: GroundingIssue[];
  droppedRequirements: number;
}

function evidencePresent(evidenceSpan: string, description: string): boolean {
  const span = normalizeText(evidenceSpan).toLowerCase();
  const text = normalizeText(description).toLowerCase();
  return span.length > 0 && text.includes(span);
}

export function applyGrounding(extraction: Extraction, description: string): GroundingResult {
  const issues: GroundingIssue[] = [];

  if (!salaryAmountsEvidenced(extraction.salary, description)) {
    return {
      ok: false,
      extraction: null,
      issues: [
        {
          code: 'salary_not_evidenced',
          detail: 'salary_published=true sem os valores publicados no texto da vaga',
        },
      ],
      droppedRequirements: 0,
    };
  }

  const requirements: GroundedRequirement[] = [];
  let dropped = 0;

  for (const requirement of extraction.requirements) {
    if (!evidencePresent(requirement.evidenceSpan, description)) {
      dropped += 1;
      issues.push({
        code: 'evidence_not_found',
        detail: 'evidence_span não aparece literalmente na descrição',
        requirement: requirement.requirement,
      });
      continue;
    }
    const canonical = canonicalizeRequirement(requirement.requirement);
    if (canonical === null) {
      dropped += 1;
      issues.push({
        code: 'evidence_not_found',
        detail: 'requisito vazio após normalização',
        requirement: requirement.requirement,
      });
      continue;
    }
    requirements.push({
      ...requirement,
      canonical: canonical.canonical,
      category: canonical.category,
      known: canonical.known,
    });
  }

  return {
    ok: true,
    extraction: { ...extraction, requirements },
    issues,
    droppedRequirements: dropped,
  };
}
