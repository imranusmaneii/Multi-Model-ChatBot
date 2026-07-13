"""
Multimodal RAG System for 'Attention Is All You Need'
Uses: pymupdf (text+images), pdfplumber (tables), Groq (vision+generation), FAISS+TF-IDF (embeddings)
"""

import os
import io
import sys
import base64
import json

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

import fitz  # pymupdf
import pdfplumber
import faiss
import numpy as np
from dotenv import load_dotenv
from groq import Groq
from sklearn.feature_extraction.text import TfidfVectorizer

load_dotenv()

OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)
IMAGES_DIR = OUTPUT_DIR / "images"
IMAGES_DIR.mkdir(exist_ok=True)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY not found. Set it in .env or environment.")

PDF_PATH = Path(__file__).parent.parent / "public" / "1706.03762v7.pdf"
if not PDF_PATH.exists():
    PDF_PATH = Path(__file__).parent.parent / "1706.03762v7.pdf"

EMBEDDING_MODEL_NAME = "tfidf"
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
GENERATION_MODEL = "llama-3.3-70b-versatile"
CHUNK_SIZE = 800
CHUNK_OVERLAP = 150
TOP_K = 5


@dataclass
class ContentChunk:
    content: str
    modality: str  # "text", "heading", "table", "figure"
    page: int
    source_label: str
    image_path: Optional[str] = None


# ─── Step 1: Extract content from PDF ───────────────────────────────────────


def extract_text_chunks(pdf_path: Path) -> list[ContentChunk]:
    doc = fitz.open(str(pdf_path))
    chunks = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        blocks = page.get_text("dict")["blocks"]

        page_headings = []
        page_body = []

        for block in blocks:
            if block["type"] != 0:
                continue
            for line in block["lines"]:
                text = "".join(span["text"] for span in line["spans"]).strip()
                if not text:
                    continue
                max_font_size = max(span["size"] for span in line["spans"])
                is_bold = any("bold" in span["font"].lower() for span in line["spans"])

                if max_font_size >= 14 or (is_bold and max_font_size >= 11):
                    page_headings.append(text)
                else:
                    page_body.append(text)

        if page_headings:
            for h in page_headings:
                chunks.append(ContentChunk(
                    content=h, modality="heading", page=page_num + 1,
                    source_label=f"[HEADING p.{page_num + 1}]"
                ))

        full_body = " ".join(page_body)
        for i in range(0, len(full_body), CHUNK_SIZE - CHUNK_OVERLAP):
            segment = full_body[i:i + CHUNK_SIZE].strip()
            if len(segment) > 50:
                chunks.append(ContentChunk(
                    content=segment, modality="text", page=page_num + 1,
                    source_label=f"[TEXT p.{page_num + 1}]"
                ))

    doc.close()
    return chunks


def extract_tables(pdf_path: Path) -> list[ContentChunk]:
    chunks = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_num, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            for t_idx, table in enumerate(tables):
                if not table or len(table) < 2:
                    continue

                header = table[0]
                header_text = " | ".join(str(c) if c else "" for c in header)
                rows_text = []
                for row in table[1:]:
                    row_str = " | ".join(str(c) if c else "" for c in row)
                    rows_text.append(row_str)

                table_str = f"Table (page {page_num + 1}):\nHeaders: {header_text}\n" + "\n".join(rows_text)
                chunks.append(ContentChunk(
                    content=table_str, modality="table", page=page_num + 1,
                    source_label=f"[TABLE p.{page_num + 1}]"
                ))
    return chunks


def extract_images(pdf_path: Path) -> list[ContentChunk]:
    doc = fitz.open(str(pdf_path))
    chunks = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        image_list = page.get_images(full=True)

        for img_idx, img_info in enumerate(image_list):
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                ext = base_image["ext"]

                if len(image_bytes) < 2000:
                    continue

                img_path = IMAGES_DIR / f"page{page_num + 1}_img{img_idx + 1}.{ext}"
                img_path.write_bytes(image_bytes)

                chunks.append(ContentChunk(
                    content=f"[Image extracted from page {page_num + 1}, image {img_idx + 1}]",
                    modality="figure", page=page_num + 1,
                    source_label=f"[FIGURE p.{page_num + 1}]",
                    image_path=str(img_path)
                ))
            except Exception:
                continue

    doc.close()
    return chunks


def render_full_page_as_image(pdf_path: Path, page_num: int) -> Optional[str]:
    doc = fitz.open(str(pdf_path))
    if page_num >= len(doc):
        doc.close()
        return None

    page = doc[page_num]
    pix = page.get_pixmap(dpi=150)
    img_path = IMAGES_DIR / f"page{page_num + 1}_full.png"
    pix.save(str(img_path))
    doc.close()
    return str(img_path)


def extract_page_render_images(pdf_path: Path, figure_pages: list[int]) -> list[ContentChunk]:
    chunks = []
    for p in figure_pages:
        img_path = render_full_page_as_image(pdf_path, p - 1)
        if img_path:
            chunks.append(ContentChunk(
                content=f"[Full page render of page {p}]",
                modality="figure", page=p,
                source_label=f"[FIGURE p.{p}]",
                image_path=img_path
            ))
    return chunks


# ─── Step 2: Vision — describe images via Groq ──────────────────────────────


def describe_image_base64(client: Groq, image_path: str, context: str = "") -> str:
    with open(image_path, "rb") as f:
        img_bytes = f.read()

    if len(img_bytes) > 4 * 1024 * 1024:
        from PIL import Image as PILImage
        img = PILImage.open(io.BytesIO(img_bytes))
        img.thumbnail((1024, 1024))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=80)
        img_bytes = buf.getvalue()

    b64 = base64.b64encode(img_bytes).decode("utf-8")
    mime = "image/png" if image_path.endswith(".png") else "image/jpeg"

    prompt = (
        f"You are analyzing a figure from the research paper 'Attention Is All You Need' (Vaswani et al., 2017). "
        f"{context}\n"
        "Provide a detailed, accurate description of what this figure/table/chart shows. "
        "Describe the architecture, labels, axes, data points, and any key insights visible. "
        "Be specific about numbers, model names, and technical details."
    )

    try:
        response = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}
                ]
            }],
            temperature=0.2,
            max_tokens=1024,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"[Vision description failed: {e}]"


def generate_text_descriptions(client: Groq, figure_chunks: list[ContentChunk]) -> list[ContentChunk]:
    described = []
    for chunk in figure_chunks:
        if chunk.image_path and os.path.exists(chunk.image_path):
            page = chunk.page
            desc = describe_image_base64(
                client, chunk.image_path,
                context=f"This is from page {page} of the paper."
            )
            described.append(ContentChunk(
                content=desc, modality="figure", page=page,
                source_label=f"[FIGURE DESC p.{page}]",
                image_path=chunk.image_path
            ))
    return described


# ─── Step 3: Embeddings + FAISS Vector Store ─────────────────────────────────


class VectorStore:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            max_features=8192,
            ngram_range=(1, 2),
            sublinear_tf=True,
            stop_words="english"
        )
        self.chunks: list[ContentChunk] = []
        self.index: Optional[faiss.IndexFlatIP] = None
        self.embeddings: Optional[np.ndarray] = None

    def add_chunks(self, chunks: list[ContentChunk]):
        self.chunks.extend(chunks)
        texts = [c.content for c in self.chunks]
        tfidf_matrix = self.vectorizer.fit_transform(texts)
        self.embeddings = tfidf_matrix.toarray().astype("float32")
        faiss.normalize_L2(self.embeddings)
        dim = self.embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dim)
        self.index.add(self.embeddings)

    def search(self, query: str, top_k: int = TOP_K) -> list[tuple[ContentChunk, float]]:
        q_tfidf = self.vectorizer.transform([query]).toarray().astype("float32")
        faiss.normalize_L2(q_tfidf)
        scores, indices = self.index.search(q_tfidf, top_k)
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < len(self.chunks):
                results.append((self.chunks[idx], float(score)))
        return results


# ─── Step 4: Grounded Generation via Groq ────────────────────────────────────


def generate_answer(client: Groq, query: str, context_chunks: list[tuple[ContentChunk, float]]) -> str:
    context_parts = []
    for chunk, score in context_chunks:
        modality_tag = chunk.modality.upper()
        context_parts.append(
            f"--- {modality_tag} (page {chunk.page}, relevance: {score:.3f}) ---\n{chunk.content}"
        )
    context = "\n\n".join(context_parts)

    system_prompt = (
        "You are a helpful AI assistant that answers questions strictly based on the provided context "
        "from the research paper 'Attention Is All You Need' (Vaswani et al., 2017).\n\n"
        "RULES:\n"
        "1. Answer ONLY using the provided context. Do not use outside knowledge.\n"
        "2. If the answer cannot be found in the context, say: 'I could not find this information in the provided paper.'\n"
        "3. Be precise. Reference specific sources when possible.\n"
        "4. When figures or tables are referenced, describe what they show based on the provided descriptions."
    )

    user_prompt = f"Context from the paper:\n{context}\n\nQuestion: {query}\n\nAnswer:"

    try:
        response = client.chat.completions.create(
            model=GENERATION_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,
            max_tokens=2048,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"[Generation failed: {e}]"


# ─── Step 5: Demo Queries ────────────────────────────────────────────────────


DEMO_QUERIES = [
    {
        "query": "What BLEU score did the Transformer achieve on English-to-German translation?",
        "expected_modality": "table",
        "description": "Table query — should retrieve Table 1 with BLEU scores"
    },
    {
        "query": "Describe the encoder-decoder architecture of the Transformer model.",
        "expected_modality": "figure",
        "description": "Figure query — should retrieve Figure 1 architecture diagram"
    },
    {
        "query": "What is multi-head attention and how does it work?",
        "expected_modality": "text",
        "description": "Text query — should retrieve body text describing multi-head attention"
    },
]


def run_demo(client: Groq, vector_store: VectorStore):
    print("\n" + "=" * 80)
    print("MULTIMODAL RAG DEMONSTRATION")
    print("=" * 80)

    results_log = []

    for i, demo in enumerate(DEMO_QUERIES, 1):
        query = demo["query"]
        print(f"\n{'─' * 80}")
        print(f"Query {i}: {query}")
        print(f"Expected modality: {demo['expected_modality']} — {demo['description']}")
        print(f"{'─' * 80}")

        retrieved = vector_store.search(query, top_k=TOP_K)
        print(f"\nRetrieved {len(retrieved)} chunks:")
        for j, (chunk, score) in enumerate(retrieved, 1):
            content_preview = chunk.content[:150].replace("\n", " ")
            print(f"  {j}. [{chunk.modality.upper()}] page {chunk.page} (score: {score:.4f})")
            print(f"     {content_preview}...")

        print(f"\nGenerating answer...")
        answer = generate_answer(client, query, retrieved)
        print(f"\nAnswer:\n{answer}")

        results_log.append({
            "query": query,
            "expected_modality": demo["expected_modality"],
            "retrieved_chunks": [
                {
                    "modality": c.modality,
                    "page": c.page,
                    "score": s,
                    "content_preview": c.content[:300]
                }
                for c, s in retrieved
            ],
            "answer": answer
        })

    log_path = OUTPUT_DIR / "demo_results.json"
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(results_log, f, indent=2, ensure_ascii=False)
    print(f"\nResults saved to {log_path}")

    return results_log


# ─── Main Orchestrator ───────────────────────────────────────────────────────


def main():
    print("=" * 80)
    print("MULTIMODAL RAG SYSTEM — 'Attention Is All You Need'")
    print("=" * 80)

    print(f"\nPDF: {PDF_PATH}")
    print(f"Groq Vision Model: {VISION_MODEL}")
    print(f"Groq Generation Model: {GENERATION_MODEL}")
    print(f"Embedding Model: {EMBEDDING_MODEL_NAME}")

    client = Groq(api_key=GROQ_API_KEY)

    # Step 1: Extract content
    print("\n[1/5] Extracting text chunks...")
    text_chunks = extract_text_chunks(PDF_PATH)
    print(f"  -> {len(text_chunks)} text/heading chunks")

    print("[2/5] Extracting tables...")
    table_chunks = extract_tables(PDF_PATH)
    print(f"  -> {len(table_chunks)} table chunks")

    print("[3/5] Extracting images...")
    image_chunks = extract_images(PDF_PATH)
    print(f"  -> {len(image_chunks)} raw images extracted")

    figure_pages = list(set(c.page for c in image_chunks))
    print(f"  -> Figures found on pages: {sorted(figure_pages)}")

    # Also render key full pages (pages with large figures)
    full_page_chunks = extract_page_render_images(PDF_PATH, figure_pages)
    print(f"  -> {len(full_page_chunks)} full page renders")

    all_visual_chunks = image_chunks + full_page_chunks

    # Step 2: Describe images via vision
    print(f"\n[4/5] Describing {len(all_visual_chunks)} visual elements via Groq vision...")
    figure_desc_chunks = generate_text_descriptions(client, all_visual_chunks)
    print(f"  -> {len(figure_desc_chunks)} figure descriptions generated")

    # Save descriptions for inspection
    for i, chunk in enumerate(figure_desc_chunks):
        desc_path = OUTPUT_DIR / f"figure_desc_page{chunk.page}_{i}.txt"
        desc_path.write_text(chunk.content, encoding="utf-8")

    # Step 3: Build vector store
    print("\n[5/5] Building embeddings + FAISS vector store...")
    all_chunks = text_chunks + table_chunks + figure_desc_chunks
    print(f"  -> Total chunks: {len(all_chunks)}")
    print(f"     Text: {sum(1 for c in all_chunks if c.modality == 'text')}")
    print(f"     Headings: {sum(1 for c in all_chunks if c.modality == 'heading')}")
    print(f"     Tables: {sum(1 for c in all_chunks if c.modality == 'table')}")
    print(f"     Figures: {sum(1 for c in all_chunks if c.modality == 'figure')}")

    vector_store = VectorStore()
    vector_store.add_chunks(all_chunks)
    print(f"  -> FAISS index built ({vector_store.index.ntotal} vectors, dim={vector_store.embeddings.shape[1]})")

    # Step 4: Run demo
    results = run_demo(client, vector_store)

    print("\n" + "=" * 80)
    print("PIPELINE COMPLETE: Extract → Describe → Embed → Retrieve → Generate")
    print("=" * 80)
    print(f"\nOutputs in: {OUTPUT_DIR}")
    print(f"  - images/        : Extracted PDF images")
    print(f"  - figure_desc_*  : Vision-generated descriptions")
    print(f"  - demo_results.json : Full query→retrieval→answer trace")


if __name__ == "__main__":
    main()
