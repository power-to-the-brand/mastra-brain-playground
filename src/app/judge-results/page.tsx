"use client";

import * as React from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Gavel, ChevronLeft, ChevronRight, Eye, Play } from "lucide-react";
import Link from "next/link";

export default function JudgeResultsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [results, setResults] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  const fetchResults = async (pageToLoad = page) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/judge-results?page=${pageToLoad}&limit=20`);
      const data = await res.json();
      setResults(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setPage(data.pagination?.page || 1);
    } catch (error) {
      console.error("Failed to fetch judge results:", error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchResults();
  }, [page]);

  const verdictColors: Record<string, string> = {
    passed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    needs_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  const modeColors: Record<string, string> = {
    point: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    holistic: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    pass_fail: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

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
        <header className="h-16 border-b border-stone-200 dark:border-stone-800 flex items-center px-6 bg-white/50 dark:bg-stone-950/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Gavel className="h-5 w-5 text-amber-500" />
            <h1 className="font-serif font-bold text-lg">Judge Results</h1>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-pulse text-sm font-medium text-stone-400">Loading results...</div>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-stone-400 space-y-3">
              <Gavel className="h-12 w-12 opacity-20" />
              <p className="text-sm font-medium">No judge results yet</p>
              <p className="text-xs text-stone-400">
                Results will appear here after judges evaluate runs.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-stone-200 dark:border-stone-800">
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Judge</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Run</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Mode</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Score</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Verdict</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Evaluated</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result: any) => (
                    <TableRow
                      key={result.id}
                      className="border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 cursor-pointer"
                    >
                      <TableCell className="py-3">
                        <Link href={`/judge-results/${result.id}`} className="font-medium text-sm text-stone-900 dark:text-stone-100 hover:text-amber-600">
                          {result.judge?.name || result.judgeId?.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell className="py-3">
                        <Link href={`/runs/${result.runId}`} className="text-xs text-stone-500 hover:text-amber-600 font-mono">
                          {result.runId?.slice(0, 8)}
                        </Link>
                        {result.scenario && (
                          <span className="text-[10px] text-stone-400 ml-2">
                            {result.scenario.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge
                          variant="secondary"
                          className={`text-[9px] px-1.5 py-0 ${modeColors[result.mode] || "bg-stone-100 text-stone-600"}`}
                        >
                          {result.mode}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-sm font-medium">
                          {result.overallScore ? Number(result.overallScore).toFixed(1) : "—"}
                        </span>
                        <span className="text-[10px] text-stone-400">/5</span>
                      </TableCell>
                      <TableCell className="py-3">
                        {result.verdict ? (
                          <Badge
                            variant="secondary"
                            className={`text-[9px] px-1.5 py-0 ${verdictColors[result.verdict] || ""}`}
                          >
                            {result.verdict}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-stone-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-[10px] text-stone-400 font-mono">
                          {result.evaluatedAt
                            ? new Date(result.evaluatedAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/judge-results/${result.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                            title="View result details"
                          >
                            <Eye className="h-3 w-3" />
                            Result
                          </Link>
                          <Link
                            href={`/runs/${result.runId}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="View run details"
                          >
                            <Play className="h-3 w-3" />
                            Run
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200 dark:border-stone-800">
                <span className="text-[10px] text-stone-400">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded border border-stone-200 dark:border-stone-800 text-stone-400 hover:text-stone-600 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded border border-stone-200 dark:border-stone-800 text-stone-400 hover:text-stone-600 disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}