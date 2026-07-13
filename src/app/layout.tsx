import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "task5 — RAG Chatbot",
  description: "AI chatbot for the Attention Is All You Need research paper, powered by RAG and Google Gemini.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-dark-900 antialiased">
        {children}
      </body>
    </html>
  );
}
