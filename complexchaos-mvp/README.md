# ComplexChaos MVP

> **AI-powered consensus building platform for multi-stakeholder alignment**  
> Built for LLM comprehension and maintenance - every file is extensively documented for AI agents like Groq Code.

---

## 🎯 Product Vision

ComplexChaos helps management consultants, diplomats, and strategic planners align diverse stakeholders across conflicting interests—without endless meetings or survey fatigue.

**Core Value Proposition**: ["Google Translate for Human Cooperation"](https://techcrunch.com/2025/09/29/complex-chaos-thinks-ai-can-help-people-find-common-ground/)

**Validated Results** (Bonn UN Climate Negotiations, July 2025):
- 60% reduction in coordination time
- 91% discovered new perspectives
- 35% empathy increase
- 3x perceived co-presence

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 14 App Router)                │
│  • Server Components for SEO                                        │
│  • Client Components for interactivity                              │
│  • API Routes for backend logic                                     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
         ┌──────────▼──────┐ ┌──▼─────┐ ┌────▼─────────┐
         │   Database      │ │OpenAI  │ │    Redis     │
         │  (PostgreSQL)   │ │  API   │ │   (Cache)    │
         └─────────────────┘ └────────┘ └──────────────┘
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 14 + TypeScript | SSR/SSG, API routes, Vercel-ready |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid UI development, accessible components |
| **Database** | PostgreSQL + Prisma | Type-safe queries, migrations |
| **AI** | OpenAI GPT-4 | Synthesis generation, streaming |
| **Cache** | Redis (optional) | LLM response caching |
| **Deployment** | Vercel | Zero-config CI/CD |

---

## 📂 Project Structure

```
complexchaos-mvp/
├── app/                      # Next.js 14 App Router
│   ├── (auth)/              # Auth-gated routes
│   │   ├── dashboard/       # Session management
│   │   └── session/[id]/    # Active session workspace
│   ├── api/                 # Backend API routes
│   │   ├── sessions/        # CRUD for consensus sessions
│   │   ├── submissions/     # Stakeholder input handling
│   │   └── synthesis/       # AI synthesis generation
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── components/              # React components
│   ├── ui/                  # shadcn/ui primitives
│   ├── session/             # Session-specific components
│   └── synthesis/           # AI synthesis display
├── lib/                     # Business logic
│   ├── ai/                  # AI orchestration
│   │   ├── openai-client.ts
│   │   └── synthesis.ts
│   ├── db/                  # Database utilities
│   │   └── prisma.ts
│   └── utils.ts             # Shared utilities
├── prisma/                  # Database schema & migrations
│   ├── schema.prisma        # Database models
│   └── seed.ts              # Sample data
├── types/                   # TypeScript type definitions
│   └── index.ts
└── public/                  # Static assets
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+ (local or cloud like Supabase)
- OpenAI API key

### 1. Installation

```bash
cd complexchaos-mvp
npm install
```

### 2. Environment Setup

Create `.env` file:

```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/complexchaos?schema=public"

# OpenAI API
OPENAI_API_KEY="sk-..."

# Next.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
```

### 3. Database Setup

```bash
# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed

# (Optional) Open Prisma Studio
npm run db:studio
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🗄️ Database Schema

### Core Models

```prisma
// Session: A consensus-building initiative
model Session {
  id          String   @id @default(cuid())
  title       String
  description String?
  type        String   // 'climate', 'strategic_planning', etc.
  status      String   @default("pending") // 'pending', 'active', 'completed'
  
  facilitatorId String
  facilitator   User   @relation(fields: [facilitatorId], references: [id])
  
  stakeholders  Stakeholder[]
  submissions   Submission[]
  syntheses     Synthesis[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Stakeholder: Participant in a session
model Stakeholder {
  id        String @id @default(cuid())
  name      String
  email     String
  role      String // 'developed_nation', 'developing_nation', 'civil_society', etc.
  
  sessionId String
  session   Session @relation(fields: [sessionId], references: [id])
  
  submissions Submission[]
  
  createdAt DateTime @default(now())
}

// Submission: Stakeholder input (text, eventually audio/files)
model Submission {
  id      String @id @default(cuid())
  content String @db.Text
  type    String @default("text") // 'text', 'audio', 'document'
  
  stakeholderId String
  stakeholder   Stakeholder @relation(fields: [stakeholderId], references: [id])
  
  sessionId String
  session   Session @relation(fields: [sessionId], references: [id])
  
  createdAt DateTime @default(now())
}

// Synthesis: AI-generated consensus statement
model Synthesis {
  id           String  @id @default(cuid())
  content      String  @db.Text
  version      Int     @default(1)
  modelUsed    String  @default("gpt-4-turbo")
  tokenCount   Int?
  
  sessionId String
  session   Session @relation(fields: [sessionId], references: [id])
  
  critiques Critique[]
  
  createdAt DateTime @default(now())
}

// Critique: Stakeholder feedback on synthesis
model Critique {
  id      String @id @default(cuid())
  content String @db.Text
  
  synthesisId String
  synthesis   Synthesis @relation(fields: [synthesisId], references: [id])
  
  stakeholderId String
  // stakeholder relationship (to be added)
  
  createdAt DateTime @default(now())
}
```

---

## 🧠 AI Orchestration Flow

### Caucus Mediation Pattern (Habermas Machine)

```typescript
// lib/ai/synthesis.ts

/**
 * 1. PRIVATE ELICITATION
 *    Stakeholders submit perspectives privately (prevents groupthink)
 */
const submissions = await getSubmissions(sessionId);

/**
 * 2. AI SYNTHESIS & BRIDGING
 *    AI analyzes all inputs, finds latent shared values
 */
const synthesis = await generateSynthesis(submissions);

/**
 * 3. CRITIQUE & DISSENT
 *    Stakeholders critique: "What did this miss?"
 */
const critiques = await getCritiques(synthesisId);

/**
 * 4. ITERATIVE REFINEMENT
 *    AI regenerates statement addressing critiques
 */
const refined = await regenerateSynthesis(synthesis, critiques);
```

### Streaming Implementation

```typescript
// app/api/synthesis/stream/route.ts

import { OpenAIStream, StreamingTextResponse } from 'ai';

export async function POST(req: Request) {
  const { sessionId } = await req.json();
  
  const stream = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [...],
    stream: true
  });

  return new StreamingTextResponse(OpenAIStream(stream));
}
```

---

## 🔑 Key Design Principles (for LLM Maintainability)

### 1. **Self-Documenting Code**
Every function has:
- JSDoc comment explaining purpose
- Parameter descriptions with types
- Return type annotations
- Usage examples

### 2. **Clear Module Boundaries**
```
lib/
├── ai/           → AI-specific logic (OpenAI, prompts)
├── db/           → Database utilities (Prisma client)
└── utils.ts      → Pure functions (no side effects)
```

### 3. **Type Safety**
```typescript
// types/index.ts
export type SessionStatus = 'pending' | 'active' | 'completed';
export type StakeholderRole = 'developed_nation' | 'developing_nation' | 'civil_society' | 'technical_expert';

export interface CreateSessionDTO {
  title: string;
  description?: string;
  type: string;
  facilitatorId: string;
  stakeholders: Array<{ name: string; email: string; role: StakeholderRole }>;
}
```

### 4. **Error Handling**
```typescript
try {
  const synthesis = await generateSynthesis(sessionId);
  return { success: true, data: synthesis };
} catch (error) {
  console.error('Synthesis generation failed:', error);
  return { success: false, error: error.message };
}
```

---

## 🧪 Testing Strategy

### Unit Tests (Jest)
```typescript
// lib/ai/__tests__/synthesis.test.ts
describe('generateSynthesis', () => {
  it('should generate synthesis from submissions', async () => {
    const submissions = [{ content: 'Focus on climate finance' }, ...];
    const result = await generateSynthesis(submissions);
    expect(result).toHaveProperty('content');
  });
});
```

### API Tests (Postman/Thunder Client)
```bash
# Create session
POST /api/sessions
{
  "title": "Climate Strategy 2025",
  "type": "climate",
  "facilitatorId": "user_123"
}

# Add submission
POST /api/submissions
{
  "sessionId": "sess_abc",
  "stakeholderId": "stake_xyz",
  "content": "We need carbon pricing mechanisms"
}

# Generate synthesis
POST /api/synthesis/generate
{
  "sessionId": "sess_abc"
}
```

---

## 📊 Metrics & Observability

### Key Metrics to Track
- **Process Quality**: Perspective Diversity Index (>0.6), Minority Voice Representation (>30%)
- **Outcome Quality**: Satisfaction Equity (no group >1σ below mean), Implementation Rate (>70%)
- **Ethical Safeguards**: Power Imbalance Detection, AI Hallucination Rate (<5%)

### Implementation (Future)
```typescript
// lib/metrics/evaluation.ts
export function calculateDiversityIndex(submissions: Submission[]): number {
  // Semantic variance across inputs
  // Using embeddings to measure topical diversity
}

export function detectPowerImbalance(satisfactionByRole: Record<string, number>): boolean {
  const mean = Object.values(satisfactionByRole).reduce((a, b) => a + b) / ...;
  const stdDev = calculateStdDev(Object.values(satisfactionByRole));
  
  return Object.values(satisfactionByRole).some(
    score => score < (mean - stdDev)
  );
}
```

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Set environment variables
vercel env add DATABASE_URL
vercel env add OPENAI_API_KEY
```

### Docker (Alternative)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

---

## 🛠️ Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/audio-transcription

# Make changes with extensive inline docs
# Commit with descriptive messages
git commit -m "feat: add Whisper API integration for audio transcription

- Implement audio upload endpoint
- Add background worker for transcription
- Store transcripts with word-level timestamps"

# Push and create PR
git push origin feature/audio-transcription
```

### 2. Code Review Checklist
- [ ] All functions have JSDoc comments
- [ ] TypeScript types are explicit (no `any`)
- [ ] Error handling is comprehensive
- [ ] Database queries use Prisma (type-safe)
- [ ] API routes have Zod validation

---

## 📚 Resources

### Architecture Documents
- [ARCHITECTURE.md](../ARCHITECTURE.md) - C4 diagrams, evaluation framework
- [TECHNICAL_INTERVIEW_PREP.md](../TECHNICAL_INTERVIEW_PREP.md) - Detailed implementation guide

### External References
- [TechCrunch Coverage](https://techcrunch.com/2025/09/29/complex-chaos-thinks-ai-can-help-people-find-common-ground/)
- [WEF Bonn Pilot Results](https://www.weforum.org/stories/2025/09/ai-diplomacy-scale-inclusion-global-climate-negotiations/)
- [Habermas Machine Research (Google DeepMind)](https://www.science.org/doi/10.1126/science.adq2852)

---

## 🤖 For LLM Agents (Groq Code, Claude, GPT)

### How to Navigate This Codebase

1. **Start with `prisma/schema.prisma`** → Understand data model
2. **Read `lib/ai/synthesis.ts`** → Core business logic
3. **Explore `app/api/*`** → API endpoints
4. **Check `types/index.ts`** → Type definitions

### Common Tasks

```typescript
// Add a new API endpoint
// 1. Create file: app/api/new-feature/route.ts
// 2. Export POST/GET handlers with Zod validation
// 3. Update types/index.ts with new DTOs

// Add a database model
// 1. Edit prisma/schema.prisma
// 2. Run: npm run db:push
// 3. Prisma Client auto-regenerates

// Add a new component
// 1. Create: components/feature/MyComponent.tsx
// 2. Use TypeScript for props
// 3. Document with JSDoc
```

### Philosophy
> **Every file should be understandable in isolation.**  
> If you can't understand a function without reading 5 other files, it needs better documentation.

---

**Built with ❤️ for human cooperation**  
*Version: 0.1.0 (Master MVP)*
