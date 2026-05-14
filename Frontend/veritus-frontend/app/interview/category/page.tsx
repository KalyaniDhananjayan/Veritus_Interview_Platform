"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useInterviewStore } from "@/store/useInterviewStore";
import { Brain, Layers } from "lucide-react";

export default function CategoryPage() {
  const router = useRouter();
  const { setTrack, setDomain } = useInterviewStore();

  const handleGeneral = () => {
    setTrack("GENERAL");
    setDomain(null, "General");
    router.push("/interview/test-type");
  };

  const handleDomain = () => {
    setTrack("DOMAIN");
    router.push("/interview/domain");
  };

  return (
    <div className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold mb-2">Select Assessment Type</h1>
        <p className="text-zinc-400">Choose the type of mock interview you want to take.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleGeneral}
          className="group flex flex-col items-center text-center p-10 rounded-3xl bg-zinc-900/40 border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-900 cursor-pointer transition-all"
        >
          <div className="p-4 rounded-full bg-blue-500/10 mb-6 group-hover:scale-110 transition-transform">
            <Brain className="w-10 h-10 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-zinc-100 mb-3">General Assessment</h3>
          <p className="text-sm text-zinc-400">
            Aptitude, Core CS, and Data Structures & Algorithms. (MCQ Format)
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={handleDomain}
          className="group flex flex-col items-center text-center p-10 rounded-3xl bg-zinc-900/40 border border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-900 cursor-pointer transition-all"
        >
          <div className="p-4 rounded-full bg-purple-500/10 mb-6 group-hover:scale-110 transition-transform">
            <Layers className="w-10 h-10 text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-zinc-100 mb-3">Domain-Specific</h3>
          <p className="text-sm text-zinc-400">
            Technical and HR interviews tailored to specific tech stacks. (AI Evaluated Descriptive)
          </p>
        </motion.div>
      </div>
    </div>
  );
}
