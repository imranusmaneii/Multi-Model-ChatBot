import { NextRequest } from "next/server";
import { queryPDFStream, isVectorStoreReady, ingestPDF } from "@/lib/rag";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Question is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!isVectorStoreReady()) {
      await ingestPDF();
    }

    const encoder = new TextEncoder();
    let fullAnswer = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const { sources } = await queryPDFStream(question, (token) => {
            fullAnswer += token;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
          });

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, sources })}\n\n`)
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
          );
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Chat error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
