"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useInterviewStore } from "@/store/useInterviewStore";
import { Layout, Database, Code2, Smartphone, Terminal, Cloud, Layers, ChevronDown } from "lucide-react";

// Mapped exactly to DB IDs
const domainCategories = [
  {
    name: "Frontend",
    icon: Layout,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    subdomains: [
      { id: 1, name: "React" }, { id: 2, name: "Vue" }, { id: 3, name: "Angular" },
      { id: 4, name: "Next.js" }, { id: 5, name: "Svelte" }
    ]
  },
  {
    name: "Backend",
    icon: Database,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    subdomains: [
      { id: 6, name: "Node.js" }, { id: 7, name: "Python" }, { id: 8, name: "Java" },
      { id: 9, name: "PHP" }, { id: 10, name: "Go" }, { id: 11, name: ".NET" }, { id: 12, name: "Ruby" }
    ]
  },
  {
    name: "Full Stack",
    icon: Code2,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    subdomains: [
      { id: 13, name: "MERN" }, { id: 14, name: "MEAN" }, { id: 15, name: "MEVN" },
      { id: 16, name: "T3" }, { id: 17, name: "Python Full Stack" }, { id: 18, name: "Java Full Stack" }
    ]
  },
  {
    name: "Mobile",
    icon: Smartphone,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    subdomains: [
      { id: 19, name: "React Native" }, { id: 20, name: "Flutter" },
      { id: 21, name: "iOS" }, { id: 22, name: "Android" }
    ]
  },
  {
    name: "Data / AI",
    icon: Terminal,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    subdomains: [
      { id: 23, name: "Machine Learning" }, { id: 24, name: "Data Engineering" },
      { id: 25, name: "NLP" }, { id: 26, name: "Computer Vision" }, { id: 27, name: "LLM" }
    ]
  },
  {
    name: "DevOps",
    icon: Cloud,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    subdomains: [
      { id: 28, name: "AWS" }, { id: 29, name: "Azure" }, { id: 30, name: "GCP" },
      { id: 31, name: "Docker/K8s" }, { id: 32, name: "CI/CD" }
    ]
  },
  {
    name: "Other Domains",
    icon: Layers,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    subdomains: [
      { id: 33, name: "Blockchain" }, { id: 34, name: "Game Development" },
      { id: 35, name: "QA" }, { id: 36, name: "Security" }, { id: 37, name: "Databases" }
    ]
  }
];

export default function DomainSelectionPage() {
  const router = useRouter();
  const setDomain = useInterviewStore((state) => state.setDomain);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const handleSelect = (id: number, name: string) => {
    setDomain(id, name);
    router.push("/interview/test-type");
  };

  return (
    <div className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Select Domain Stack</h1>
        <p className="text-zinc-400">Choose your specific technology stack for the interview.</p>
      </div>

      <div className="flex flex-col gap-4">
        {domainCategories.map((category, idx) => {
          const isExpanded = expandedIndex === idx;

          return (
            <div key={category.name} className="flex flex-col rounded-2xl bg-zinc-900/40 border border-zinc-800 overflow-hidden">
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                className="w-full flex items-center justify-between p-6 hover:bg-zinc-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${category.bg} ${category.border} border`}>
                    <category.icon className={`w-6 h-6 ${category.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-zinc-100">{category.name}</h3>
                </div>
                <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {category.subdomains.map((sub) => (
                        <div
                          key={sub.id}
                          onClick={() => handleSelect(sub.id, sub.name)}
                          className="px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-500 hover:bg-zinc-800 cursor-pointer transition-all text-center group"
                        >
                          <span className="text-sm font-medium text-zinc-300 group-hover:text-white">{sub.name}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
