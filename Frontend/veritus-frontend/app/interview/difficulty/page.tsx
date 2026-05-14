"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useInterviewStore } from "@/store/useInterviewStore";
import { sessionAPI } from "@/lib/api";
import type { Difficulty } from "@/types";
import { Target, TrendingUp, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";

const difficulties: { id: Difficulty; name: string; desc: string; icon: any; color: string }[] = [
  { id: "EASY", name: "Easy", desc: "Basic concepts and definitions", icon: Target, color: "text-green-400" },
  { id: "MEDIUM", name: "Medium", desc: "Standard interview difficulty", icon: TrendingUp, color: "text-blue-400" },
  { id: "HARD", name: "Hard", desc: "Complex problems and deep dives", icon: Zap, color: "text-rose-400" },
];

export default function DifficultyPage() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const { userId, domainId, testType, setDifficulty, setSessionId, reset } = useInterviewStore();

  const handleStart = async (diff: Difficulty) => {
    try {
      setIsStarting(true);
      setDifficulty(diff);

      if (!testType) throw new Error("Test type not selected");

      const res = await sessionAPI.start({
        userId,
        domainId,
        testType,
        difficulty: diff,
      });

      setSessionId(res.data.sessionId);
      toast.success("Session started successfully!");
      router.push("/interview/session");
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Failed to start session");
      setIsStarting(false);
    }
  };

  return (
    <div className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold mb-2">Select Difficulty</h1>
        <p className="text-zinc-400">Choose the challenge level for this interview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {difficulties.map((d, i) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => !isStarting && handleStart(d.id)}
            className={`
              relative flex flex-col items-center text-center p-8 rounded-3xl bg-zinc-900/40 border border-zinc-800 
              hover:border-zinc-600 hover:bg-zinc-900 cursor-pointer transition-all
              ${isStarting ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}
            `}
          >
            <div className={`p-4 rounded-full bg-zinc-800/50 mb-4 ${d.color}`}>
              <d.icon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100 mb-2">{d.name}</h3>
            <p className="text-sm text-zinc-500">{d.desc}</p>
          </motion.div>
        ))}
      </div>

      {isStarting && (
        <div className="mt-12 flex flex-col items-center justify-center text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
          <p>Generating interview environment...</p>
        </div>
      )}
    </div>
  );
}
