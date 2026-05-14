"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sessionAPI } from "@/lib/api";
import { useInterviewStore } from "@/store/useInterviewStore";
import type { SessionHistory } from "@/types";
import { Loader2, Calendar, Layout, BarChart, ArrowRight, Clock } from "lucide-react";

export default function HistoryPage() {
  const router = useRouter();
  const userId = useInterviewStore(s => s.userId);
  const [sessions, setSessions] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await sessionAPI.getUserSessions(userId);
        setSessions(res.data);
      } catch (error) {
        console.error("Failed to fetch history", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-zinc-400">Loading your history...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Interview History</h1>
        <p className="text-zinc-400">Review your past mock interviews and track your progress.</p>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-zinc-800 border-dashed">
          <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-zinc-300 mb-2">No interviews yet</h3>
          <p className="text-zinc-500 mb-6">Start your first mock interview to see it here.</p>
          <button 
            onClick={() => router.push("/interview/domain")}
            className="px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-zinc-200"
          >
            Start Now
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <div 
              key={session.id} 
              onClick={() => router.push(`/results/${session.id}`)}
              className="flex items-center justify-between p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-6">
                <div className="hidden sm:flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-zinc-800/50">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">ID</span>
                  <span className="text-lg font-bold text-zinc-300">#{session.id}</span>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2 mb-1">
                    {session.test_type}
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${
                      session.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {session.status}
                    </span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                    {session.domain && (
                      <span className="flex items-center gap-1.5"><Layout className="w-3.5 h-3.5" /> {session.domain}</span>
                    )}
                    <span className="flex items-center gap-1.5"><BarChart className="w-3.5 h-3.5" /> {session.difficulty}</span>
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(session.started_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-blue-600 transition-colors shrink-0">
                <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
