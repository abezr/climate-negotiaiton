/**
 * ComplexChaos Type Definitions
 * 
 * This file contains all TypeScript types and interfaces used across the application.
 * 
 * Philosophy:
 * - Explicit types (avoid 'any')
 * - DTOs (Data Transfer Objects) for API contracts
 * - Enums for constrained values
 * - Utility types for transformations
 * 
 * For LLM maintainers:
 * - All types are documented with JSDoc
 * - Related types are grouped together
 * - Breaking changes require version bumps
 */

// ============================================================================
// Database Model Types (mirrors Prisma schema)
// ============================================================================

/**
 * Session Status Lifecycle
 * 
 * @example
 * 'pending' → stakeholders being invited
 * 'active' → collecting submissions
 * 'synthesizing' → AI generating consensus
 * 'completed' → final consensus reached
 */
export type SessionStatus = 'pending' | 'active' | 'synthesizing' | 'completed';

/**
 * Session Type (domain-specific contexts)
 * 
 * @example
 * 'climate' → Climate negotiations (UN, COP)
 * 'strategic_planning' → Corporate strategy alignment
 * 'procurement' → Vendor selection
 * 'risk_management' → Risk assessment
 * 'ai_adoption' → AI policy and governance
 */
export type SessionType = 
  | 'climate'
  | 'strategic_planning'
  | 'procurement'
  | 'risk_management'
  | 'ai_adoption'
  | 'institutional_governance';

/**
 * Stakeholder Roles (domain-specific)
 * 
 * For Climate Negotiations:
 * @example
 * 'developed_nation' → G7, EU countries
 * 'developing_nation' → African Group, AOSIS
 * 'civil_society' → NGOs, youth delegates
 * 'technical_expert' → IPCC scientists, legal advisors
 * 
 * For Corporate Strategy:
 * @example
 * 'executive' → C-suite leadership
 * 'department_lead' → Functional leaders
 * 'technical_expert' → Subject matter experts
 * 'external_consultant' → Management consultants
 */
export type StakeholderRole =
  // Climate/Diplomacy
  | 'developed_nation'
  | 'developing_nation'
  | 'civil_society'
  | 'technical_expert'
  // Corporate
  | 'executive'
  | 'department_lead'
  | 'external_consultant'
  | 'employee_representative';

/**
 * Submission Type
 * 
 * MVP: text-only
 * Future: audio, document
 */
export type SubmissionType = 'text' | 'audio' | 'document';

// ============================================================================
// API Data Transfer Objects (DTOs)
// ============================================================================

/**
 * DTO for creating a new consensus session
 * 
 * @example
 * ```typescript
 * const newSession: CreateSessionDTO = {
 *   title: "Climate Finance Strategy 2025",
 *   description: "Align G20 countries on climate finance mechanisms",
 *   type: "climate",
 *   facilitatorId: "user_abc123",
 *   stakeholders: [
 *     { name: "USA Delegate", email: "usa@un.org", role: "developed_nation" },
 *     { name: "Kenya Delegate", email: "kenya@un.org", role: "developing_nation" }
 *   ]
 * };
 * ```
 */
export interface CreateSessionDTO {
  title: string;
  description?: string;
  type: SessionType;
  facilitatorId: string;
  stakeholders: Array<{
    name: string;
    email: string;
    role: StakeholderRole;
  }>;
}

/**
 * DTO for submitting stakeholder input
 * 
 * @example
 * ```typescript
 * const submission: CreateSubmissionDTO = {
 *   sessionId: "sess_abc123",
 *   stakeholderId: "stake_xyz789",
 *   content: "We must prioritize adaptation finance for vulnerable regions",
 *   type: "text"
 * };
 * ```
 */
export interface CreateSubmissionDTO {
  sessionId: string;
  stakeholderId: string;
  content: string;
  type?: SubmissionType;
  fileUrl?: string;
}

/**
 * DTO for requesting AI synthesis generation
 * 
 * @example
 * ```typescript
 * const request: GenerateSynthesisDTO = {
 *   sessionId: "sess_abc123",
 *   includeMinorityViews: true
 * };
 * ```
 */
export interface GenerateSynthesisDTO {
  sessionId: string;
  includeMinorityViews?: boolean;
  customPrompt?: string;
}

/**
 * DTO for submitting critique on synthesis
 * 
 * @example
 * ```typescript
 * const critique: CreateCritiqueDTO = {
 *   synthesisId: "synth_def456",
 *   stakeholderId: "stake_xyz789",
 *   content: "This summary overlooks the needs of island nations"
 * };
 * ```
 */
export interface CreateCritiqueDTO {
  synthesisId: string;
  stakeholderId: string;
  content: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API success response
 * 
 * @template T The type of data returned
 * 
 * @example
 * ```typescript
 * const response: ApiResponse<Session> = {
 *   success: true,
 *   data: { id: "sess_abc", title: "Climate Strategy", ... },
 *   message: "Session created successfully"
 * };
 * ```
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated API response
 * 
 * @template T The type of items in the array
 * 
 * @example
 * ```typescript
 * const response: PaginatedResponse<Session> = {
 *   success: true,
 *   data: [{ id: "sess_1", ... }, { id: "sess_2", ... }],
 *   pagination: {
 *     page: 1,
 *     limit: 10,
 *     total: 42,
 *     totalPages: 5
 *   }
 * };
 * ```
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Frontend Component Props
// ============================================================================

/**
 * Props for SessionCard component
 * 
 * Displays a session in a list view
 */
export interface SessionCardProps {
  session: {
    id: string;
    title: string;
    description?: string;
    type: SessionType;
    status: SessionStatus;
    stakeholderCount: number;
    createdAt: Date;
  };
  onClick?: () => void;
}

/**
 * Props for SubmissionForm component
 * 
 * Form for stakeholders to submit their perspectives
 */
export interface SubmissionFormProps {
  sessionId: string;
  stakeholderId: string;
  onSubmitSuccess: (submission: any) => void;
}

/**
 * Props for SynthesisDisplay component
 * 
 * Renders AI-generated consensus with streaming support
 */
export interface SynthesisDisplayProps {
  synthesisId?: string;
  content?: string;
  isStreaming?: boolean;
  onCritiqueSubmit: (critique: string) => void;
}

// ============================================================================
// AI/LLM Types
// ============================================================================

/**
 * AI Model Configuration
 * 
 * Defines which LLM to use and its parameters
 * 
 * @example
 * ```typescript
 * const config: AIModelConfig = {
 *   model: "gpt-4-turbo",
 *   temperature: 0.7,
 *   maxTokens: 2000,
 *   stream: true
 * };
 * ```
 */
export interface AIModelConfig {
  model: 'gpt-4-turbo' | 'gpt-4o' | 'gpt-3.5-turbo';
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * Synthesis Generation Context
 * 
 * All data needed to generate a consensus statement
 */
export interface SynthesisContext {
  sessionTitle: string;
  sessionType: SessionType;
  submissions: Array<{
    role: StakeholderRole;
    content: string;
  }>;
  previousSynthesis?: string;
  critiques?: string[];
}

// ============================================================================
// Evaluation & Metrics Types
// ============================================================================

/**
 * Satisfaction ratings by stakeholder role
 * 
 * Used to calculate Satisfaction Equity metric
 * 
 * @example
 * ```typescript
 * const ratings: SatisfactionByRole = {
 *   'developed_nation': 4.3,
 *   'developing_nation': 4.0,
 *   'civil_society': 3.9,
 *   'technical_expert': 4.2
 * };
 * 
 * const equity = calculateSatisfactionEquity(ratings);
 * // Returns: { passed: true, mean: 4.1, stdDev: 0.16 }
 * ```
 */
export type SatisfactionByRole = Record<StakeholderRole, number>;

/**
 * Evaluation metrics for a consensus session
 * 
 * Based on Multi-Dimensional Scorecard from ARCHITECTURE.md
 */
export interface EvaluationMetrics {
  processQuality: {
    perspectiveDiversityIndex: number; // Target: >0.6
    minorityVoiceRepresentation: number; // Target: >30%
    consensusStability: number; // Target: >80%
    humanOverrideRate: number; // Target: 15-40%
  };
  outcomeQuality: {
    actionability: number; // Target: >75%
    satisfactionEquity: {
      passed: boolean;
      mean: number;
      stdDev: number;
    };
    implementationRate?: number; // Target: >70% (longitudinal)
  };
  ethicalSafeguards: {
    powerImbalanceDetected: boolean;
    perspectiveSuppression: boolean;
    aiHallucinationRate: number; // Target: <5%
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Make all properties of T optional recursively
 * 
 * Useful for partial updates
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract promise type
 * 
 * @example
 * ```typescript
 * type UserPromise = Promise<User>;
 * type User = Awaited<UserPromise>; // User
 * ```
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;
