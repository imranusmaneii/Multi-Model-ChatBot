# task5 — RAG Chatbot

A production-ready AI chatbot that answers questions about the **"Attention Is All You Need"** research paper using Retrieval-Augmented Generation (RAG). Built with Next.js, LangChain, and Google Gemini.

## Features

- **RAG Pipeline** — PDF parsing, text chunking, embedding generation, and vector storage
- **Google Gemini** — Powered by Gemini 2.0 Flash for intelligent, context-aware responses
- **Source Citations** — Every answer references specific sections of the paper
- **No Hallucination** — Responds with "I could not find this information" when context is insufficient
- **Dark Theme UI** — Clean, modern interface inspired by OpenAI, Vercel, and Linear
- **Responsive Design** — Works on desktop, tablet, and mobile
- **Chat History** — Full conversation history with smooth animations

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **AI:** Google Gemini API
- **RAG:** LangChain
- **PDF Parser:** pdf-parse
- **Vector Store:** Memory Vector Store (Vercel-compatible)

## Folder Structure

```
task5/
├── public/
│   └── 1706.03762v7.pdf       # The research paper
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts   # Chat endpoint
│   │   │   └── ingest/route.ts # PDF ingestion endpoint
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── components/
│   │   ├── ChatInterface.tsx   # Main chat component
│   │   ├── Hero.tsx            # Hero section
│   │   └── Footer.tsx          # Footer component
│   ├── lib/
│   │   ├── rag.ts              # RAG pipeline logic
│   │   └── utils.ts            # Utility functions
│   └── types/
│       ├── index.ts            # TypeScript interfaces
│       └── pdf-parse.d.ts      # pdf-parse type declarations
├── .env.example                # Environment variable template
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/task5.git
cd task5
```

2. Install dependencies:

```bash
npm install --legacy-peer-deps
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

4. Add your Google API key to `.env.local`:

```
GOOGLE_API_KEY=your_google_api_key_here
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_API_KEY` | Google AI (Gemini) API key | Yes |

Get your API key at [Google AI Studio](https://aistudio.google.com/apikey).

## Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

1. Push the repository to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add the `GOOGLE_API_KEY` environment variable
4. Deploy

```bash
# Or deploy via CLI
npx vercel
```

## How the RAG Pipeline Works

1. **PDF Ingestion** (`/api/ingest`)
   - Reads the PDF file from `/public`
   - Extracts all text content
   - Splits text into ~1000-character chunks with 200-character overlap
   - Generates embeddings using Google's `embedding-001` model
   - Stores embeddings in a Memory Vector Store

2. **Question Answering** (`/api/chat`)
   - Receives user question
   - Generates embedding for the question
   - Retrieves the top-5 most relevant chunks via similarity search
   - Sends the retrieved context + question to Gemini 2.0 Flash
   - Returns the answer along with source citations

3. **Response**
   - Answers are grounded strictly in the paper's content
   - Source chunks include page references and relevance scores
   - If the answer is not in the paper, the bot responds accordingly
