"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useInterviewStore } from "@/store/useInterviewStore";
import { sessionAPI } from "@/lib/api";
import type { Question } from "@/types";
import { Loader2, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function SessionPage() {
  const router = useRouter();
  const { sessionId, currentQuestionIndex, setCurrentQuestionIndex, totalQuestions, setTotalQuestions } = useInterviewStore();

  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEndModal, setShowEndModal] = useState(false);

  // Timer logic
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    if (showEndModal) clearInterval(timer);
    return () => clearInterval(timer);
  }, [showEndModal]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!sessionId) {
      router.replace("/");
      return;
    }
    fetchQuestion();
  }, [sessionId]);

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      const res = await sessionAPI.getQuestion(sessionId!);
      if (res.data.forceTerminate || (res.data as any).message === 'Session completed') {
        setShowEndModal(true);
        return;
      }
      setQuestion(res.data.question);
      setCurrentQuestionIndex(res.data.questionIndex);
      if (res.data.totalQuestions) setTotalQuestions(res.data.totalQuestions);
      setAnswerText("");
      setSelectedOption(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to fetch question");
      if (error.response?.data?.forceTerminate) setShowEndModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!question || !sessionId) return;

    let finalAnswer = "";
    if (question.format === "MCQ") {
      if (selectedOption === null) {
        toast.error("Please select an option");
        return;
      }
      finalAnswer = selectedOption.toString();
    } else {
      if (!answerText.trim()) {
        toast.error("Please provide an answer");
        return;
      }
      finalAnswer = answerText.trim();
    }

    try {
      setSubmitting(true);
      const res = await sessionAPI.submitAnswer({
        sessionId,
        questionId: question.id,
        answer: finalAnswer,
      });

      if (res.data.forceTerminate || res.data.message === 'Session completed') {
        setShowEndModal(true);
        return;
      }

      // Load next question
      setQuestion(res.data.nextQuestion!);
      setCurrentQuestionIndex(res.data.nextQuestionIndex!);
      if (res.data.totalQuestions) setTotalQuestions(res.data.totalQuestions);
      setAnswerText("");
      setSelectedOption(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to submit answer");
      if (error.response?.data?.forceTerminate) setShowEndModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    router.push(`/results/${sessionId}`);
  };

  if (loading && !question) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-zinc-400">Loading question...</p>
      </div>
    );
  }

  const progress = ((currentQuestionIndex) / totalQuestions) * 100;

  return (
    <div className="flex-1 flex flex-col bg-zinc-950">
      {/* Header Area */}
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-4 py-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4 w-1/2">
          <div className="bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-800 hidden sm:flex items-center gap-2">
            <span className="text-zinc-400 text-sm font-medium">Question</span>
            <span className="text-white font-bold">{currentQuestionIndex + 1} <span className="text-zinc-500">/ {totalQuestions}</span></span>
          </div>
          <div className="flex-1 max-w-xs">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
        <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 px-4 py-2 rounded-full">
          <Clock className="w-4 h-4 text-blue-400" />
          <span className="font-mono text-sm font-medium">{formatTime(elapsedSeconds)}</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {question && (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col"
            >
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 sm:p-10 mb-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
                <h2 className="text-2xl sm:text-3xl font-medium leading-relaxed text-zinc-100">
                  {question.text}
                </h2>
                
                {question.format === 'DESCRIPTIVE' && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold uppercase tracking-wider">
                    <BrainCircuitIcon className="w-3 h-3" /> AI Evaluated
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="flex-1 flex flex-col">
                {question.format === "MCQ" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {question.options?.map((opt, idx) => {
                      const isSelected = selectedOption === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => !submitting && setSelectedOption(idx)}
                          className={`
                            relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex items-center gap-4
                            ${isSelected ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/80'}
                            ${submitting ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-blue-500' : 'border-zinc-600'}`}>
                            {isSelected && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                          </div>
                          <span className={`text-lg font-medium ${isSelected ? 'text-blue-100' : 'text-zinc-300'}`}>{opt}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col relative group">
                    <Textarea
                      placeholder="Type your detailed answer here..."
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      disabled={submitting}
                      className="flex-1 min-h-[250px] resize-none bg-zinc-900/50 border-zinc-800 focus:border-purple-500 focus:ring-purple-500/20 text-lg p-6 rounded-2xl placeholder:text-zinc-600 transition-all"
                    />
                    <div className="absolute bottom-4 right-4 text-xs font-medium text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                      {answerText.length} characters
                    </div>
                  </div>
                )}
              </div>

              {/* Footer / Actions */}
              <div className="mt-8 flex justify-end">
                <Button 
                  onClick={handleSubmit} 
                  disabled={submitting}
                  size="lg"
                  className="rounded-full px-8 bg-white text-black hover:bg-zinc-200 text-base font-semibold"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  {currentQuestionIndex === totalQuestions - 1 ? "Submit & Finish" : "Next Question"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* End Modal */}
      <Dialog open={showEndModal} onOpenChange={setShowEndModal}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 sm:max-w-md [&>button]:hidden">
          <DialogHeader className="flex flex-col items-center text-center pb-6">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 border border-blue-500/30">
              <CheckCircle2 className="w-8 h-8 text-blue-400" />
            </div>
            <DialogTitle className="text-2xl mb-2">Interview Completed</DialogTitle>
            <DialogDescription className="text-zinc-400 text-base">
              Your responses have been recorded and are being evaluated by our AI engine.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Button onClick={handleFinish} size="lg" className="rounded-full w-full bg-blue-600 hover:bg-blue-700 text-white">
              View Results
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BrainCircuitIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  )
}
