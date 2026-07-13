import { NextRequest, NextResponse } from "next/server";
import { queryPDF, isVectorStoreReady, ingestPDF } from "@/lib/rag";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { success: false, error: "Question is required" },
        { status: 400 }
      );
    }

    if (!isVectorStoreReady()) {
      await ingestPDF();
    }

    const result = await queryPDF(question);

    return NextResponse.json({
      success: true,
      answer: result.answer,
      sources: result.sources,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Chat error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
