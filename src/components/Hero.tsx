"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative px-6 py-24 text-center">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-purple-accent/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative"
      >
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          RAG-powered research assistant
        </div>

        <h1 className="mb-6 text-5xl font-bold tracking-tight text-white md:text-7xl">
          Attention Is All
          <br />
          <span className="bg-gradient-to-r from-purple-accent to-purple-light bg-clip-text text-transparent">
            You Need
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-white/50">
          Ask questions about the groundbreaking Transformer paper.
          <br />
          Powered by Retrieval-Augmented Generation and Google Gemini.
        </p>

        <div className="flex flex-wrap justify-center gap-4 text-sm text-white/40">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-purple-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Contextual answers
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-purple-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Source citations
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-purple-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            No hallucinations
          </div>
        </div>
      </motion.div>
    </section>
  );
}
