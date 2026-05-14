"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Code2, Database, Layout, Smartphone, Cloud, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

const domains = [
  { icon: Layout, label: "Frontend" },
  { icon: Database, label: "Backend" },
  { icon: Code2, label: "Full Stack" },
  { icon: Smartphone, label: "Mobile" },
  { icon: Terminal, label: "Data/AI" },
  { icon: Cloud, label: "DevOps" },
];

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center pt-20 pb-32">
      {/* Hero Section */}
      <section className="w-full max-w-5xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium mb-6 border border-blue-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Now supporting Local LLMs
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
            Master your next <br /> technical interview.
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            AI-Powered Interview Intelligence. Simulate real-world technical and HR interviews, get instant grading, and actionable feedback.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/interview/category">
              <Button size="lg" className="rounded-full bg-white text-black hover:bg-zinc-200 px-8">
                Start Simulation <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/history">
              <Button size="lg" variant="outline" className="rounded-full border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white px-8">
                View History
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Domains Showcase */}
      <section className="w-full max-w-5xl mx-auto px-4 mt-32">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-semibold text-zinc-200">Supported Domains</h2>
          <p className="text-zinc-500 mt-2">Specialized evaluations for every engineering role.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {domains.map((domain, i) => (
            <motion.div
              key={domain.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-900 transition-colors"
            >
              <domain.icon className="w-8 h-8 text-blue-400 mb-3" />
              <span className="text-sm font-medium text-zinc-300">{domain.label}</span>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
