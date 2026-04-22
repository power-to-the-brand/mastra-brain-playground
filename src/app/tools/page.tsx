"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wrench,
  Loader2,
  AlertCircle,
  Info,
  ExternalLink,
} from "lucide-react";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface Tool {
  id: string;
  name: string;
  description: string;
}

function ToolsPageContent() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const response = await fetch("/api/tools");
        if (!response.ok) throw new Error("Failed to fetch tools");
        const data = await response.json();
        setTools(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchTools();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        className={cn(
          "ml-0 transition-all duration-300",
          sidebarCollapsed ? "sm:ml-20" : "sm:ml-64",
        )}
      >
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wrench size={20} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Tools</h1>
              <p className="text-muted-foreground">
                All available tools registered in the Mastra Brain system.
              </p>
            </div>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/30">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="space-y-1">
              <p className="font-medium text-blue-900 dark:text-blue-200">
                Tools are created programmatically
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Tools are defined in code within the Mastra Brain project and
                registered via the{" "}
                <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-xs dark:bg-blue-900/50">
                  mastra/index.ts
                </code>{" "}
                configuration. If you need a new tool set up or an existing one
                modified, please reach out to the developer team.
              </p>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950/30">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-red-700 dark:text-red-300">
                Failed to load tools: {error}
              </p>
            </div>
          ) : tools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Wrench className="mb-3 h-10 w-10" strokeWidth={1.5} />
              <p className="text-lg font-medium">No tools found</p>
              <p className="text-sm">
                No tools are currently registered in the system.
              </p>
            </div>
          ) : (
            <div className="rounded-md border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-12 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                        #
                      </TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                        Tool ID
                      </TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                        Name
                      </TableHead>
                      <TableHead className="w-[45%] font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                        Description
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tools.map((tool, index) => (
                      <TableRow
                        key={tool.id}
                        className="group hover:bg-muted/20 transition-colors"
                      >
                        <TableCell className="py-4 text-muted-foreground text-sm">
                          {index + 1}
                        </TableCell>
                        <TableCell className="py-4">
                          <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
                            {tool.id}
                          </code>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="font-medium text-sm">
                            {tool.name}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="text-sm text-muted-foreground whitespace-normal">
                            {tool.description || "—"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Footer info */}
          {!loading && !error && tools.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing {tools.length} tool{tools.length !== 1 ? "s" : ""} ·{" "}
              <span className="inline-flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                API endpoint: <code className="font-mono">/api/tools</code>
              </span>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ToolsPage() {
  return <ToolsPageContent />;
}