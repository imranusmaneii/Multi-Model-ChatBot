# Multimodal RAG System — "Attention Is All You Need

A complete Retrieval-Augmented Generation (RAG) system that answers questions about the **"Attention Is All You Need"** research paper (Vaswani et al., 2017). Includes both a **Python multimodal pipeline** (extracts text, tables, figures, and diagrams) and a **deployed Next.js web chatbot**.

---

## What This Project Does

This project builds an AI system that can:

1. **Parse a PDF research paper** — extracts body text, section headings, tables, figures, and diagrams as separate content types
2. **Understand visuals** — uses Groq's Llama 4 Scout vision model to "look at" each figure, diagram, and chart, generating detailed text descriptions of what they show
3. **Embed everything in a shared space** — text chunks, table data, and image descriptions are all embedded together so retrieval works across any modality
4. **Retrieve relevant content** — given a user query, finds the most relevant chunks from text, tables, AND figure descriptions
5. **Generate grounded answers** — uses Groq's Llama 3.3 70B to answer questions strictly from retrieved context, with source citations

### Demo Queries (Tested)

| Query | Modality Targeted | Result |
|-------|------------------|--------|
| "What BLEU score did the Transformer achieve on English-to-German translation?" | **Table** | Retrieved Table 1, answered 28.4 BLEU |
| "Describe the encoder-decoder architecture of the Transformer model." | **Figure** | Retrieved Figure 1, described N=6 layers, encoder/decoder structure |
| "What is multi-head attention and how does it work?" | **Text** | Retrieved Section 3.2, explained with formula and h=8 heads |

---

## Two Components

### 1. Python Multimodal RAG Pipeline (`multimodal_rag/`)

A standalone Python script that implements the full multimodal RAG pipeline end-to-end.

**Tech Stack:**
- `pymupdf` — PDF text extraction + image extraction
- `pdfplumber` — table detection and extraction
- Groq API (`llama-4-scout-17b-16e-instruct`) — vision: describes figures/diagrams
- Groq API (`llama-3.3-70b-versatile`) — generation: grounded answer generation
- `scikit-learn` TF-IDF + FAISS — embeddings and vector search (runs locally, no API needed)

**How to Run:**
```bash
cd multimodal_rag
pip install -r requirements.txt
# Set your Groq API key in .env:
# GROQ_API_KEY=your_key_here
python main.py
```

**Output:**
- `output/images/` — extracted PDF images
- `output/figure_desc_*.txt` — vision-generated descriptions of each figure
- `output/demo_results.json` — full trace: query → retrieved chunks → generated answer

### 2. Next.js Web Chatbot (root directory)

A deployed web interface for chatting with the paper.

**Live:** https://multi-model1.vercel.app/

**Tech Stack:**
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + Framer Motion (dark theme UI)
- Google Gemini (`gemini-embedding-001`) — embeddings
- Groq (`llama-3.3-70b-versatile`) — text generation
- LangChain + pdf-parse + MemoryVectorStore

**How it Works:**
1. Click "Load Paper" — parses the PDF, generates 53 embedding chunks, stores in vector memory
2. Ask a question — retrieves top-5 relevant chunks, sends to Groq for grounded answer
3. View source citations — each answer shows which parts of the paper were used

---

## Project Structure

```
Task5/
├── multimodal_rag/              # Python multimodal RAG pipeline
│   ├── main.py                  # Full pipeline: extract → describe → embed → retrieve → generate
│   ├── requirements.txt         # Python dependencies
│   └── .env                     # Groq API key (not committed)
│
├── src/                         # Next.js web chatbot
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts    # POST /api/chat — query the paper
│   │   │   └── ingest/route.ts  # POST /api/ingest — load the paper
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ChatInterface.tsx    # Chat UI with source citations
│   │   ├── Hero.tsx
│   │   └── Footer.tsx
│   ├── lib/
│   │   ├── rag.ts               # RAG pipeline (embeddings + retrieval + generation)
│   │   └── utils.ts
│   └── types/
│       ├── index.ts
│       └── pdf-parse.d.ts
│
├── public/
│   └── 1706.03762v7.pdf         # "Attention Is All You Need" paper
│
├── .env.example                 # Environment variable template
├── package.json
├── vercel.json
└── README.md
```

---

## Environment Variables

### Python Pipeline (`multimodal_rag/.env`)
| Variable | Description | Source |
|----------|-------------|--------|
| `GROQ_API_KEY` | Groq API key (free) | [console.groq.com](https://console.groq.com) |

### Next.js Chatbot (Vercel / `.env.local`)
| Variable | Description | Source |
|----------|-------------|--------|
| `GOOGLE_API_KEY` | Google AI API key (for embeddings) | [aistudio.google.com](https://aistudio.google.com/apikey) |
| `GROQ_API_KEY` | Groq API key (for text generation) | [console.groq.com](https://console.groq.com) |

---

## Setup

### Python Pipeline
```bash
cd multimodal_rag
pip install -r requirements.txt
echo "GROQ_API_KEY=your_key" > .env
python main.py
```

### Next.js Chatbot
```bash
npm install --legacy-peer-deps
cp .env.example .env.local
# Add your API keys to .env.local
npm run dev
```

### Deploy to Vercel
```bash
git push origin main    # Auto-deploys via GitHub integration
```

---

## How the Multimodal RAG Pipeline Works

```
PDF Paper
    │
    ├──► pymupdf ──► Text chunks + Headings + Embedded images
    ├──► pdfplumber ──► Tables (structured data)
    │
    ▼
┌─────────────────────────────────────┐
│  Content Extraction                 │
│  • 69 text/heading chunks           │
│  • 8 table chunks                   │
│  • 5 figure images extracted        │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  Vision Understanding (Groq)        │
│  Llama 4 Scout looks at each image  │
│  → generates detailed descriptions  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  Shared Embedding Space             │
│  TF-IDF + FAISS                     │
│  82 vectors across all modalities   │
│  (text + tables + figure descs)     │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  User Query                         │
│  → embed query → FAISS top-k        │
│  → retrieve labeled chunks          │
│  → Groq Llama 3.3 70B generates     │
│    grounded answer with sources     │
└─────────────────────────────────────┘
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ingest` | POST | Parses PDF, generates embeddings, stores in memory |
| `/api/chat` | POST | Accepts `{"question": "..."}`, returns `{answer, sources}` |

---

## Key Design Decisions

- **Groq for everything** — Vision (Llama 4 Scout) and generation (Llama 3.3 70B) both run on Groq's free tier. No Google API key needed for the Python pipeline.
- **TF-IDF + FAISS for embeddings** — Runs locally with zero API calls. Fast and free.
- **Pre-extracted figure descriptions** — Groq vision "reads" each figure once and stores the text description, so retrieval works across modalities in a single vector space.
- **Grounded generation only** — The LLM is instructed to answer strictly from retrieved context, not from parametric knowledge.

---

## License

This project uses the "Attention Is All You Need" paper (arXiv:1706.03762) by Vaswani et al. for research/educational purposes.
