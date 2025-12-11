/**
 * Synthesis Generation Logic
 * 
 * Implements the Caucus Mediation pattern (Habermas Machine) for AI-facilitated consensus.
 * 
 * Process Flow:
 * 1. Private Elicitation → Stakeholders submit perspectives privately
 * 2. AI Synthesis & Bridging → AI finds latent shared values
 * 3. Critique & Dissent → Stakeholders provide feedback
 * 4. Iterative Refinement → AI regenerates addressing critiques
 * 
 * Key Design Decisions:
 * - Streaming by default (better UX)
 * - Minority views explicitly preserved
 * - Context window management (128K tokens)
 * - Metadata extraction (themes, conflicts)
 * 
 * For LLM maintainers:
 * - This is the core business logic for consensus building
 * - Prompts are critical - test changes carefully
 * - Always handle edge cases (0 submissions, unanimous views)
 * 
 * @module lib/ai/synthesis
 */

import { prisma } from '@/lib/db/prisma';
import { generateCompletion, streamCompletion, estimateTokens } from './openai-client';
import type { SynthesisContext, StakeholderRole } from '@/types';

/**
 * System prompt for synthesis generation
 * 
 * Critical instructions:
 * - Find common ground without smoothing over differences
 * - Explicitly name minority views
 * - Use neutral, diplomatic language
 * - Structure output for clarity
 */
const SYNTHESIS_SYSTEM_PROMPT = `You are an AI mediator facilitating consensus building among diverse stakeholders with conflicting interests.

Your role is to:
1. Identify latent shared values and priorities across all perspectives
2. Highlight areas of strong agreement
3. Acknowledge areas of disagreement without dismissing them
4. Explicitly preserve minority views (do not smooth them over)
5. Propose bridging language that respects all positions

Guidelines:
- Use neutral, diplomatic language
- Avoid favoring any particular stakeholder group
- Structure your synthesis with clear sections:
  * Common Ground (what everyone agrees on)
  * Areas of Alignment (emerging consensus)
  * Points of Tension (respectful acknowledgment of differences)
  * Minority Views (explicitly named and preserved)
  * Proposed Path Forward (bridging language)

Remember: The goal is "Google Translate for Human Cooperation" - help people understand each other, not force agreement.`;

/**
 * Generate initial synthesis from stakeholder submissions
 * 
 * This is step 2 of the Caucus Mediation flow (AI Synthesis & Bridging).
 * 
 * @param sessionId - ID of the session to generate synthesis for
 * @returns Generated synthesis content (streamed or complete)
 * 
 * @example
 * ```typescript
 * const synthesis = await generateSynthesis('sess_abc123');
 * console.log(synthesis.content);
 * ```
 * 
 * Algorithm:
 * 1. Fetch all submissions for session
 * 2. Group submissions by stakeholder role
 * 3. Build context for LLM (session type, submissions)
 * 4. Generate synthesis with streaming
 * 5. Store in database
 * 6. Return synthesis object
 * 
 * Edge Cases:
 * - No submissions → Return error
 * - Single submission → Acknowledge single perspective
 * - Unanimous views → Highlight strong consensus
 */
export async function generateSynthesis(sessionId: string): Promise<{
  id: string;
  content: string;
  version: number;
}> {
  // 1. Fetch session and submissions
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      submissions: {
        include: {
          stakeholder: true,
        },
      },
      syntheses: {
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  if (session.submissions.length === 0) {
    throw new Error('No submissions found. Need at least one perspective to generate synthesis.');
  }

  // 2. Build context for synthesis
  const context: SynthesisContext = {
    sessionTitle: session.title,
    sessionType: session.type as any,
    submissions: session.submissions.map((sub) => ({
      role: sub.stakeholder.role as StakeholderRole,
      content: sub.content,
    })),
    previousSynthesis: session.syntheses[0]?.content,
  };

  // 3. Construct prompt
  const userPrompt = buildSynthesisPrompt(context);

  // 4. Generate synthesis (non-streaming for simplicity in MVP)
  const completion = await generateCompletion({
    messages: [
      { role: 'system', content: SYNTHESIS_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7, // Balance creativity and consistency
    maxTokens: 2000, // ~1500 words
  });

  // 5. Store in database
  const nextVersion = (session.syntheses[0]?.version || 0) + 1;
  
  const synthesis = await prisma.synthesis.create({
    data: {
      sessionId,
      content: completion.content,
      version: nextVersion,
      modelUsed: 'gpt-4-turbo-preview',
      tokenCount: completion.usage.totalTokens,
      metadata: {
        submissionCount: session.submissions.length,
        stakeholderRoles: Array.from(
          new Set(session.submissions.map((s) => s.stakeholder.role))
        ),
        generatedAt: new Date().toISOString(),
      },
    },
  });

  // 6. Update session status
  await prisma.session.update({
    where: { id: sessionId },
    data: { status: 'active' }, // Ready for critiques
  });

  return {
    id: synthesis.id,
    content: synthesis.content,
    version: synthesis.version,
  };
}

/**
 * Build synthesis prompt from context
 * 
 * Structures submissions by role for clarity.
 * Includes previous synthesis if this is a refinement.
 * 
 * @param context - Synthesis generation context
 * @returns Formatted prompt string
 */
function buildSynthesisPrompt(context: SynthesisContext): string {
  let prompt = `Session: ${context.sessionTitle}\nType: ${context.sessionType}\n\n`;

  // Group submissions by role
  const byRole: Record<string, string[]> = {};
  context.submissions.forEach((sub) => {
    if (!byRole[sub.role]) byRole[sub.role] = [];
    byRole[sub.role].push(sub.content);
  });

  prompt += '## Stakeholder Perspectives:\n\n';
  Object.entries(byRole).forEach(([role, contents]) => {
    prompt += `### ${formatRole(role)}:\n`;
    contents.forEach((content, idx) => {
      prompt += `${idx + 1}. ${content}\n\n`;
    });
  });

  if (context.previousSynthesis) {
    prompt += `\n## Previous Synthesis (to be refined):\n${context.previousSynthesis}\n\n`;
  }

  if (context.critiques && context.critiques.length > 0) {
    prompt += `\n## Critiques to Address:\n`;
    context.critiques.forEach((critique, idx) => {
      prompt += `${idx + 1}. ${critique}\n`;
    });
    prompt += '\n';
  }

  prompt += `\nGenerate a consensus synthesis that addresses all perspectives and ${
    context.critiques ? 'responds to the critiques above' : 'finds common ground'
  }.`;

  return prompt;
}

/**
 * Refine synthesis based on critiques
 * 
 * This is step 4 of the Caucus Mediation flow (Iterative Refinement).
 * 
 * @param synthesisId - ID of synthesis to refine
 * @returns New refined synthesis
 * 
 * @example
 * ```typescript
 * const refined = await refineSynthesis('synth_def456');
 * console.log(`New version: ${refined.version}`);
 * ```
 * 
 * Algorithm:
 * 1. Fetch synthesis and all critiques
 * 2. Build refinement context (original + critiques)
 * 3. Generate new version
 * 4. Increment version number
 * 5. Return new synthesis
 */
export async function refineSynthesis(synthesisId: string): Promise<{
  id: string;
  content: string;
  version: number;
}> {
  // 1. Fetch synthesis and critiques
  const synthesis = await prisma.synthesis.findUnique({
    where: { id: synthesisId },
    include: {
      session: {
        include: {
          submissions: {
            include: {
              stakeholder: true,
            },
          },
        },
      },
      critiques: true,
    },
  });

  if (!synthesis) {
    throw new Error(`Synthesis not found: ${synthesisId}`);
  }

  if (synthesis.critiques.length === 0) {
    throw new Error('No critiques found. Need feedback to refine synthesis.');
  }

  // 2. Build refinement context
  const context: SynthesisContext = {
    sessionTitle: synthesis.session.title,
    sessionType: synthesis.session.type as any,
    submissions: synthesis.session.submissions.map((sub) => ({
      role: sub.stakeholder.role as StakeholderRole,
      content: sub.content,
    })),
    previousSynthesis: synthesis.content,
    critiques: synthesis.critiques.map((c) => c.content),
  };

  // 3. Generate refined synthesis
  const userPrompt = buildSynthesisPrompt(context);

  const completion = await generateCompletion({
    messages: [
      { role: 'system', content: SYNTHESIS_SYSTEM_PROMPT },
      {
        role: 'user',
        content: userPrompt + '\n\nIMPORTANT: Address all critiques explicitly in your refined synthesis.',
      },
    ],
    temperature: 0.7,
    maxTokens: 2000,
  });

  // 4. Store refined version
  const refinedSynthesis = await prisma.synthesis.create({
    data: {
      sessionId: synthesis.sessionId,
      content: completion.content,
      version: synthesis.version + 1,
      modelUsed: 'gpt-4-turbo-preview',
      tokenCount: completion.usage.totalTokens,
      metadata: {
        refinedFrom: synthesisId,
        critiqueCount: synthesis.critiques.length,
        generatedAt: new Date().toISOString(),
      },
    },
  });

  return {
    id: refinedSynthesis.id,
    content: refinedSynthesis.content,
    version: refinedSynthesis.version,
  };
}

/**
 * Format stakeholder role for display
 * 
 * Converts snake_case to Title Case
 * 
 * @example
 * formatRole('developed_nation') → 'Developed Nation'
 */
function formatRole(role: string): string {
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Calculate Perspective Diversity Index
 * 
 * Measures semantic variance across submissions.
 * Target: >0.6 (indicates diverse viewpoints)
 * 
 * MVP: Simple implementation (unique keywords / total keywords)
 * Future: Use embeddings for semantic similarity
 * 
 * @param submissions - Array of submission contents
 * @returns Diversity index (0-1)
 */
export function calculateDiversityIndex(submissions: string[]): number {
  // Simple keyword-based diversity (MVP)
  const allWords = submissions.flatMap((s) =>
    s.toLowerCase().match(/\b\w+\b/g) || []
  );
  const uniqueWords = new Set(allWords);

  return allWords.length > 0 ? uniqueWords.size / allWords.length : 0;
}
