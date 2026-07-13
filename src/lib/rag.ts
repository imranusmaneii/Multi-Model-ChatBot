import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import pdfParse from "pdf-parse";

let vectorStore: MemoryVectorStore | null = null;

function getEmbeddings(): GoogleGenerativeAIEmbeddings {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY is not set");
  return new GoogleGenerativeAIEmbeddings({
    apiKey: key,
    modelName: "gemini-embedding-001",
  });
}

async function fetchPDFBuffer(): Promise<Buffer> {
  if (typeof window !== "undefined") throw new Error("PDF fetch must run server-side");

  const fs = await import("fs");
  const path = await import("path");
  const pdfPath = path.join(process.cwd(), "public", "1706.03762v7.pdf");

  if (fs.existsSync(pdfPath)) {
    return fs.readFileSync(pdfPath);
  }

  const host = process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "localhost:3000";
  const protocol = process.env.VERCEL ? "https" : "http";
  const pdfUrl = `${protocol}://${host}/1706.03762v7.pdf`;

  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error(`Failed to fetch PDF from ${pdfUrl}: ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

export async function ingestPDF(): Promise<{ chunks: number; pages: number }> {
  const pdfBuffer = await fetchPDFBuffer();
  const pdfData = await pdfParse(pdfBuffer);

  if (!pdfData.text || pdfData.text.trim().length === 0) {
    throw new Error("PDF text extraction returned empty content");
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });

  const docs = [
    new Document({
      pageContent: pdfData.text,
      metadata: { source: "1706.03762v7.pdf", page: 1 },
    }),
  ];

  const splitDocs = await splitter.splitDocuments(docs);

  const enrichedDocs = splitDocs.map((doc, index) => {
    const pageMatch = doc.pageContent.match(/Page (\d+)/i);
    const estimatedPage = pageMatch
      ? parseInt(pageMatch[1])
      : Math.floor(index / 3) + 1;

    return new Document({
      pageContent: doc.pageContent,
      metadata: {
        source: "1706.03762v7.pdf",
        page: estimatedPage,
        chunkIndex: index,
      },
    });
  });

  const embeddings = getEmbeddings();
  vectorStore = await MemoryVectorStore.fromDocuments(enrichedDocs, embeddings);

  return {
    chunks: enrichedDocs.length,
    pages: pdfData.numpages,
  };
}

export function isVectorStoreReady(): boolean {
  return vectorStore !== null;
}

export async function queryPDF(
  question: string,
  topK: number = 5
): Promise<{ answer: string; sources: Array<{ content: string; page: number; score: number }> }> {
  if (!vectorStore) {
    throw new Error("Knowledge base not initialized. Click 'Load Paper' first.");
  }

  const retriever = vectorStore!.asRetriever({
    k: topK,
    searchType: "similarity",
  });

  const relevantDocs = await retriever.invoke(question);

  const context = relevantDocs
    .map((doc, i) => `[Source ${i + 1}] (Page ${doc.metadata.page || "N/A"}):\n${doc.pageContent}`)
    .join("\n\n");

  const systemPrompt = `You are a helpful AI assistant that answers questions based ONLY on the provided context from the research paper "Attention Is All You Need".

IMPORTANT RULES:
1. Answer ONLY based on the provided context. Do not use any outside knowledge.
2. If the answer cannot be found in the context, respond EXACTLY: "I could not find this information in the provided paper."
3. Be precise and accurate. Quote the paper when possible.
4. Provide clear, well-structured answers using markdown formatting.
5. Reference specific sources when possible.
6. When presenting comparisons, metrics, or structured data, ALWAYS use a markdown table with | pipe separators like this exactly:
| Model | BLEU Score | Training Cost |
|-------|-----------|--------------|
| Transformer | 28.4 | Low |
| RNN | 24.6 | High |
Do NOT use tabs to separate columns - always use the | pipe format above.
7. When asked about architecture, diagrams, or how components connect, ALWAYS include a visual flow diagram using this exact format on its own lines:
[Input] -> [Encoder] -> [Decoder] -> [Output]
Use -> arrows between [bracketed components] to show the flow. Put each flow step on its own line. You can show parallel paths on separate lines.
8. When presenting numerical results or comparisons, also include a simple list format like "Model A: value" on separate lines so charts can be generated.`;

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("GROQ_API_KEY is not set");

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Context from the paper:\n${context}\n\nQuestion: ${question}\n\nAnswer:` },
      ],
    }),
  });

  if (!groqRes.ok) {
    const errBody = await groqRes.text();
    throw new Error(`Groq API error ${groqRes.status}: ${errBody}`);
  }

  const groqData = await groqRes.json();
  const answer = groqData.choices[0].message.content;

  const sources = relevantDocs.map((doc) => ({
    content: doc.pageContent.substring(0, 300) + (doc.pageContent.length > 300 ? "..." : ""),
    page: doc.metadata.page || 0,
    score: (doc.metadata as Record<string, unknown>).score as number || 0.8,
  }));

  return { answer, sources };
}
