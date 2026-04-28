"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { X, Plus, Loader2, Gavel, ToggleLeft, ToggleRight } from "lucide-react";

interface JudgeOption {
  id: string;
  name: string;
  description?: string;
  mode?: string;
}

interface AssignedJudge {
  judgeId: string;
  judgeName: string;
  judgeMode: string;
  autoEvaluate: boolean;
}

interface JudgeAssignmentProps {
  runId?: string | null;
  onAssign?: (assignments: AssignedJudge[]) => void;
}

export function JudgeAssignment({ runId, onAssign }: JudgeAssignmentProps) {
  const [judges, setJudges] = React.useState<JudgeOption[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [assignedJudges, setAssignedJudges] = React.useState<AssignedJudge[]>([]);
  const [selectedJudgeId, setSelectedJudgeId] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const searchJudges = async (query: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/judges/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setJudges(data);
    } catch (error) {
      console.error("Judge search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  React.useEffect(() => {
    searchJudges("");
  }, []);

  // Load existing assignments if editing a run
  React.useEffect(() => {
    if (!runId) return;
    (async () => {
      try {
        const res = await fetch(`/api/runs/${runId}/judges`);
        if (res.ok) {
          const { data } = await res.json();
          const existing: AssignedJudge[] = (data || []).map((a: any) => ({
            judgeId: a.judgeId,
            judgeName: a.judge?.name || "Unknown",
            judgeMode: a.judge?.mode || a.mode || "point",
            autoEvaluate: a.autoEvaluate ?? false,
          }));
          setAssignedJudges(existing);
        }
      } catch (error) {
        console.error("Failed to load judge assignments:", error);
      }
    })();
  }, [runId]);

  const handleAddJudge = () => {
    if (!selectedJudgeId) return;
    const judge = judges.find((j) => j.id === selectedJudgeId);
    if (!judge) return;
    if (assignedJudges.some((a) => a.judgeId === selectedJudgeId)) return;

    const newAssignment: AssignedJudge = {
      judgeId: judge.id,
      judgeName: judge.name,
      judgeMode: judge.mode || "point",
      autoEvaluate: true,
    };
    setAssignedJudges((prev) => [...prev, newAssignment]);
    setSelectedJudgeId("");
  };

  const handleRemoveJudge = (judgeId: string) => {
    setAssignedJudges((prev) => prev.filter((a) => a.judgeId !== judgeId));
  };

  const handleToggleAutoEvaluate = (judgeId: string) => {
    setAssignedJudges((prev) =>
      prev.map((a) =>
        a.judgeId === judgeId ? { ...a, autoEvaluate: !a.autoEvaluate } : a,
      ),
    );
  };

  const handleSave = async () => {
    if (!runId) {
      // For new runs, just pass the assignments up
      onAssign?.(assignedJudges);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/runs/${runId}/judges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments: assignedJudges.map((a) => ({
            judgeId: a.judgeId,
            autoEvaluate: a.autoEvaluate,
          })),
        }),
      });

      if (res.ok) {
        onAssign?.(assignedJudges);
      }
    } catch (error) {
      console.error("Failed to save judge assignments:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const modeColors: Record<string, string> = {
    point: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    holistic: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    pass_fail: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Gavel className="h-4 w-4 text-stone-500" />
        <h3 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
          Judge Assignments
        </h3>
      </div>

      {/* Judge selector */}
      <div className="flex gap-2">
        <div className="flex-1">
          <SearchableSelect
            label="Add Judge"
            placeholder="Search judges..."
            options={judges
              .filter((j) => !assignedJudges.some((a) => a.judgeId === j.id))
              .map((j) => ({
                id: j.id,
                name: j.name,
                description: j.mode,
              }))}
            value={selectedJudgeId}
            onValueChange={setSelectedJudgeId}
            onSearch={searchJudges}
            isLoading={isSearching}
            helperText="Select a judge to evaluate this run."
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-6 border-stone-200 dark:border-stone-800"
          disabled={!selectedJudgeId}
          onClick={handleAddJudge}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Assigned judges list */}
      {assignedJudges.length > 0 && (
        <div className="space-y-2">
          {assignedJudges.map((assignment) => (
            <div
              key={assignment.judgeId}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                  {assignment.judgeName}
                </span>
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 ${modeColors[assignment.judgeMode] || "bg-stone-100 text-stone-600"}`}
                >
                  {assignment.judgeMode}
                </Badge>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Auto-evaluate toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleAutoEvaluate(assignment.judgeId)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    assignment.autoEvaluate
                      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                  }`}
                  title={assignment.autoEvaluate ? "Auto-evaluate: ON — will run when run completes" : "Auto-evaluate: OFF — must trigger manually"}
                >
                  {assignment.autoEvaluate ? (
                    <ToggleRight className="h-3.5 w-3.5" />
                  ) : (
                    <ToggleLeft className="h-3.5 w-3.5" />
                  )}
                  {assignment.autoEvaluate ? "Auto" : "Manual"}
                </button>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveJudge(assignment.judgeId)}
                  className="text-stone-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {assignedJudges.length === 0 && (
        <p className="text-xs text-stone-400 italic">
          No judges assigned. Judges will evaluate the run after completion.
        </p>
      )}
    </div>
  );
}