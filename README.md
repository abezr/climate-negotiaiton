# ComplexChaos MVP/POC

> **"Google Translate for Human Cooperation"**

AI-facilitated consensus building platform that bridges perspectives and accelerates alignment for groups with conflicting interests.

<div align="center">

📖 [**Architecture Docs**](./ARCHITECTURE.md) · 🎯 [**Presenter Guide**](./PRESENTER_GUIDE.md) · 📊 [**Diagrams**](./diagrams/)

</div>

---

## The Problem

```mermaid
mindmap
  root((Why Current<br/>Tools Fail))
    🎯 Conflicting Priorities
      Departments compete for budget
      No structured resolution
    🌍 Different Backgrounds
      Technical vs Business
      Cultural gaps
      Professional jargon
    ⚖️ Power Imbalances
      Senior voices dominate
      Minority views lost
    📚 Information Overload
      100k+ pages in negotiations
      No time to process
```

---

## Our Solution

```mermaid
flowchart LR
    subgraph Input["📥 Input"]
        A["Diverse<br/>Perspectives"]
    end
    
    subgraph Process["🔄 ComplexChaos Process"]
        B["1️⃣ Collect"]
        C["2️⃣ Cluster"]
        D["3️⃣ Bridge"]
        E["4️⃣ Vote"]
        F["5️⃣ Evaluate"]
    end
    
    subgraph Output["📤 Output"]
        G["✅ Consensus<br/>+ Minority Report"]
    end
    
    A --> B --> C --> D --> E --> F --> G
    
    style Input fill:#ffebee,stroke:#c62828
    style Process fill:#e3f2fd,stroke:#1565c0
    style Output fill:#e8f5e9,stroke:#2e7d32
```

> **Key Insight**: AI doesn't decide who wins — it helps everyone understand *why* others think differently.

---

## Key Results (Bonn Climate Pilot)

<div align="center">

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'pie1': '#4CAF50', 'pie2': '#2196F3', 'pie3': '#FF9800', 'pie4': '#9C27B0'}}}%%
pie showData
    title Impact Metrics
    "⏱️ Time Saved" : 60
    "💡 New Perspectives" : 91
    "❤️ Empathy Increase" : 35
    "👥 Co-presence" : 300
```

</div>

| Metric | Result | What It Means |
|:------:|:------:|---------------|
| ⏱️ | **60%** faster | Coordination time slashed |
| 💡 | **91%** discovered | Perspectives they would've missed |
| ❤️ | **35%** increase | Perceived empathy between delegates |
| 👥 | **3x** stronger | Co-presence even during solo work |

> 🌍 *Tested with delegates from 9 African nations representing 178 million people*

---

## Architecture at a Glance

```mermaid
flowchart TB
    subgraph Users["👥 Users"]
        F["🎯 Facilitator"]
        P["👤 Participants"]
        O["👁️ Observers"]
    end

    subgraph Platform["🏗️ ComplexChaos Platform"]
        subgraph Frontend["Next.js 14 on Vercel"]
            UI["React UI + Real-time"]
        end
        
        subgraph Backend["API Layer"]
            API["API Routes"]
            CE["Consensus Engine"]
            AI["AI Orchestrator"]
        end
    end

    subgraph Data["💾 Data Layer (Supabase)"]
        DB[("PostgreSQL\n+ pgvector")]
        Auth["Auth"]
        RT["Real-time"]
    end

    subgraph External["🤖 AI Services"]
        GPT["OpenAI GPT-4\nSynthesis & Analysis"]
        EMB["Ada-002\nEmbeddings"]
    end

    subgraph Cache["⚡ Cache (Upstash)"]
        Redis[("Redis")]
    end

    F & P & O --> UI
    UI --> API
    UI <--> RT
    API --> CE
    CE --> AI
    API --> Auth
    API --> DB
    AI --> GPT & EMB
    AI --> DB
    API --> Redis

    style Platform fill:#e8f4f8,stroke:#326ce5,stroke-width:2px
    style Data fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style External fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    style Cache fill:#fce4ec,stroke:#e91e63,stroke-width:2px
```

<div align="center">

**💰 Monthly Cost: ~$15** *(OpenAI API only — all infrastructure on free tiers)*

</div>

---

## Key Differentiators

```mermaid
flowchart LR
    subgraph Traditional["🔧 Traditional Tools"]
        direction TB
        T1["Slack, Notion, Docs"]
        T2["😐 Assumes shared goals"]
        T3["📝 Content generation"]
        T4["🔇 Minority voices lost"]
        T5["📊 Single metrics"]
        T1 --- T2 --- T3 --- T4 --- T5
    end
    
    subgraph ComplexChaos["🚀 ComplexChaos"]
        direction TB
        C1["AI-Facilitated Consensus"]
        C2["🤝 Handles conflicting goals"]
        C3["🌉 Understanding facilitation"]
        C4["📢 Explicit dissent tracking"]
        C5["🎯 Multi-dimensional eval"]
        C1 --- C2 --- C3 --- C4 --- C5
    end
    
    Traditional -.->|"Evolution"| ComplexChaos
    
    style Traditional fill:#ffebee,stroke:#c62828
    style ComplexChaos fill:#e8f5e9,stroke:#2e7d32
```

<div align="center">

| | **Collaboration** | **Cooperation** |
|:---:|:---:|:---:|
| **Market** | $50B (Saturated) | 🆕 Greenfield |
| **Players** | Slack, Notion, Miro | **ComplexChaos** |

</div>

---

## Avoiding "Local Maximum" Traps

> ⚠️ **The Risk**: Optimizing single metrics leads to solutions that look good but aren't actually good.

```mermaid
flowchart TB
    subgraph Traps["❌ Common Traps"]
        T1["🏃 Speed over Inclusion<br/><i>Minority voices ignored</i>"]
        T2["🤝 False Consensus<br/><i>Real disagreements hidden</i>"]
        T3["🤖 AI Over-reliance<br/><i>Human agency lost</i>"]
        T4["🔁 Echo Chambers<br/><i>Filter bubbles form</i>"]
    end
    
    subgraph Solutions["✅ Our Mitigations"]
        S1["📊 Perspective Diversity Index"]
        S2["📋 Dissent Tracking + Stability"]
        S3["🎚️ Human Override Rate"]
        S4["🔀 Cross-pollination Prompts"]
    end
    
    T1 --> S1
    T2 --> S2
    T3 --> S3
    T4 --> S4
    
    style Traps fill:#ffebee,stroke:#c62828
    style Solutions fill:#e8f5e9,stroke:#2e7d32
```

---

## Technology Stack

```mermaid
block-beta
    columns 5
    
    block:frontend:1
        columns 1
        f1["🖥️ Frontend"]
        f2["Next.js 14"]
        f3["TypeScript"]
        f4["React"]
    end
    
    block:backend:1
        columns 1
        b1["⚙️ Backend"]
        b2["API Routes"]
        b3["Serverless"]
        b4["LangChain"]
    end
    
    block:database:1
        columns 1
        d1["💾 Database"]
        d2["PostgreSQL"]
        d3["pgvector"]
        d4["Supabase"]
    end
    
    block:ai:1
        columns 1
        a1["🤖 AI"]
        a2["GPT-4 Turbo"]
        a3["Ada-002"]
        a4["Streaming"]
    end
    
    block:infra:1
        columns 1
        i1["☁️ Infra"]
        i2["Vercel"]
        i3["Upstash"]
        i4["Free Tier"]
    end
    
    style frontend fill:#e3f2fd,stroke:#1565c0
    style backend fill:#fff3e0,stroke:#ff9800
    style database fill:#e8f5e9,stroke:#4caf50
    style ai fill:#fce4ec,stroke:#e91e63
    style infra fill:#f3e5f5,stroke:#9c27b0
```

<div align="center">

| 🏷️ | Tech | Why |
|:---:|:---|:---|
| 🖥️ | **Next.js 14** | Job alignment + Vercel free tier |
| 💾 | **Supabase** | 500MB free + pgvector + real-time |
| 🤖 | **GPT-4 Turbo** | Best reasoning + streaming |
| ⚡ | **Upstash Redis** | 10k req/day free |

</div>

---

## Roadmap

```mermaid
timeline
    title Development Phases (42 Days)
    
    section Phase 0
        Days 1-3 : 🏗️ Setup
                 : Project scaffold
                 : Vercel + Supabase
                 : CI/CD pipeline
    
    section Phase 1  
        Days 4-14 : 🔧 Foundation
                  : User auth
                  : Session CRUD
                  : Perspective UI
                  : Real-time presence
    
    section Phase 2
        Days 15-28 : 🤖 AI Engine
                   : Embeddings
                   : Clustering
                   : Synthesis
                   : Voting
                   : Dissent tracking
    
    section Phase 3
        Days 29-38 : ✨ Polish
                   : Eval dashboard
                   : Visualizations
                   : Reports
                   : Onboarding
    
    section Phase 4
        Days 39-42 : 🎯 Demo
                   : E2E testing
                   : Demo prep
                   : 🚀 Launch!
```

---

## Repository Structure

```
📁 webapp/
├── 📄 README.md              ← You are here
├── 📄 ARCHITECTURE.md        ← Full C4 documentation
├── 📄 PRESENTER_GUIDE.md     ← Demo quick reference
└── 📁 diagrams/              ← Mermaid source files
    ├── c4-context.mmd
    ├── c4-container.mmd
    ├── consensus-flow.mmd
    ├── deployment.mmd
    ├── evaluation-metrics.mmd
    └── roadmap.mmd
```

---

## Getting Started

```bash
# Clone repository
git clone <repo-url>
cd complexchaos-mvp

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Add your API keys

# Run development server
npm run dev

# Open http://localhost:3000
```

---

<div align="center">

## Contributing

This is an MVP/POC. See [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details.

---

**License**: Proprietary - ComplexChaos Inc.

---

*Built with the belief that AI can help humans understand each other better, not just faster.* 

🌐 **[complexchaos.ai](https://complexchaos.ai)**

</div>
