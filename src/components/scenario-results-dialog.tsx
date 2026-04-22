"use client";

import * as React from "react";
import {
  History,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
  X,
  Split,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ScenarioResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarioId: string | null;
  scenarioName: string | null;
}

export function ScenarioResultsDialog({
  open,
  onOpenChange,
  scenarioId,
  scenarioName,
}: ScenarioResultsDialogProps) {
  const [pastResults, setPastResults] = React.useState<any[]>([]);
  const [loadingResults, setLoadingResults] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [compareMode, setCompareMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open && scenarioId) {
      fetchPastResults(scenarioId);
      setCompareMode(false);
      setSelectedIds([]);
    }
  }, [open, scenarioId]);

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id].slice(-2),
    );
  };

  const fetchPastResults = async (id: string) => {
    setLoadingResults(true);
    try {
      const response = await fetch(`/api/scenario-results?scenarioId=${id}`);
      if (response.ok) {
        const data = await response.json();
        const results = data.data || [];
        setPastResults(results);

        // Auto-select latest two and enter compare mode if multiple results exist
        if (results.length >= 2) {
          setSelectedIds([results[0].id, results[1].id]);
          setCompareMode(true);
        } else if (results.length === 1) {
          setSelectedIds([results[0].id]);
          setCompareMode(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch past results:", error);
    } finally {
      setLoadingResults(false);
    }
  };

  const copyToClipboard = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const switchResult = (index: number, newId: string) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      next[index] = newId;
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[85vh] flex flex-col p-0 overflow-hidden border-border bg-card transition-all duration-500",
          compareMode ? "sm:max-w-6xl" : "sm:max-w-2xl",
        )}
      >
        <div className="px-6 pt-6 pb-2">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-serif font-bold tracking-tight text-foreground flex items-center gap-2">
                {compareMode ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 -ml-2 hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => setCompareMode(false)}
                  >
                    <ArrowLeft size={18} />
                  </Button>
                ) : (
                  <History size={20} className="text-primary" />
                )}
                <span>
                  {compareMode
                    ? "Compare Agent Outputs"
                    : `Results for ${scenarioName}`}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
                {compareMode
                  ? "Analyzing variance between generations"
                  : "Review past executions and compare outputs"}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {!compareMode && selectedIds.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds([])}
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive"
                >
                  Clear Selection ({selectedIds.length})
                </Button>
              )}
              {!compareMode && selectedIds.length === 2 && (
                <Button
                  size="sm"
                  onClick={() => setCompareMode(true)}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 animate-in fade-in zoom-in slide-in-from-right-4 duration-500"
                >
                  <Split size={14} />
                  Compare
                </Button>
              )}
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin scrollbar-thumb-border">
          {loadingResults ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <Sparkles className="animate-spin text-primary/40" size={32} />
                <Sparkles
                  className="absolute inset-0 animate-pulse text-primary/20 scale-150"
                  size={32}
                />
              </div>
              <span className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
                Consulting Archives...
              </span>
            </div>
          ) : compareMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full min-h-[500px] mt-4">
              {[0, 1].map((index) => {
                const resultId = selectedIds[index];
                const result = pastResults.find((r) => r.id === resultId);
                if (!result) return null;

                return (
                  <div
                    key={`compare-${index}`}
                    className={cn(
                      "flex flex-col gap-4 animate-in duration-700 fill-mode-both",
                      index === 0
                        ? "slide-in-from-left-8"
                        : "slide-in-from-right-8",
                    )}
                  >
                    <div className="flex items-center justify-between sticky top-0 bg-card/95 backdrop-blur-md py-3 z-10 border-b border-border/50">
                      <div className="flex flex-col gap-1 w-full max-w-[200px]">
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60">
                          Generation {index === 0 ? "A" : "B"}
                        </span>
                        <div className="relative group/select">
                          <select
                            value={result.id}
                            onChange={(e) =>
                              switchResult(index, e.target.value)
                            }
                            className="appearance-none bg-transparent border-none p-0 pr-6 font-serif font-bold text-base text-foreground focus:ring-0 cursor-pointer w-full truncate"
                          >
                            {pastResults.map((r) => (
                              <option
                                key={r.id}
                                value={r.id}
                                className="bg-card text-foreground py-2"
                              >
                                {r.agentName} (
                                {new Date(r.createdAt).toLocaleTimeString()})
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={14}
                            className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none group-hover/select:text-primary transition-colors"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            copyToClipboard(result.finalOutput, result.id)
                          }
                          className="h-7 w-7 p-0 rounded-full border-border/50 hover:border-primary/50 hover:text-primary transition-all"
                        >
                          {copiedId === result.id ? (
                            <Check size={12} />
                          ) : (
                            <Copy size={12} />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 bg-muted/5 rounded-2xl border border-border/40 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                      <div className="prose prose-stone dark:prose-invert max-w-none text-sm leading-relaxed text-foreground/80 p-8 h-full overflow-y-auto scrollbar-thin">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {result.finalOutput}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : pastResults.length > 0 ? (
            <div className="space-y-4 pt-2">
              {pastResults.map((result) => (
                <div
                  key={result.id}
                  className={cn(
                    "group relative flex flex-col gap-3 rounded-2xl border p-5 transition-all cursor-pointer overflow-hidden",
                    selectedIds.includes(result.id)
                      ? "border-primary bg-primary/[0.02] shadow-md ring-1 ring-primary/20"
                      : "border-border/60 bg-muted/[0.03] hover:border-primary/30 hover:bg-muted/[0.05] shadow-sm",
                  )}
                  onClick={(e) => toggleSelection(result.id, e)}
                >
                  {/* Selection Indicator */}
                  <div
                    className={cn(
                      "absolute top-0 left-0 w-1 h-full transition-all duration-300",
                      selectedIds.includes(result.id)
                        ? "bg-primary scale-y-100"
                        : "bg-primary/0 scale-y-0",
                    )}
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300",
                          selectedIds.includes(result.id)
                            ? "bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30"
                            : "border-muted-foreground/20 bg-background group-hover:border-primary/40",
                        )}
                      >
                        {selectedIds.includes(result.id) ? (
                          <span className="text-[10px] font-bold">
                            {selectedIds.indexOf(result.id) + 1}
                          </span>
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20 group-hover:bg-primary/20 transition-colors" />
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-muted/10 border-border/50"
                      >
                        {result.agentName}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground/40 font-mono tracking-tight">
                        {new Date(result.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(result.finalOutput, result.id);
                      }}
                      className="h-8 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                    >
                      {copiedId === result.id ? (
                        <>
                          <Check size={12} className="mr-1.5 text-success" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={12} className="mr-1.5" />
                          Copy Output
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="prose prose-stone dark:prose-invert max-w-none text-[13px] leading-relaxed text-foreground/60 bg-background/30 rounded-xl p-4 border border-border/30 line-clamp-2 italic">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.finalOutput}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
              <History
                className="mx-auto text-muted-foreground/20 mb-3"
                size={32}
              />
              <p className="text-sm text-muted-foreground">
                No past results found for this scenario.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
