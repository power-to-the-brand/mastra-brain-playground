"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Gavel, Loader2, Play, Plus, RefreshCw, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";

interface JudgeAssignment {
  id: string;
  judgeId: string;
  runId: string;
  autoEvaluate: boolean;
  status: string;
  rubricId: string | null;
  judge?: {
    id: string;
    name: string;
    mode: string;
  };
  rubric?: {
    id: string;
    name: string;
  };
  latestResult?: {
    id: string;
    overallScore: string | null;
    verdict: string | null;
    evaluatedAt: string | null;
  } | null;
}

interface JudgePanelProps {
  runId: string;
  runStatus: string;
}

export function JudgePanel({ runId, runStatus }: JudgePanelProps) {
  const [assignments, setAssignments] = React.useState<JudgeAssignment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isEvaluating, setIsEvaluating] = React.useState<string | null>(null);
  const [isAddingJudge, setIsAddingJudge] = React.useState(false);
  const [judgeSearchResults, setJudgeSearchResults] = React.useState<Array<{ id: string; name: string; mode: string }>>([]);
  const [isSearchingJudges, setIsSearchingJudges] = React.useState(false);
  const [selectedNewJudgeId, setSelectedNewJudgeId] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);

  const fetchAssignments = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/runs/${runId}/judges`);
      if (res.ok) {
        const { data } = await res.json();
        setAssignments(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch judge assignments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [runId]);

  React.useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const searchJudges = async (query: string) => {
    setIsSearchingJudges(true);
    try {
      const res = await fetch(`/api/judges/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setJudgeSearchResults(data);
      }
    } catch (error) {
      console.error("Judge search failed:", error);
    } finally {
      setIsSearchingJudges(false);
    }
  };

  const handleAddJudge = async () => {
    if (!selectedNewJudgeId) return;
    setIsAdding(true);
    try {
      const res = await fetch(`/api/runs/${runId}/judges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments: [{ judgeId: selectedNewJudgeId, autoEvaluate: true }],
        }),
      });
      if (res.ok) {
        setSelectedNewJudgeId("");
        setIsAddingJudge(false);
        await fetchAssignments();
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error("Failed to add judge:", errData);
      }
    } catch (error) {
      console.error("Failed to add judge:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleAutoEvaluate = async (assignmentId: string, currentValue: boolean) => {
    try {
      const res = await fetch(`/api/runs/${runId}/judges/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoEvaluate: !currentValue }),
      });
      if (res.ok) {
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === assignmentId ? { ...a, autoEvaluate: !currentValue } : a,
          ),
        );
      } else {
        console.error("Failed to toggle auto-evaluate: status", res.status);
        // Revert optimistic UI
        await fetchAssignments();
      }
    } catch (error) {
      console.error("Failed to toggle auto-evaluate:", error);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/runs/${runId}/judges/${assignmentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      } else {
        console.error("Failed to remove judge assignment: status", res.status);
        // Re-fetch to ensure UI is in sync
        await fetchAssignments();
      }
    } catch (error) {
      console.error("Failed to remove judge assignment:", error);
    }
  };

  const handleTriggerEvaluation = async (assignmentId: string, judgeId: string) => {
    setIsEvaluating(assignmentId);
    try {
      const res = await fetch(`/api/runs/${runId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judgeIds: [judgeId] }),
      });
      if (res.ok) {
        // Refresh to get updated status
        await fetchAssignments();
      }
    } catch (error) {
      console.error("Failed to trigger evaluation:", error);
    } finally {
      setIsEvaluating(null);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
    queued: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    running: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-amber-500" />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
            Judges
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-stone-400 hover:text-amber-600"
            onClick={() => {
              setIsAddingJudge(!isAddingJudge);
              if (!isAddingJudge) searchJudges("");
            }}
            title="Add judge"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-stone-400 hover:text-stone-600"
            onClick={fetchAssignments}
            title="Refresh"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Add judge inline selector */}
      {isAddingJudge && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <SearchableSelect
              label="Judge"
              placeholder="Search judges..."
              options={judgeSearchResults
                .filter((j) => !assignments.some((a) => a.judgeId === j.id))
                .map((j) => ({ id: j.id, name: j.name, description: j.mode }))}
              value={selectedNewJudgeId}
              onValueChange={setSelectedNewJudgeId}
              onSearch={searchJudges}
              isLoading={isSearchingJudges}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
            disabled={!selectedNewJudgeId || isAdding}
            onClick={handleAddJudge}
          >
            {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-stone-400"
            onClick={() => setIsAddingJudge(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {assignments.length === 0 ? (
        <p className="text-[10px] text-stone-400 italic py-4 text-center">
          No judges assigned
        </p>
      ) : (
        <div className="space-y-2">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">
                    {assignment.judge?.name || "Unknown"}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`text-[9px] px-1 py-0 ${modeColors[assignment.judge?.mode || "point"] || "bg-stone-100 text-stone-600"}`}
                  >
                    {assignment.judge?.mode || "point"}
                  </Badge>
                </div>
                <Badge
                  variant="secondary"
                  className={`text-[9px] px-1.5 py-0 ${statusColors[assignment.status] || statusColors.pending}`}
                >
                  {assignment.status}
                </Badge>
              </div>

              {/* Result summary */}
              {assignment.latestResult && (
                <div className="flex items-center gap-2 text-[10px]">
                  {assignment.latestResult.overallScore && (
                    <span className="text-stone-600 dark:text-stone-300 font-medium">
                      Score: {Number(assignment.latestResult.overallScore).toFixed(1)}/5
                    </span>
                  )}
                  {assignment.latestResult.verdict && (
                    <Badge
                      variant="secondary"
                      className={`text-[9px] px-1 py-0 ${verdictColors[assignment.latestResult.verdict] || ""}`}
                    >
                      {assignment.latestResult.verdict}
                    </Badge>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleAutoEvaluate(assignment.id, assignment.autoEvaluate)}
                  className="flex items-center gap-1.5 text-[10px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
                  title={assignment.autoEvaluate ? "Auto-evaluate: ON — will run when run completes" : "Auto-evaluate: OFF — must trigger manually"}
                >
                  {assignment.autoEvaluate ? (
                    <ToggleRight className="h-4 w-4 text-amber-500" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-stone-400" />
                  )}
                  <span className="font-medium">
                    {assignment.autoEvaluate ? "Auto" : "Manual"}
                  </span>
                </button>

                {/* Evaluate button — always visible for pending/failed assignments */}
                {(assignment.status === "pending" || assignment.status === "failed") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] gap-1 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    disabled={isEvaluating === assignment.id}
                    onClick={() => handleTriggerEvaluation(assignment.id, assignment.judgeId)}
                  >
                    {isEvaluating === assignment.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    Evaluate
                  </Button>
                )}
                {assignment.status === "running" && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Evaluating...
                  </div>
                )}
                {assignment.status === "queued" && (
                  <span className="text-[10px] text-blue-500 font-medium">Queued</span>
                )}
                {assignment.status === "completed" && (
                  <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">✓ Done</span>
                )}

                <div className="flex-1" />

                <button
                  type="button"
                  onClick={() => handleRemoveAssignment(assignment.id)}
                  className="text-stone-300 hover:text-red-500 transition-colors"
                  title="Remove judge"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}