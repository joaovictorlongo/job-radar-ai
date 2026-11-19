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
export {
  computeBinaryMetrics,
  computeMultiLabelMetrics,
  computeClassificationMetrics,
  computeNumericToleranceMetrics,
  computeSalaryMetrics,
  computeCohensKappa,
  type BinaryMetrics,
  type MultiLabelMetrics,
  type ClassificationMetrics,
  type NumericToleranceMetrics,
  type SalaryMetrics,
  type CohenKappaResult,
} from './eval/metrics.js';
export {
  evaluateGates,
  type EvalGateCheck,
  type EvalInputMetrics,
  type GateEvaluationResult,
} from './eval/gates.js';
export {
  goldDatasetSchema,
  labeledJobSchema,
  goldLabelFieldsSchema,
  type GoldDataset,
  type LabeledJob,
  type GoldLabelFields,
} from './eval/schema.js';
export {
  chunkMarkdown,
  type ProfileChunk,
} from './profile/chunker.js';
export {
  computeJobMatchScore,
  type RequirementMatch,
  type MatchScoreResult,
} from './matching/scoring.js';
export {
  analyzeMarketGaps,
  type MarketSkillDemand,
  type MarketGapAnalysisResult,
  type UserSkillEvidenceMap,
  type JobWithExtractedRequirements,
  type SkillUserStatus,
  type MarketImportance,
  type CompetitiveQuadrant,
} from './matching/gap-analysis.js';
export {
  SKILL_PROFICIENCY_VALUES,
  PROFICIENCY_SCORE_WEIGHT,
  profileSkillEntrySchema,
  profileSkillsSchema,
  proficiencyToUserStatus,
  proficiencyLabelPtBr,
  buildProficiencyIndex,
  profileSkillsToEvidenceMap,
  type SkillProficiency,
  type ProfileSkillEntry,
  type ProfileSkillsDocument,
} from './profile/skills-schema.js';
export {
  normalizeSkillForAnalysis,
  inferSkillCluster,
  isAnalysisNoise,
  type SkillCluster,
  type NormalizedAnalysisSkill,
} from './matching/taxonomy.js';
export {
  JOB_TRACK_VALUES,
  TRACK_LABELS,
  classifyJobTrack,
  jobMatchesTrackFilter,
  type JobTrack,
  type TrackFilter,
  type JobTrackClassification,
  type JobTrackInput,
} from './matching/tracks.js';
export {
  COMPETITOR_ARCHETYPES,
  type CompetitorArchetype,
} from './matching/competitors.js';
export {
  analyzeStudyIntelligence,
  normalizeJobRequirements,
  computeWeightedJobScore,
  type StudyJobRequirementInput,
  type StudyJobInput,
  type NormalizedJobRequirement,
  type JobSkillReference,
  type StudyHorizon,
  type AnalyzedSkillDemand,
  type StudyPriorityItem,
  type ClusterStudyImpact,
  type EvaluatedJobFitSummary,
  type CompetitorSkillEdge,
  type CompetitorBenchmarkResult,
  type StudyIntelligenceReport,
} from './matching/study-intelligence.js';



