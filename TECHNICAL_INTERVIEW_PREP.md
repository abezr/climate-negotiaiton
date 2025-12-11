# ComplexChaos: Technical Interview Preparation

> **Comprehensive preparation for 60-minute technical interview covering: File processing, Real-time systems, Framework migrations, Microservices, Audio processing, and Zero-downtime deploys**

---

## Table of Contents

1. [ComplexChaos Product Understanding](#1-complexchaos-product-understanding)
2. [File Processing](#2-file-processing)
3. [Real-Time Systems](#3-real-time-systems)
4. [Framework Migrations (Vue → Next.js)](#4-framework-migrations-vue--nextjs)
5. [Microservices Integration](#5-microservices-integration)
6. [Audio Processing](#6-audio-processing)
7. [Reliability & Zero-Downtime Deploys](#7-reliability--zero-downtime-deploys)
8. [Implementation Design: Building ComplexChaos](#8-implementation-design-building-complexchaos)
9. [My Relevant Experience](#9-my-relevant-experience)

---

## 1. ComplexChaos Product Understanding

### Core Product Features (from complexchaos.ai)

| Feature | Technical Implication |
|---------|----------------------|
| **Multi-stakeholder alignment** | Real-time collaborative editing, conflict resolution |
| **AI-led conversations** | LLM orchestration, prompt management, streaming responses |
| **Asynchronous engagement** | Offline-first architecture, eventual consistency |
| **Stakeholder input capture** | File upload (docs, audio), rich text editing, form processing |
| **Insights organized** | Document parsing, semantic search, data warehousing |
| **Goodbye groupthink** | Private submissions → aggregation (similar to Habermas Machine) |

### Key User Workflows

```
┌─────────────────────────────────────────────────────────────────────┐
│                     USER JOURNEY                                     │
├─────────────────────────────────────────────────────────────────────┤
│  1. Facilitator creates session (Climate Strategy, M&A, etc.)       │
│  2. Stakeholders invited (async, could be global time zones)        │
│  3. Participants submit inputs:                                     │
│     • Text responses (rich text editor)                             │
│     • Document uploads (PDFs, Word, presentations)                  │
│     • Audio recordings (voice memos)                                │
│  4. AI analyzes inputs → generates synthesis                        │
│  5. Participants critique/refine consensus                          │
│  6. Final report exported (PDF, Word)                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. File Processing

### Challenge: Diverse Document Formats

**ComplexChaos Context**: Consultants upload client reports (PDFs, Word docs, PowerPoint), diplomats share UN documents, strategic plans in various formats.

### My Approach

#### A. Document Parsing Pipeline

```typescript
// File Upload Handler (Next.js API Route)
// /api/documents/upload

import { PDFExtract } from 'pdf.js-extract';
import mammoth from 'mammoth';  // Word docs
import { Storage } from '@google-cloud/storage';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    }
  }
};

interface DocumentMetadata {
  id: string;
  filename: string;
  mimeType: string;
  uploadedBy: string;
  sessionId: string;
  extractedText?: string;
  pageCount?: number;
  status: 'processing' | 'ready' | 'failed';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const file = req.body.file; // Assuming multipart form data
  const sessionId = req.body.sessionId;

  // 1. Upload to cloud storage (GCS/S3)
  const storage = new Storage();
  const bucket = storage.bucket('complexchaos-documents');
  const blob = bucket.file(`${sessionId}/${Date.now()}-${file.name}`);
  
  await blob.save(file.buffer);

  // 2. Queue for async processing (Pub/Sub, SQS, or Redis Queue)
  await queueDocumentProcessing({
    fileUrl: blob.publicUrl(),
    mimeType: file.mimetype,
    sessionId,
    documentId: blob.name
  });

  res.status(202).json({ 
    message: 'Document queued for processing',
    documentId: blob.name 
  });
}
```

#### B. Background Worker for Text Extraction

```typescript
// Worker process (separate service or serverless function)
// workers/document-processor.ts

import { PDFExtract } from 'pdf.js-extract';
import mammoth from 'mammoth';
import { parseOfficeAsync } from 'officeparser';

async function processDocument(job: DocumentJob) {
  const { fileUrl, mimeType, documentId, sessionId } = job;
  
  let extractedText = '';
  let metadata: any = {};

  try {
    switch (mimeType) {
      case 'application/pdf':
        const pdfData = await PDFExtract.extract(fileUrl);
        extractedText = pdfData.pages
          .map(page => page.content.map(item => item.str).join(' '))
          .join('\n');
        metadata.pageCount = pdfData.pages.length;
        break;

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        const docResult = await mammoth.extractRawText({ path: fileUrl });
        extractedText = docResult.value;
        break;

      case 'application/vnd.ms-powerpoint':
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        extractedText = await parseOfficeAsync(fileUrl);
        break;

      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }

    // 3. Chunk for vector embedding
    const chunks = chunkText(extractedText, 512); // 512 token chunks

    // 4. Generate embeddings (OpenAI, Cohere, etc.)
    const embeddings = await generateEmbeddings(chunks);

    // 5. Store in vector database (pgvector, Pinecone, Weaviate)
    await storeEmbeddings(documentId, chunks, embeddings);

    // 6. Update document status
    await db.documents.update({
      where: { id: documentId },
      data: {
        extractedText,
        status: 'ready',
        metadata,
        processedAt: new Date()
      }
    });

    // 7. Notify client via WebSocket
    await notifyClient(sessionId, {
      type: 'document_ready',
      documentId
    });

  } catch (error) {
    console.error('Document processing failed:', error);
    await db.documents.update({
      where: { id: documentId },
      data: { status: 'failed', error: error.message }
    });
  }
}
```

#### C. Chunking Strategy for RAG

```typescript
function chunkText(text: string, maxTokens: number = 512): string[] {
  // Simple sentence-boundary-aware chunking
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    
    if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
      currentTokens = sentenceTokens;
    } else {
      currentChunk += ' ' + sentence;
      currentTokens += sentenceTokens;
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

function estimateTokens(text: string): number {
  // Rough approximation: ~4 characters per token
  return Math.ceil(text.length / 4);
}
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Async processing** | Large PDFs (100+ pages) can take 10-30s to process — don't block user |
| **Cloud storage** | Serve files via CDN, enable disaster recovery |
| **Chunking** | LLM context windows (4K-128K tokens) require breaking documents into retrievable chunks |
| **Vector embeddings** | Enable semantic search: "Find all mentions of 'carbon credits'" |

### Real-World Challenge: Large File Uploads

**Problem**: 50MB PDF from a law firm times out in Next.js API route (default 4MB limit).

**Solution**:
1. **Client-side chunking**: Use [tus.io](https://tus.io/) resumable upload protocol
2. **Signed upload URLs**: Generate presigned S3/GCS URL, upload directly from client
3. **Progress tracking**: WebSocket or polling to show upload progress

```typescript
// Generate signed URL
export async function POST(req: Request) {
  const { filename, contentType } = await req.json();
  
  const storage = new Storage();
  const bucket = storage.bucket('complexchaos-uploads');
  const file = bucket.file(`uploads/${Date.now()}-${filename}`);

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType
  });

  return Response.json({ uploadUrl: url, fileId: file.name });
}
```

---

## 3. Real-Time Systems

### Challenge: Collaborative Consensus Building

**ComplexChaos Context**: Multiple stakeholders view AI-generated synthesis → provide critiques in real-time → AI refines → repeat.

### My Approach

#### A. WebSocket Architecture

```typescript
// server/websocket-server.ts (using Socket.IO with Next.js)

import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

const pubClient = new Redis(process.env.REDIS_URL);
const subClient = pubClient.duplicate();

const io = new Server(server, {
  adapter: createAdapter(pubClient, subClient),
  cors: { origin: process.env.CLIENT_URL }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_session', async ({ sessionId, userId }) => {
    await socket.join(`session:${sessionId}`);
    
    // Broadcast presence
    io.to(`session:${sessionId}`).emit('user_joined', {
      userId,
      timestamp: Date.now()
    });

    // Send current session state
    const state = await getSessionState(sessionId);
    socket.emit('session_state', state);
  });

  socket.on('submit_critique', async ({ sessionId, critiqueText }) => {
    // Store critique
    await db.critiques.create({
      data: {
        sessionId,
        userId: socket.data.userId,
        text: critiqueText,
        timestamp: new Date()
      }
    });

    // Broadcast to all participants
    io.to(`session:${sessionId}`).emit('new_critique', {
      userId: socket.data.userId,
      text: critiqueText,
      timestamp: Date.now()
    });

    // Trigger AI refinement (debounced)
    await triggerAIRefinement(sessionId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
```

#### B. Operational Transform for Collaborative Editing

For the consensus statement that participants refine together:

```typescript
// Using Yjs for CRDT-based collaboration
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// Client-side
const doc = new Y.Doc();
const provider = new WebsocketProvider('wss://api.complexchaos.ai', 'session-123', doc);
const yText = doc.getText('consensus-statement');

// Bind to editor (Quill, TipTap, etc.)
const editor = new Quill('#editor');
const binding = new QuillBinding(yText, editor);

// All edits automatically sync via WebSocket
yText.observe(event => {
  console.log('Text changed by another user:', event.changes);
});
```

#### C. Presence & Awareness

Show who's currently viewing/editing:

```typescript
// Using Yjs awareness
const awareness = provider.awareness;

// Set local user state
awareness.setLocalStateField('user', {
  name: 'Alice',
  color: '#ff0000',
  cursor: { line: 10, column: 5 }
});

// Listen to remote changes
awareness.on('change', changes => {
  changes.added.forEach(clientId => {
    const state = awareness.getStates().get(clientId);
    console.log('User joined:', state.user);
  });
});
```

### Scaling Considerations

| Challenge | Solution |
|-----------|----------|
| **Horizontal scaling** | Use Redis adapter for Socket.IO to sync across multiple Node.js instances |
| **Connection storms** | Implement connection rate limiting, exponential backoff on reconnect |
| **Memory leaks** | Properly clean up listeners on disconnect |
| **Firewall issues** | Fallback to long-polling if WebSocket blocked |

---

## 4. Framework Migrations (Vue → Next.js)

### Challenge: Migrate Existing Vue.js App to Next.js

**ComplexChaos Context**: Job description mentions Vue → Next.js migration, likely monolith to microservices decomposition.

### My Approach: Strangler Fig Pattern

#### Phase 1: Setup Next.js Shell

```bash
# Create Next.js app alongside existing Vue app
npx create-next-app@latest complexchaos-next --typescript --app
cd complexchaos-next
```

#### Phase 2: Routing Strategy

Use reverse proxy (nginx, Vercel rewrites) to gradually route to Next.js:

```javascript
// next.config.js
module.exports = {
  async rewrites() {
    return {
      beforeFiles: [
        // New routes go to Next.js
        { source: '/sessions/:path*', destination: '/sessions/:path*' },
        { source: '/api/v2/:path*', destination: '/api/v2/:path*' },
      ],
      afterFiles: [
        // Fallback to old Vue app (running on :3001)
        { source: '/:path*', destination: 'http://localhost:3001/:path*' },
      ],
    };
  },
};
```

#### Phase 3: Feature-by-Feature Migration

```
Migration Order (based on dependency graph):

1. Auth/Login page (low coupling)         ← Start here
2. Dashboard (read-only views)
3. Session creation (forms, validation)
4. Real-time collaboration (highest risk)  ← Migrate last
```

#### Phase 4: Shared Component Library

```typescript
// packages/ui-components (monorepo with Turborepo)
// Both Vue and React can import styled primitives

// Button.tsx (React)
export const Button: React.FC<ButtonProps> = ({ children, ...props }) => {
  return <button className="btn-primary" {...props}>{children}</button>;
};

// Button.vue (Vue 3 Composition API)
<template>
  <button class="btn-primary" v-bind="$attrs">
    <slot />
  </button>
</template>
```

#### Phase 5: Data Layer Abstraction

```typescript
// shared/api-client.ts (framework-agnostic)
import axios from 'axios';

export class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async getSessions() {
    const { data } = await axios.get(`${this.baseURL}/sessions`);
    return data;
  }

  async createSession(payload: CreateSessionDTO) {
    const { data } = await axios.post(`${this.baseURL}/sessions`, payload);
    return data;
  }
}

// Use in Next.js
const apiClient = new APIClient('/api/v2');

// Use in Vue
const apiClient = new APIClient('/api/v1');
```

### Migration Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Breaking changes** | Feature flags: serve Vue to 90%, Next.js to 10% during rollout |
| **SEO impact** | Ensure Next.js uses SSR/SSG for public pages |
| **State management** | Migrate Vuex → Zustand/Jotai incrementally, keep localStorage schema |
| **Auth tokens** | Share JWT/session cookies between apps |

---

## 5. Microservices Integration

### Challenge: Decompose Monolith for Scale

**ComplexChaos Context**: Separate concerns (auth, AI orchestration, file processing, real-time sync).

### My Proposed Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                          │
└────────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
         ┌──────────▼──────┐ ┌──▼─────┐ ┌────▼─────────┐
         │   API Gateway   │ │  Auth  │ │  WebSocket   │
         │  (Kong/Envoy)   │ │Service │ │    Server    │
         └────────┬────────┘ └────────┘ └──────────────┘
                  │
      ┌───────────┼───────────┬──────────────┐
      │           │           │              │
┌─────▼─────┐ ┌──▼──────┐ ┌──▼────────┐ ┌───▼────────┐
│ Consensus │ │  File   │ │    AI     │ │   Export   │
│  Service  │ │Processor│ │Orchestrator│ │  Service   │
└───────────┘ └─────────┘ └───────────┘ └────────────┘
      │             │            │              │
      └─────────────┴────────────┴──────────────┘
                    │
              ┌─────▼──────┐
              │ PostgreSQL │
              │ (Supabase) │
              └────────────┘
```

### Service Boundaries

#### 1. Consensus Service

```typescript
// services/consensus/src/index.ts

import express from 'express';
import { z } from 'zod';

const app = express();

const CreateSessionSchema = z.object({
  facilitatorId: z.string().uuid(),
  title: z.string().min(3),
  stakeholders: z.array(z.string().email()),
  type: z.enum(['climate', 'strategic_planning', 'procurement'])
});

app.post('/sessions', async (req, res) => {
  const validated = CreateSessionSchema.parse(req.body);
  
  const session = await db.sessions.create({
    data: {
      ...validated,
      status: 'pending',
      createdAt: new Date()
    }
  });

  // Publish event for other services
  await pubsub.publish('session.created', session);

  res.status(201).json(session);
});

app.listen(3002, () => console.log('Consensus service running on :3002'));
```

#### 2. AI Orchestrator Service

```typescript
// services/ai-orchestrator/src/index.ts

import { OpenAI } from 'openai';
import { Queue } from 'bullmq';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const synthesisQueue = new Queue('synthesis', { connection: redis });

// Consumer: Process synthesis requests
synthesisQueue.process(async (job) => {
  const { sessionId, inputs } = job.data;

  // 1. Retrieve relevant documents (RAG)
  const context = await retrieveContext(sessionId, inputs);

  // 2. Generate synthesis
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: SYNTHESIS_PROMPT },
      { role: 'user', content: JSON.stringify({ inputs, context }) }
    ],
    stream: true
  });

  // 3. Stream results back via WebSocket
  for await (const chunk of completion) {
    const content = chunk.choices[0]?.delta?.content || '';
    await notifyClient(sessionId, { type: 'synthesis_chunk', content });
  }

  // 4. Store final synthesis
  await db.syntheses.create({
    data: {
      sessionId,
      text: fullText,
      modelUsed: 'gpt-4-turbo',
      tokenCount: completion.usage.total_tokens
    }
  });
});

app.post('/generate-synthesis', async (req, res) => {
  const { sessionId, inputs } = req.body;
  
  await synthesisQueue.add('synthesize', { sessionId, inputs });
  
  res.status(202).json({ message: 'Synthesis queued' });
});
```

### Inter-Service Communication

#### A. Event-Driven (Pub/Sub)

```typescript
// shared/events.ts

import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub();

export async function publishEvent(topic: string, data: any) {
  const messageId = await pubsub.topic(topic).publishMessage({
    data: Buffer.from(JSON.stringify(data))
  });
  console.log(`Event published: ${topic}, messageId: ${messageId}`);
}

export function subscribeToEvent(subscription: string, handler: (data: any) => void) {
  const sub = pubsub.subscription(subscription);
  
  sub.on('message', (message) => {
    const data = JSON.parse(message.data.toString());
    handler(data);
    message.ack();
  });
}

// Usage in File Processor
subscribeToEvent('document-uploaded', async (data) => {
  console.log('New document to process:', data.documentId);
  await processDocument(data);
});
```

#### B. Synchronous API Calls (for critical paths)

```typescript
// services/shared/rpc-client.ts

import axios from 'axios';

export class RPCClient {
  async call(service: string, method: string, params: any) {
    const serviceUrl = process.env[`${service.toUpperCase()}_URL`];
    
    const response = await axios.post(`${serviceUrl}/rpc`, {
      method,
      params,
      id: Date.now()
    }, {
      timeout: 5000,
      headers: { 'X-Service-Token': process.env.SERVICE_SECRET }
    });

    return response.data.result;
  }
}

// Usage
const rpc = new RPCClient();
const user = await rpc.call('auth-service', 'getUserById', { id: '123' });
```

### Service Mesh (Optional for Production)

```yaml
# kubernetes/istio-config.yaml

apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: consensus-service
spec:
  hosts:
  - consensus-service
  http:
  - match:
    - uri:
        prefix: "/sessions"
    route:
    - destination:
        host: consensus-service
        port:
          number: 3002
    retries:
      attempts: 3
      perTryTimeout: 2s
    timeout: 10s
```

---

## 6. Audio Processing

### Challenge: Voice Input for Stakeholders

**ComplexChaos Context**: Diplomats/consultants may prefer voice memos over typing (especially multilingual).

### My Approach

#### A. Client-Side Audio Recording

```typescript
// components/AudioRecorder.tsx

import { useState, useRef } from 'react';

export function AudioRecorder({ onRecordingComplete }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    mediaRecorder.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };

    mediaRecorder.current.onstop = async () => {
      const blob = new Blob(chunks.current, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(blob);
      
      // Upload to server
      await uploadAudio(blob);
      
      onRecordingComplete(audioUrl);
      chunks.current = [];
    };

    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  return (
    <div>
      {!isRecording ? (
        <button onClick={startRecording}>🎤 Record</button>
      ) : (
        <button onClick={stopRecording}>⏹ Stop</button>
      )}
    </div>
  );
}
```

#### B. Server-Side Transcription

```typescript
// api/audio/transcribe.ts

import { OpenAI } from 'openai';
import { Storage } from '@google-cloud/storage';
import ffmpeg from 'fluent-ffmpeg';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const formData = await req.formData();
  const audioFile = formData.get('audio') as File;
  const sessionId = formData.get('sessionId') as string;

  // 1. Save to temporary location
  const tempPath = `/tmp/${Date.now()}-${audioFile.name}`;
  await Bun.write(tempPath, await audioFile.arrayBuffer());

  // 2. Convert to MP3 if needed (Whisper prefers MP3/M4A/WAV)
  const mp3Path = await convertToMP3(tempPath);

  // 3. Transcribe with Whisper
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(mp3Path),
    model: 'whisper-1',
    language: 'en', // or auto-detect
    response_format: 'verbose_json' // includes timestamps
  });

  // 4. Store transcription
  await db.audioSubmissions.create({
    data: {
      sessionId,
      audioUrl: await uploadToStorage(mp3Path),
      transcription: transcription.text,
      segments: transcription.segments, // word-level timestamps
      duration: transcription.duration,
      language: transcription.language
    }
  });

  return Response.json({ 
    text: transcription.text,
    segments: transcription.segments 
  });
}

async function convertToMP3(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(/\.\w+$/, '.mp3');
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .audioBitrate('128k')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath);
  });
}
```

#### C. Speaker Diarization (Advanced)

For multi-speaker audio (e.g., recorded meetings):

```typescript
// Using AssemblyAI or Deepgram for diarization

import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });

const transcript = await client.transcripts.transcribe({
  audio_url: audioFileUrl,
  speaker_labels: true,
  language_code: 'en'
});

// Output:
// [
//   { speaker: 'A', text: 'I think we should focus on climate finance...', start: 0, end: 5000 },
//   { speaker: 'B', text: 'But what about adaptation needs?', start: 5100, end: 8000 }
// ]
```

### Audio Processing Challenges

| Challenge | Solution |
|-----------|----------|
| **Large files** | Stream upload using signed URLs, process in chunks |
| **Multilingual** | Whisper auto-detects 99 languages |
| **Background noise** | Pre-process with noise reduction (ffmpeg filters) |
| **Real-time transcription** | Use Deepgram streaming API for live transcription |

---

## 7. Reliability & Zero-Downtime Deploys

### Challenge: Deploy Without Disrupting Active Sessions

**ComplexChaos Context**: Diplomats in Bonn can't lose their in-progress consensus session when you deploy a bug fix.

### My Approach

#### A. Blue-Green Deployment

```yaml
# kubernetes/deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: complexchaos-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: complexchaos
      version: blue
  template:
    metadata:
      labels:
        app: complexchaos
        version: blue
    spec:
      containers:
      - name: app
        image: complexchaos:v1.2.3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: complexchaos
spec:
  selector:
    app: complexchaos
    version: blue  # Switch to 'green' after validation
  ports:
  - port: 80
    targetPort: 3000
```

**Deployment Process**:
```bash
# 1. Deploy green version
kubectl apply -f deployment-green.yaml

# 2. Wait for all pods ready
kubectl wait --for=condition=ready pod -l version=green

# 3. Run smoke tests against green
curl http://complexchaos-green/health

# 4. Switch traffic
kubectl patch service complexchaos -p '{"spec":{"selector":{"version":"green"}}}'

# 5. Monitor for errors, rollback if needed
kubectl patch service complexchaos -p '{"spec":{"selector":{"version":"blue"}}}'
```

#### B. Database Migrations (Zero-Downtime)

```typescript
// migrations/2024-12-11-add-audio-field.ts

import { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  // STEP 1: Add nullable column (safe, won't block writes)
  await db.schema
    .alterTable('submissions')
    .addColumn('audio_url', 'text')
    .execute();

  // STEP 2: Backfill data (in chunks, not in migration)
  // Run separately: npm run backfill:audio-urls
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('submissions')
    .dropColumn('audio_url')
    .execute();
}
```

**Backfill Script** (runs async, doesn't block deployment):
```typescript
// scripts/backfill-audio-urls.ts

async function backfillAudioUrls() {
  const batchSize = 1000;
  let offset = 0;

  while (true) {
    const submissions = await db.submissions
      .select(['id', 'legacy_audio_path'])
      .where('audio_url', 'is', null)
      .limit(batchSize)
      .offset(offset)
      .execute();

    if (submissions.length === 0) break;

    await Promise.all(
      submissions.map(sub => 
        db.submissions
          .update({ audio_url: migrateUrl(sub.legacy_audio_path) })
          .where('id', '=', sub.id)
          .execute()
      )
    );

    offset += batchSize;
    console.log(`Backfilled ${offset} records...`);
  }
}
```

#### C. Feature Flags

```typescript
// lib/feature-flags.ts

import { getFeatureFlags } from '@/lib/posthog';

export async function isFeatureEnabled(
  flagKey: string, 
  userId: string
): Promise<boolean> {
  const flags = await getFeatureFlags(userId);
  return flags[flagKey] === true;
}

// Usage in API route
export async function POST(req: Request) {
  const userId = req.headers.get('X-User-Id');
  
  if (await isFeatureEnabled('audio-transcription-v2', userId)) {
    // Use new Whisper API
    return transcribeWithWhisper(audioFile);
  } else {
    // Use old Google Speech-to-Text
    return transcribeWithGoogle(audioFile);
  }
}
```

#### D. Graceful Shutdown

```typescript
// server.ts

import { createServer } from 'http';
import express from 'express';

const app = express();
const server = createServer(app);

let isShuttingDown = false;

// Health check endpoint (readiness probe)
app.get('/health', (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ status: 'shutting down' });
  }
  res.json({ status: 'ok' });
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM received, starting graceful shutdown...');
  isShuttingDown = true;

  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed');

    // Close database connections
    db.$disconnect()
      .then(() => {
        console.log('Database connections closed');
        process.exit(0);
      })
      .catch((err) => {
        console.error('Error during shutdown:', err);
        process.exit(1);
      });
  });

  // Force shutdown after 30s
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
});

server.listen(3000);
```

#### E. Connection Draining for WebSockets

```typescript
// websocket-server.ts

io.on('connection', (socket) => {
  activeConnections.add(socket);

  socket.on('disconnect', () => {
    activeConnections.delete(socket);
  });
});

process.on('SIGTERM', async () => {
  console.log('Draining WebSocket connections...');

  // Notify clients to reconnect to new instance
  for (const socket of activeConnections) {
    socket.emit('server_restarting', {
      message: 'Server is restarting, please reconnect',
      reconnectDelay: 2000
    });
    socket.disconnect(true);
  }

  // Wait for all disconnects
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  process.exit(0);
});
```

### Monitoring & Alerting

```typescript
// lib/monitoring.ts

import * as Sentry from '@sentry/nextjs';

export function trackDeployment(version: string) {
  Sentry.captureMessage(`Deployment started: ${version}`, 'info');
}

export function trackError(error: Error, context?: any) {
  Sentry.captureException(error, { extra: context });
}

// Alert if error rate spikes
export function checkErrorRate() {
  const errorRate = getRecentErrorRate(); // from metrics service
  
  if (errorRate > 0.05) { // 5% error rate
    sendSlackAlert(`🚨 Error rate spiked to ${errorRate * 100}%`);
  }
}
```

---

## 8. Implementation Design: Building ComplexChaos

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 14 App Router)                │
│  • SSR for SEO (public pages)                                       │
│  • Client components for real-time (WebSocket, Yjs)                 │
│  • Optimistic UI updates                                            │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
         ┌──────────▼──────┐ ┌──▼─────┐ ┌────▼─────────┐
         │   BFF/API       │ │  Auth  │ │  WebSocket   │
         │   Gateway       │ │(Clerk) │ │   (Socket.IO)│
         └────────┬────────┘ └────────┘ └──────────────┘
                  │
      ┌───────────┼───────────┬──────────────┐
      │           │           │              │
┌─────▼─────┐ ┌──▼──────┐ ┌──▼────────┐ ┌───▼────────┐
│ Consensus │ │  File   │ │    AI     │ │   Export   │
│  Engine   │ │Processor│ │Orchestrator│ │  Generator │
│           │ │         │ │ (LangChain)│ │  (Puppeteer)│
└───────────┘ └─────────┘ └───────────┘ └────────────┘
      │             │            │              │
      └─────────────┴────────────┴──────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼────┐   ┌──────▼──────┐  ┌────▼─────┐
│Postgres│   │Vector Store │  │  Redis   │
│(Supabase)  │  (pgvector) │  │ (BullMQ) │
└────────┘   └─────────────┘  └──────────┘
```

### Tech Stack Justification

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 14 | SSR/SSG for SEO, API routes, Vercel deployment |
| **Auth** | Clerk / Auth0 | Drop-in auth, handles OAuth, MFA |
| **Database** | PostgreSQL (Supabase) | Relational data, pgvector for embeddings, real-time subscriptions |
| **Real-time** | Socket.IO + Redis | WebSocket with horizontal scaling |
| **Collaboration** | Yjs | CRDT for conflict-free collaborative editing |
| **LLM** | OpenAI GPT-4 + LangChain | Prompt management, streaming, tool use |
| **Vector DB** | pgvector (in PostgreSQL) | Semantic search, co-located with main DB |
| **File Storage** | Google Cloud Storage | CDN, signed URLs, lifecycle policies |
| **Queue** | BullMQ (Redis) | Background jobs (file processing, AI synthesis) |
| **Monitoring** | Sentry + Vercel Analytics | Error tracking, performance monitoring |
| **Deployment** | Vercel (frontend) + Cloud Run (backend services) | Zero-config CI/CD, auto-scaling |

### Key Implementation Challenges

#### 1. Handling Concurrent Edits to Consensus Statement

**Problem**: Alice and Bob both edit the consensus statement simultaneously.

**Solution**: Use Yjs CRDT (Conflict-free Replicated Data Type)
- Character-by-character tracking
- Automatic conflict resolution
- No "last write wins" issues

#### 2. LLM Response Streaming

**Problem**: Generating synthesis takes 30-60 seconds. Users need feedback.

**Solution**: Stream tokens as they generate

```typescript
const stream = await openai.chat.completions.create({
  model: 'gpt-4-turbo',
  messages: [...],
  stream: true
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || '';
  io.to(sessionId).emit('synthesis_chunk', { content });
}
```

#### 3. Caching Strategy

**Problem**: Re-running expensive LLM calls for every page refresh.

**Solution**: Multi-layer caching

```typescript
// 1. In-memory cache (Redis)
const cached = await redis.get(`synthesis:${sessionId}`);
if (cached) return JSON.parse(cached);

// 2. Database cache
const dbCached = await db.syntheses.findFirst({
  where: { sessionId, inputHash: hashInputs(inputs) }
});
if (dbCached) return dbCached;

// 3. Generate new
const synthesis = await generateSynthesis(inputs);
await redis.setex(`synthesis:${sessionId}`, 3600, JSON.stringify(synthesis));
```

---

## 9. My Relevant Experience

### Direct Applicability to ComplexChaos

| ComplexChaos Need | My Experience |
|-------------------|---------------|
| **File processing** | WellMaster: Parsed well log PDFs (100+ MB), extracted structured data for AI analysis |
| **Real-time systems** | Built collaborative editing for engineering reports (conflict resolution, presence) |
| **LLM orchestration** | Implemented RAG pipeline with prompt versioning, reduced latency by 60% |
| **Migrations** | Migrated Oracle → PostgreSQL (50+ tables, zero downtime), .NET → React SPA |
| **Microservices** | Decomposed monolith into auth, data-processing, and reporting services |
| **Audio processing** | Voice-to-text for field inspection reports (Whisper API integration) |
| **Zero-downtime deploys** | Blue-green deployments on AWS ECS, database migration patterns |

### Specific Projects

#### WellMaster GenAI Agent (2023-2024)
- **Challenge**: Engineers needed to query 10 years of drilling data (PDFs, spreadsheets)
- **Solution**: Built RAG system with pgvector, streaming LLM responses
- **Stack**: Next.js, PostgreSQL, OpenAI, LangChain
- **Result**: 60% faster data retrieval, engineers adopted it for 80% of queries

#### Real-Time Collaboration (2022)
- **Challenge**: Multiple engineers editing well reports simultaneously
- **Solution**: Implemented Yjs-based CRDT, conflict-free merging
- **Stack**: Vue 3, WebSocket (Socket.IO), Yjs
- **Result**: Zero data loss, 95% user satisfaction

#### Oracle → PostgreSQL Migration (2021)
- **Challenge**: 15-year-old Oracle database, 24/7 uptime requirement
- **Solution**: Strangler fig pattern, dual-write period, gradual cutover
- **Stack**: PostgreSQL, Prisma, Docker
- **Result**: Zero downtime, 40% cost reduction

---

## Interview Strategy

### 1. Listen Carefully
- They might present a **hypothetical scenario** ("How would you handle X?")
- Or a **real ComplexChaos problem** they're currently solving

### 2. Clarify Requirements
- "Are we optimizing for latency, throughput, or reliability?"
- "What's the expected scale? 100 users or 10,000?"
- "Are there regulatory constraints (GDPR, data residency)?"

### 3. Structure My Answer
1. **Understand the problem** (restate in my own words)
2. **Propose an approach** (high-level design)
3. **Identify trade-offs** (no silver bullets)
4. **Suggest validation** (how would I test it?)

### 4. Draw Diagrams
- Whiteboard (or virtual whiteboard) helps clarify thinking
- Start with boxes and arrows, then drill into details

### 5. Relate to My Experience
- "I solved a similar problem at WellMaster when..."
- Shows pattern recognition, not just theoretical knowledge

---

## Sample Questions & My Answers

### Q1: "How would you handle a 500MB PDF upload?"

**My Answer**:
> "I'd use signed upload URLs to bypass the API server — generate a presigned S3/GCS URL, client uploads directly via multipart. This avoids timeouts and reduces server load. Once uploaded, trigger a background worker to extract text in chunks, generate embeddings, and store in pgvector. I'd show progress via WebSocket or polling. I implemented this for well log PDFs at WellMaster — some were 800+ pages."

### Q2: "How do you ensure real-time sync across 50 participants?"

**My Answer**:
> "For collaborative editing, I'd use Yjs CRDT to handle conflicts automatically. For presence (who's online), Socket.IO with Redis adapter for horizontal scaling. Key is to keep WebSocket messages small — only send deltas, not full state. I'd also implement exponential backoff on reconnect to avoid thundering herd. Similar to what I built for engineering teams at WellMaster."

### Q3: "We're migrating Vue to Next.js. How would you approach it?"

**My Answer**:
> "Strangler fig pattern — stand up Next.js alongside Vue, use reverse proxy to gradually route traffic. Prioritize low-coupling features first (auth, static pages). Share API client logic between both apps. Use feature flags to A/B test. I've done similar migrations — Oracle to Postgres, .NET to React. The key is incremental, measurable progress."

### Q4: "How would you handle audio transcription at scale?"

**My Answer**:
> "Queue-based processing — upload audio to storage, enqueue job ID. Worker pulls from queue, converts to MP3 (Whisper prefers that), calls Whisper API. For real-time, use Deepgram streaming API. For multilingual, Whisper auto-detects 99 languages. Store transcription with word-level timestamps for searchability. At WellMaster, I integrated Whisper for field voice memos."

### Q5: "How do you deploy without breaking active sessions?"

**My Answer**:
> "Blue-green deployment with graceful shutdown. When SIGTERM received, stop accepting new connections, wait for in-flight requests to complete (30s timeout). For WebSockets, notify clients 'server_restarting', they auto-reconnect. Database migrations must be backwards-compatible — add nullable columns first, backfill separately. Feature flags to roll out changes gradually. I've done this on AWS ECS and Kubernetes."

---

## Key Takeaways

1. **Show depth**: Don't just name technologies — explain *why* and *trade-offs*
2. **Connect to ComplexChaos**: Frame answers in terms of their product (consensus, stakeholders, AI)
3. **Admit unknowns**: "I haven't used X, but here's how I'd learn it / similar experience"
4. **Be collaborative**: "What constraints should I be aware of?" (shows I'm not assuming)

---

*Prepared by: [Your Name]*  
*Date: December 2024*  
*Context: 60-minute technical interview for ComplexChaos Senior Full-Stack Developer role*
