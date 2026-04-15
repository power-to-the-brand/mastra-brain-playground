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

  React.useEffect(() => {
    if (open && scenarioId) {
      fetchPastResults(scenarioId);
    }
  }, [open, scenarioId]);

  const fetchPastResults = async (id: string) => {
    setLoadingResults(true);
    try {
      const response = await fetch(`/api/scenario-results?scenarioId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setPastResults(data.data || []);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-border bg-card">
        <div className="px-6 pt-6 pb-2">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-bold tracking-tight text-foreground flex items-center gap-2">
              <History size={20} className="text-primary" />
              <span>Results for {scenarioName}</span>
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
              Past executions history
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 scrollbar-thin scrollbar-thumb-border">
          {loadingResults ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Sparkles className="animate-spin text-primary/40 mb-3" size={24} />
              <span className="text-sm text-muted-foreground">Retrieving history...</span>
            </div>
          ) : pastResults.length > 0 ? (
            <div className="space-y-4">
              {pastResults.map((result) => (
                <div
                  key={result.id}
                  className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-muted/5 p-5 shadow-sm hover:border-primary/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                        {result.agentName}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">
                        {new Date(result.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(result.finalOutput, result.id)}
                      className="h-8 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-all"
                    >
                      {copiedId === result.id ? (
                        <><Check size={12} className="mr-1.5 text-success" />Copied</>
                      ) : (
                        <><Copy size={12} className="mr-1.5" />Copy Output</>
                      )}
                    </Button>
                  </div>
                  <div className="prose prose-stone dark:prose-invert max-w-none text-sm leading-relaxed text-foreground/80 bg-background/50 rounded-xl p-4 border border-border/50">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.finalOutput}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
              <History className="mx-auto text-muted-foreground/20 mb-3" size={32} />
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
