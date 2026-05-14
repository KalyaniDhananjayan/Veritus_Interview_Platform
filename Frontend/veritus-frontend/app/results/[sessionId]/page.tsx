"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { sessionAPI } from "@/lib/api";
import type { SessionResult, ResponseItem } from "@/types";
import { Loader2, ArrowLeft, Target, Award, BrainCircuit, CheckCircle, XCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function ResultsPage() {
  const { sessionId } = useParams();
  const router = useRouter();
  const [result, setResult] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) fetchResult();
  }, [sessionId]);

  const fetchResult = async () => {
    try {
      const res = await sessionAPI.getResult(Number(sessionId));
      setResult(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-zinc-400">Analyzing interview performance...</p>
      </div>
    );
  }

  // Calculate some basic stats
  const mcqCount = result.responses.filter(r => r.questionFormat === 'MCQ').length;
  const descCount = result.responses.filter(r => r.questionFormat === 'DESCRIPTIVE').length;
  const correctMCQ = result.responses.filter(r => r.questionFormat === 'MCQ' && r.isCorrect).length;

  return (
    <div className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <Button variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => router.push("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
        <div className="flex items-center gap-2">
          {result.status === 'COMPLETED' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">
              <CheckCircle className="w-3.5 h-3.5" /> Completed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-medium border border-yellow-500/20">
              <Clock className="w-3.5 h-3.5" /> Incomplete
            </span>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <MetricCard
          title="Overall Score"
          value={`${result.percentage}%`}
          subtitle={`${result.totalScore} / ${result.totalPossibleScore} pts`}
          icon={Award}
          color="text-blue-400"
          bg="bg-blue-500/10"
        />
        <MetricCard
          title="Average Rating"
          value={result.averageScore !== null ? `${result.averageScore}/10` : 'N/A'}
          subtitle="per question"
          icon={Target}
          color="text-purple-400"
          bg="bg-purple-500/10"
        />
        <MetricCard
          title="Questions Answered"
          value={`${result.answered}/${result.totalQuestions}`}
          subtitle={`${result.unanswered} unanswered`}
          icon={CheckCircle}
          color="text-green-400"
          bg="bg-green-500/10"
        />
        <MetricCard
          title="AI Evaluated"
          value={descCount.toString()}
          subtitle={result.pendingEvaluations > 0 ? `${result.pendingEvaluations} pending` : 'All evaluations complete'}
          icon={BrainCircuit}
          color="text-amber-400"
          bg="bg-amber-500/10"
        />
      </div>

      <h2 className="text-2xl font-bold mb-6 text-zinc-100">Detailed Review</h2>

      <div className="space-y-6">
        {result.responses.map((r, i) => (
          <ResponseCard key={i} response={r} index={i} />
        ))}
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, color, bg }: any) {
  return (
    <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col relative overflow-hidden group hover:border-zinc-700 transition-colors">
      <div className={`absolute top-0 right-0 p-6 opacity-20 ${color} group-hover:scale-110 transition-transform`}>
        <Icon className="w-16 h-16" />
      </div>
      <h3 className="text-zinc-400 font-medium mb-2 relative z-10">{title}</h3>
      <div className="text-3xl font-bold text-white mb-1 relative z-10">{value}</div>
      <p className="text-xs text-zinc-500 relative z-10">{subtitle}</p>
    </div>
  );
}

function ResponseCard({ response, index }: { response: ResponseItem, index: number }) {
  const isMCQ = response.questionFormat === 'MCQ';
  const pending = response.evaluationStatus === 'PENDING';
  const failed = response.evaluationStatus === 'FAILED';

  let statusColor = "bg-zinc-800 text-zinc-300";
  let statusText = "Score: " + (response.score !== null ? response.score : '-');

  if (isMCQ) {
    if (response.isCorrect) {
      statusColor = "bg-green-500/20 text-green-400 border border-green-500/20";
      statusText = "Correct (10/10)";
    } else {
      statusColor = "bg-rose-500/20 text-rose-400 border border-rose-500/20";
      statusText = "Incorrect (0/10)";
    }
  } else {
    if (pending) {
      statusColor = "bg-blue-500/20 text-blue-400 border border-blue-500/20";
      statusText = "Evaluation Pending";
    } else if (failed) {
      statusColor = "bg-rose-500/20 text-rose-400 border border-rose-500/20";
      statusText = "Evaluation Failed";
    } else {
      statusColor = "bg-purple-500/20 text-purple-400 border border-purple-500/20";
      statusText = `AI Score: ${response.score}/10`;
    }
  }

  return (
    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
      <div className="flex items-start justify-between mb-4">
        <h4 className="text-lg font-medium text-zinc-200">
          <span className="text-zinc-500 mr-2">Q{index + 1}.</span> {response.questionText}
        </h4>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColor}`}>
          {statusText}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
          <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">Your Answer</span>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{response.yourAnswer || <span className="text-zinc-600 italic">No answer provided</span>}</p>
        </div>
        
        {isMCQ && (
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
            <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">Correct Answer</span>
            <p className="text-sm text-zinc-300">{response.correctAnswer}</p>
          </div>
        )}
      </div>

      {!isMCQ && response.feedback && (
        <div className="mt-4 bg-purple-500/5 border border-purple-500/20 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <BrainCircuit className="w-4 h-4 text-purple-400" />
            <span className="text-xs uppercase tracking-wider text-purple-400 font-semibold">AI Feedback</span>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">{response.feedback}</p>
        </div>
      )}
    </div>
  );
}
