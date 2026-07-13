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
    chunkSize: 1500,
    chunkOverlap: 300,
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
  topK: number = 8
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
1. Answer based on the provided context first. Only say "I could not find this information in the provided paper" if you have thoroughly checked all context and the information is genuinely absent.
2. Be precise and accurate. Quote the paper when possible.
3. Provide clear, well-structured answers using markdown formatting with headings, bullet points, and numbered lists as appropriate.
4. Reference specific sources when possible.
5. When asked about the Transformer architecture (how the model is structured, encoder-decoder layout), include this exact marker on its own line: [DIAGRAM:transformer]. Do NOT use this marker for attention visualization or other diagram requests.
6. When asked about attention visualization, how attention works, or attention heads, include this exact marker on its own line: [VISUALIZATION:attention]
7. When asked about formulas, equations, or mathematical expressions, put the formula on its own line wrapped in triple backticks like this:
\`\`\`
formula here
\`\`\`
Use proper unicode characters for superscripts (√, ², ³, ⁰, ⁻¹, ⁻⁰·⁵) and subscripts where needed. For example: lrate = d_model^−0.5 · min(step_num^−0.5, step_num · warmup_steps^−1.5)
7. When presenting comparisons, metrics, or structured data, ALWAYS use a markdown table with | pipe separators like this exactly:
| Model | BLEU Score | Training Cost |
|-------|-----------|--------------|
| Transformer | 28.4 | Low |
| RNN | 24.6 | High |
Do NOT use tabs to separate columns - always use the | pipe format above.
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

export async function queryPDFStream(
  question: string,
  onToken: (token: string) => void,
  topK: number = 8
): Promise<{ sources: Array<{ content: string; page: number; score: number }> }> {
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
1. Answer based on the provided context first. Only say "I could not find this information in the provided paper" if you have thoroughly checked all context and the information is genuinely absent.
2. Be precise and accurate. Quote the paper when possible.
3. Provide clear, well-structured answers using markdown formatting with headings, bullet points, and numbered lists as appropriate.
4. Reference specific sources when possible.
5. When asked about the Transformer architecture (how the model is structured, encoder-decoder layout), include this exact marker on its own line: [DIAGRAM:transformer]. Do NOT use this marker for attention visualization or other diagram requests.
6. When asked about attention visualization, how attention works, or attention heads, include this exact marker on its own line: [VISUALIZATION:attention]
7. When asked about formulas, equations, or mathematical expressions, put the formula on its own line wrapped in triple backticks like this:
\`\`\`
formula here
\`\`\`
Use proper unicode characters for superscripts (√, ², ³, ⁰, ⁻¹, ⁻⁰·⁵) and subscripts where needed. For example: lrate = d_model^−0.5 · min(step_num^−0.5, step_num · warmup_steps^−1.5)
7. When presenting comparisons, metrics, or structured data, ALWAYS use a markdown table with | pipe separators like this exactly:
| Model | BLEU Score | Training Cost |
|-------|-----------|--------------|
| Transformer | 28.4 | Low |
| RNN | 24.6 | High |
Do NOT use tabs to separate columns - always use the | pipe format above.
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
      stream: true,
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

  const reader = groqRes.body?.getReader();
  if (!reader) throw new Error("No stream available");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") break;

      try {
        const parsed = JSON.parse(data);
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) onToken(token);
      } catch {
        // skip malformed chunks
      }
    }
  }

  const sources = relevantDocs.map((doc) => ({
    content: doc.pageContent.substring(0, 300) + (doc.pageContent.length > 300 ? "..." : ""),
    page: doc.metadata.page || 0,
    score: (doc.metadata as Record<string, unknown>).score as number || 0.8,
  }));

  return { sources };
}
