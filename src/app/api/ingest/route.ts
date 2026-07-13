import { NextResponse } from "next/server";
import { ingestPDF } from "@/lib/rag";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST() {
  try {
    const result = await ingestPDF();
    return NextResponse.json({
      success: true,
      message: `Successfully ingested PDF. ${result.chunks} chunks created from ${result.pages} pages.`,
      chunks: result.chunks,
      pages: result.pages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Ingest error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
