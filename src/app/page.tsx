import Hero from "@/components/Hero";
import ChatInterface from "@/components/ChatInterface";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <Hero />
      <section className="mx-auto w-full max-w-4xl flex-1 px-6 pb-16">
        <ChatInterface />
      </section>
      <Footer />
    </main>
  );
}
