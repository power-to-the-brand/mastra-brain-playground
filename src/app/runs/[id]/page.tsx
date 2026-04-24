"use client";

import * as React from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ChatView } from "@/components/runs/chat-view";
import { Badge } from "@/components/ui/badge";
import { Activity, ChevronLeft, Clock, Cpu, Zap, Coins, Hash, Brain, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [run, setRun] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchRun = async () => {
      try {
        const res = await fetch(`/api/runs/${id}`);
        const data = await res.json();
        if (data.error) {
          console.error("Failed to fetch run:", data.error);
          setRun(null);
        } else {
          setRun(data);
        }
      } catch (error) {
        console.error("Failed to fetch run:", error);
        setRun(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRun();
    
    // Poll for updates if run is still active
    const interval = setInterval(() => {
      if (run?.status === 'running' || run?.status === 'pending') {
        fetchRun();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [id, run?.status]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="animate-pulse">Loading run details...</div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div>Run not found.</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        className={cn(
          "flex-1 transition-all duration-300 flex flex-col h-screen overflow-hidden",
          sidebarCollapsed ? "ml-20" : "ml-64",
        )}
      >
        {/* Header */}
        <header className="h-16 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between px-6 bg-white/50 dark:bg-stone-950/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <Link href="/runs">
              <Button variant="ghost" size="icon" className="text-stone-400 hover:text-stone-900 dark:hover:text-white">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-bold text-sm">Run {run.id?.slice(0, 8)}</h1>
                <Badge className={cn(
                  "text-[10px] font-bold uppercase tracking-tighter",
                  run.status === 'completed' ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/30" : 
                  run.status === 'failed' ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30" :
                  "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30"
                )}>
                  ● {run.status}
                </Badge>
              </div>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-widest font-bold">
                Agent: {run.agentId?.slice(0, 8)} • Scenario: {run.scenarioId?.slice(0, 8)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-stone-400">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Duration: {run.metrics?.duration ? `${(run.metrics.duration / 1000).toFixed(1)}s` : '—'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-stone-400">
              <Zap className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Tokens: {run.metrics?.totalTokens != null ? `${run.metrics.totalTokens}` : '—'}
                {run.metrics?.inputTokens != null && ` (↑${run.metrics.inputTokens} ↓${run.metrics.outputTokens})`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-stone-400">
              <Hash className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Steps: {run.metrics?.stepCount ?? '—'} • Tools: {run.metrics?.toolCallCount ?? '—'}
              </span>
            </div>
            {run.metrics?.model && (
              <div className="flex items-center gap-2 text-stone-400">
                <Cpu className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {run.metrics.model.modelId}
                </span>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-stone-50 dark:bg-stone-950 relative">
            <ChatView
              agentId={run.agentId}
              scenarioId={run.scenarioId}
              runId={run.id}
              contextData={
                run.scenario
                  ? {
                      conversationMessages: run.scenario.conversationMessages || null,
                      srData: run.scenario.srData || null,
                      products: run.scenario.products || null,
                      supplierHistory: run.scenario.pastSupplierConversation || null,
                    }
                  : undefined
              }
              initialMessages={(() => {
                const mapped =
                  run.messages && run.messages.length > 0
                    ? run.messages.map((m: any, idx: number) => {
                        // New format: messages stored with full parts (id, role, parts)
                        if (m.parts && Array.isArray(m.parts)) {
                          return {
                            id: m.id || `stored-${idx}`,
                            role: m.role,
                            parts: m.parts,
                          };
                        }
                        // Legacy format: messages stored with content only
                        return {
                          id: `stored-${idx}`,
                          role: m.role,
                          parts: [{ type: 'text' as const, text: m.content || '' }],
                        };
                      })
                    : run.output
                      ? [{ id: 'initial-output', role: 'assistant' as const, parts: [{ type: 'text' as const, text: run.output }] }]
                      : [];

                // Deduplicate by id to prevent assistant-ui crash on duplicate message IDs
                return [...new Map(mapped.map((m) => [m.id, m])).values()];
              })()}
            />
          </div>

          {/* Trace Sidebar */}
          <aside className="w-80 border-l border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50 flex flex-col">
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" />
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">Execution Trace</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {run.trace && run.trace.length > 0 ? (
                run.trace.map((item: any, idx: number) => (
                  <div key={idx} className="relative pl-6 pb-4 border-l border-stone-200 dark:border-stone-800 last:border-0">
                    <div className="absolute -left-1.25 top-0 w-2.5 h-2.5 rounded-full bg-stone-200 dark:bg-stone-800 border border-stone-300 dark:border-stone-700" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {item.type === 'subagent' ? <Cpu className="h-3 w-3 text-blue-500" /> : item.type === 'tool' ? <Zap className="h-3 w-3 text-amber-500" /> : <Brain className="h-3 w-3 text-violet-500" />}
                        <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{item.type}</span>
                        {item.stepType && (
                          <span className="text-[9px] text-stone-400 dark:text-stone-500 font-mono">{item.stepType}</span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-stone-900 dark:text-stone-100">{item.name}</p>
                      {item.toolCallId && (
                        <p className="text-[9px] text-stone-400 font-mono truncate">id: {item.toolCallId}</p>
                      )}
                      {item.usage && (
                        <div className="flex items-center gap-2 text-[9px] text-stone-400">
                          <Coins className="h-2.5 w-2.5" />
                          <span>↑{item.usage.inputTokens} ↓{item.usage.outputTokens} ({item.usage.totalTokens})</span>
                        </div>
                      )}
                      {item.finishReason && (
                        <span className="inline-block text-[9px] bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-1.5 py-0.5 rounded font-mono">
                          {item.finishReason}
                        </span>
                      )}
                      {item.model && (
                        <p className="text-[9px] text-stone-400 font-mono">{item.model.modelId} ({item.model.provider})</p>
                      )}
                      {item.reasoning && (
                        <details className="mt-1">
                          <summary className="text-[9px] text-violet-500 cursor-pointer font-bold uppercase tracking-wider">Reasoning</summary>
                          <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 whitespace-pre-wrap">{item.reasoning}</p>
                        </details>
                      )}
                      {item.input && (
                        <details className="mt-1">
                          <summary className="text-[9px] text-blue-500 cursor-pointer font-bold uppercase tracking-wider">Input</summary>
                          <pre className="text-[9px] text-stone-500 dark:text-stone-400 mt-1 whitespace-pre-wrap overflow-x-auto bg-stone-100 dark:bg-stone-800 rounded p-1.5">
                            {typeof item.input === 'string' ? item.input : JSON.stringify(item.input, null, 2)}
                          </pre>
                        </details>
                      )}
                      {item.output && (
                        <details className="mt-1">
                          <summary className="text-[9px] text-green-500 cursor-pointer font-bold uppercase tracking-wider">Output</summary>
                          <pre className="text-[9px] text-stone-500 dark:text-stone-400 mt-1 whitespace-pre-wrap overflow-x-auto bg-stone-100 dark:bg-stone-800 rounded p-1.5">
                            {typeof item.output === 'string' ? item.output : JSON.stringify(item.output, null, 2)}
                          </pre>
                        </details>
                      )}
                      {item.warnings?.length > 0 && (
                        <div className="flex items-start gap-1 mt-1">
                          <AlertTriangle className="h-2.5 w-2.5 text-amber-500 shrink-0 mt-0.5" />
                          <div className="text-[9px] text-amber-600 dark:text-amber-400">
                            {item.warnings.map((w: string, i: number) => (
                              <p key={i}>{typeof w === 'string' ? w : JSON.stringify(w)}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-[10px] text-stone-400 font-mono">{new Date(item.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-stone-300 dark:text-stone-700 space-y-2">
                  <Activity className="h-8 w-8 opacity-20" />
                  <p className="text-[10px] uppercase font-bold tracking-widest">No trace data yet</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
