"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage, SourceChunk } from "@/types";
import { generateId, formatTimestamp } from "@/lib/utils";
import BotAvatar from "./BotAvatar";
import MessageContent from "./MessageContent";

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isIngested, setIsIngested] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<SourceChunk[] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const handleIngest = async () => {
    setIsIngesting(true);
    setError(null);
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setIsIngested(true);
      } else {
        setError(data.error || "Failed to ingest PDF");
      }
    } catch {
      setError("Failed to connect to server");
    }
    setIsIngesting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !isIngested) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMessage.content }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        setError(data.error || "Failed to get response");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Request timed out. Please try a shorter question.");
      } else {
        setError("Failed to connect to server. Please try again.");
      }
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex h-[700px] flex-col rounded-2xl border border-white/10 bg-dark-800/50 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <BotAvatar size={26} />
          <span className="text-sm font-medium text-white/80">Research Assistant</span>
        </div>
        {!isIngested && (
          <button
            onClick={handleIngest}
            disabled={isIngesting}
            className="rounded-lg bg-purple-accent px-4 py-2 text-sm font-medium text-white transition-all hover:bg-purple-light disabled:opacity-50"
          >
            {isIngesting ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </span>
            ) : (
              "Load Paper"
            )}
          </button>
        )}
        {isIngested && (
          <span className="flex items-center gap-2 text-xs text-green-400">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            Paper loaded
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 && !isIngested && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-6 rounded-2xl bg-purple-accent/10 p-4">
              <svg className="h-12 w-12 text-purple-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">Attention Is All You Need</h3>
            <p className="mb-6 max-w-md text-sm text-white/50">
              Click &quot;Load Paper&quot; to process the Transformer research paper and start asking questions.
            </p>
          </div>
        )}

        {messages.length === 0 && isIngested && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-6 rounded-2xl bg-purple-accent/10 p-4">
              <svg className="h-12 w-12 text-purple-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">Ready to chat</h3>
            <p className="mb-6 max-w-md text-sm text-white/50">
              Ask me anything about the &quot;Attention Is All You Need&quot; paper.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "What is the Transformer architecture?",
                "How does self-attention work?",
                "What are the main results?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/60 transition-all hover:border-purple-accent/50 hover:text-white/80"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`mb-4 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="mr-2 mt-1">
                  <BotAvatar size={30} />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                  message.role === "user"
                    ? "bg-purple-accent text-white"
                    : "bg-dark-600 text-white/90"
                }`}
              >
                {message.role === "assistant" ? (
                  <MessageContent content={message.content} />
                ) : (
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
                )}
                {message.sources && message.sources.length > 0 && (
                  <button
                    onClick={() =>
                      setSelectedSource(
                        selectedSource === message.sources ? null : message.sources!
                      )
                    }
                    className="mt-3 flex items-center gap-1 text-xs text-purple-light/70 hover:text-purple-light"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {message.sources.length} source{message.sources.length > 1 ? "s" : ""} used
                  </button>
                )}
                <div className="mt-1 text-[10px] text-white/30">{formatTimestamp(message.timestamp)}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="mr-2 mt-1">
              <BotAvatar size={30} animate />
            </div>
            <div className="rounded-2xl bg-dark-600 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-purple-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-purple-accent animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-white/10 p-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isIngested ? "Ask about the paper..." : "Load the paper first..."}
            disabled={!isIngested || isLoading}
            rows={1}
            className="max-h-24 flex-1 resize-none overflow-y-auto rounded-xl border border-white/10 bg-dark-700 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-purple-accent/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !isIngested}
            className="rounded-xl bg-purple-accent px-5 py-3 text-sm font-medium text-white transition-all hover:bg-purple-light disabled:opacity-30"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ transform: "rotate(90deg)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>

      <AnimatePresence>
        {selectedSource && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/10 bg-dark-900/80"
          >
            <div className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-white/60">Retrieved Sources</span>
                <button onClick={() => setSelectedSource(null)} className="text-xs text-white/40 hover:text-white/60">
                  Close
                </button>
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {selectedSource.map((source, i) => (
                  <div key={i} className="rounded-lg border border-white/5 bg-dark-700/50 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] text-purple-light/70">Page {source.page}</span>
                      <span className="text-[10px] text-white/30">Score: {(source.score * 100).toFixed(1)}%</span>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed">{source.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
