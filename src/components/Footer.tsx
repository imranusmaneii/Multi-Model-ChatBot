"use client";

import { motion } from "framer-motion";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 px-6 py-8">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-2 text-sm text-white/30">
          <div className="h-2 w-2 rounded-full bg-purple-accent" />
          task5 — RAG Chatbot
        </div>
        <motion.a
          href="https://arxiv.org/abs/1706.03762"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.02 }}
          className="text-sm text-white/30 transition-colors hover:text-purple-light"
        >
          Vaswani et al., 2017
        </motion.a>
      </div>
    </footer>
  );
}
