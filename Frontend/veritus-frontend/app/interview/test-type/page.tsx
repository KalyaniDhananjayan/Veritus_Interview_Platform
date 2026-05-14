"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useInterviewStore } from "@/store/useInterviewStore";
import type { TestType } from "@/types";
import { Brain, Code, TerminalSquare, Users, Cpu } from "lucide-react";

const allTestTypes = [
  { id: "APTITUDE" as TestType, name: "Aptitude", desc: "Logical reasoning and math", icon: Brain, track: "GENERAL" },
  { id: "CORE_CS" as TestType, name: "Core CS", desc: "OS, Networks, DBMS", icon: Cpu, track: "GENERAL" },
  { id: "CODING_DSA" as TestType, name: "Coding / DSA", desc: "Algorithms and Data Structures", icon: Code, track: "GENERAL" },
  { id: "TECHNICAL" as TestType, name: "Domain Technical", desc: "Specific to your chosen domain", icon: TerminalSquare, track: "DOMAIN" },
  { id: "HR" as TestType, name: "HR / Behavioral", desc: "Culture fit and behavioral", icon: Users, track: "DOMAIN" },
];

export default function TestTypePage() {
  const router = useRouter();
  const { track, domainName, setTestType, setDomain } = useInterviewStore();

  useEffect(() => {
    if (!track) {
      router.replace("/interview/category");
    }
  }, [track, router]);

  const displayedTypes = allTestTypes.filter(t => t.track === track);

  const handleSelect = (type: typeof allTestTypes[0]) => {
    setTestType(type.id);
    if (track === "GENERAL") {
      setDomain(null, "General");
    }
    router.push("/interview/difficulty");
  };

  if (!track) return null;

  return (
    <div className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Select Test Type</h1>
        {track === "DOMAIN" ? (
          <p className="text-zinc-400">
            Evaluating for Domain: <span className="text-blue-400 font-medium">{domainName}</span>
          </p>
        ) : (
          <p className="text-zinc-400">General Assessment (Language/Domain Agnostic)</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedTypes.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => handleSelect(t)}
            className="group flex items-start gap-4 p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-900 cursor-pointer transition-all"
          >
            <div className="p-3 rounded-xl bg-zinc-800 group-hover:bg-purple-500/20 transition-colors">
              <t.icon className="w-6 h-6 text-zinc-300 group-hover:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">{t.name}</h3>
              <p className="text-sm text-zinc-500 mt-1">{t.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
