export { normalizeText, normalizeForMatch, sha256Hex, descriptionHash } from './util/text.js';
export {
  REQUIREMENT_CATALOG,
  canonicalizeRequirement,
  findKnownRequirements,
  isNonSkillLabel,
  requirementCatalogKeys,
  type CanonicalRequirement,
  type RequirementCategory,
  type RequirementDefinition,
} from './domain/requirements.js';
export {
  extractionSchema,
  extractedRequirementSchema,
  extractedSalarySchema,
  SENIORITY_VALUES,
  WORK_MODEL_VALUES,
  SALARY_PERIOD_VALUES,
  SALARY_CURRENCY_VALUES,
  LANGUAGE_VALUES,
  REQUIREMENT_KIND_VALUES,
  type Extraction,
  type ExtractedRequirement,
  type ExtractedSalary,
  type Seniority,
  type WorkModel,
} from './extraction/schema.js';
export { salaryAmountsEvidenced } from './extraction/salary.js';
export { detectLanguage, normalizeExtraction } from './extraction/normalize.js';
export {
  PROMPT_VERSION,
  SCHEMA_VERSION,
  EXTRACTION_JSON_SCHEMA,
  buildExtractionMessages,
  extractionSchemaForPrompt,
  type ExtractionPromptInput,
} from './extraction/prompt.js';
export {
  applyGrounding,
  type GroundingIssue,
  type GroundingIssueCode,
  type GroundingResult,
  type GroundedRequirement,
} from './extraction/grounding.js';
