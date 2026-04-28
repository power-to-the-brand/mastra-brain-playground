"use client";

import * as React from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gavel, ChevronLeft, Clock, Cpu, Scale, FileText, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function JudgeResultDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await fetch(`/api/judge-results/${id}`);
        if (res.ok) {
          const { data } = await res.json();
          setResult(data);
        }
      } catch (error) {
        console.error("Failed to fetch judge result:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchResult();
  }, [id]);

  const verdictColors: Record<string, string> = {
    passed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-900/30",
    needs_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-900/30",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-900/30",
  };

  const modeColors: Record<string, string> = {
    point: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    holistic: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    pass_fail: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
        <div className="animate-pulse text-sm font-medium text-stone-400">Loading result...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
        <div className="text-sm font-medium text-stone-500">Result not found.</div>
      </div>
    );
  }

  const score = result.overallScore ? Number(result.overallScore) : null;
  const scorePercent = score !== null ? (score / 5) * 100 : 0;

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        className={cn(
          "flex-1 transition-all duration-300 flex flex-col",
          sidebarCollapsed ? "ml-20" : "ml-64",
        )}
      >
        {/* Header */}
        <header className="h-16 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between px-6 bg-white/50 dark:bg-stone-950/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <Link href="/judge-results">
              <Button variant="ghost" size="icon" className="text-stone-400 hover:text-stone-900 dark:hover:text-white">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Gavel className="h-4 w-4 text-amber-500" />
                <h1 className="font-serif font-bold text-sm">
                  {result.judge?.name || "Judge"} Evaluation
                </h1>
                {result.verdict && (
                  <Badge className={`text-[10px] font-bold uppercase tracking-tighter ${verdictColors[result.verdict] || ""}`}>
                    {result.verdict}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-widest font-bold">
                {result.mode} mode • {result.evaluatedAt ? new Date(result.evaluatedAt).toLocaleString() : "Not evaluated"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href={`/runs/${result.runId}`}>
              <Button variant="outline" size="sm" className="text-xs border-stone-200 dark:border-stone-800">
                View Run
              </Button>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Score Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 flex flex-col items-center justify-center">
              <div className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100">
                {score !== null ? score.toFixed(1) : "—"}
              </div>
              <div className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mt-1">
                Overall Score
              </div>
              {score !== null && (
                <div className="w-full mt-3 h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      scorePercent >= 80 ? "bg-green-500" : scorePercent >= 60 ? "bg-amber-500" : "bg-red-500",
                    )}
                    style={{ width: `${scorePercent}%` }}
                  />
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Verdict</span>
              </div>
              {result.verdict ? (
                <Badge className={`text-xs font-bold ${verdictColors[result.verdict] || ""}`}>
                  {result.verdict}
                </Badge>
              ) : (
                <span className="text-sm text-stone-400">No verdict</span>
              )}
              <div className="flex items-center gap-2 pt-2">
                <Cpu className="h-3.5 w-3.5 text-stone-400" />
                <span className="text-[10px] text-stone-400 font-mono">
                  {result.judge?.name || "Unknown"} • {result.mode}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Details</span>
              </div>
              {result.model && (
                <div className="text-xs text-stone-600 dark:text-stone-300">
                  Model: <span className="font-mono">{result.model}</span>
                </div>
              )}
              {result.tokensUsed && (
                <div className="text-xs text-stone-600 dark:text-stone-300">
                  Tokens: ↑{result.tokensUsed.input} ↓{result.tokensUsed.output} ({result.tokensUsed.total})
                </div>
              )}
              {result.evaluatedAt && (
                <div className="text-[10px] text-stone-400 font-mono">
                  {new Date(result.evaluatedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {result.summary && (
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-amber-500" />
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
                  Summary
                </h2>
              </div>
              <p className="text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">
                {result.summary}
              </p>
            </div>
          )}

          {/* Dimension Scores */}
          {result.dimensionScores && result.dimensionScores.length > 0 && (
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-amber-500" />
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
                  Dimension Scores
                </h2>
              </div>
              <div className="space-y-4">
                {result.dimensionScores.map((dim: any, idx: number) => {
                  const dimPercent = (dim.score / 5) * 100;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
                          {dim.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                            {dim.score.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            /5 (weight: {dim.weight})
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            dimPercent >= 80 ? "bg-green-500" : dimPercent >= 60 ? "bg-amber-500" : "bg-red-500",
                          )}
                          style={{ width: `${dimPercent}%` }}
                        />
                      </div>
                      {dim.reasoning && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                          {dim.reasoning}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Turn Results */}
          {result.turnResults && result.turnResults.length > 0 && (
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-amber-500" />
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
                  Turn-by-Turn Results
                </h2>
              </div>
              <div className="space-y-4">
                {result.turnResults.map((turn: any, idx: number) => (
                  <details key={idx} className="group border border-stone-200 dark:border-stone-800 rounded-lg">
                    <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/50">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                          Turn {turn.turnIndex + 1}
                        </span>
                        {turn.turnVerdict && (
                          <Badge
                            variant="secondary"
                            className={`text-[9px] px-1.5 py-0 ${verdictColors[turn.turnVerdict] || ""}`}
                          >
                            {turn.turnVerdict}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {turn.overallTurnScore && (
                          <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                            {Number(turn.overallTurnScore).toFixed(1)}/5
                          </span>
                        )}
                      </div>
                    </summary>
                    <div className="p-3 pt-0 space-y-3 border-t border-stone-100 dark:border-stone-800">
                      {turn.scores && turn.scores.length > 0 && (
                        <div className="space-y-2 pt-3">
                          {turn.scores.map((score: any, sIdx: number) => (
                            <div key={sIdx} className="flex items-center justify-between text-xs">
                              <span className="text-stone-600 dark:text-stone-300">{score.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{score.score.toFixed(1)}</span>
                                <span className="text-stone-400">/5</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {turn.summary && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 pt-2 border-t border-stone-100 dark:border-stone-800">
                          {turn.summary}
                        </p>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}