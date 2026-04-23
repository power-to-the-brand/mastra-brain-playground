"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Save,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
  MessageSquare,
  Database,
  MessageCircle,
  Play,
  Pencil,
} from "lucide-react";
import type { Scenario } from "@/db/schema";
import { ToastProvider, useToast } from "@/components/ui/toast-provider";
import { NewScenarioDialog } from "@/components/new-scenario-dialog";
import { ScenarioResultsDialog } from "@/components/scenario-results-dialog";

interface ScenarioWithMeta extends Scenario {
  conversationMessages: Array<{
    role: "user" | "assistant";
    content: string;
    image?: string;
  }>;
  pastSupplierConversation: Array<{
    role: "user" | "assistant";
    content: string;
    image?: string;
  }>;
  srData: Array<Record<string, unknown>>;
  messageCount: number;
  supplierMessageCount: number;
}

function ScenariosPageContent() {
  const { addToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [selectedScenarioForResults, setSelectedScenarioForResults] =
    useState<ScenarioWithMeta | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [scenarioToEdit, setScenarioToEdit] =
    useState<ScenarioWithMeta | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const loadScenarios = async (pageToLoad = page) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/scenarios?page=${pageToLoad}&perPage=${perPage}`,
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Request failed with status ${response.status}`,
        );
      }

      const data = await response.json();
      setScenarios(
        data.data.map((s: ScenarioWithMeta) => ({
          ...s,
          messageCount: s.conversationMessages?.length || 0,
          supplierMessageCount: s.pastSupplierConversation?.length || 0,
        })),
      );
      setTotalPages(data.meta.totalPages);
      setPage(data.meta.page);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load scenarios";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScenarios();
  }, [page, perPage]);

  const handleRowClick = (scenario: ScenarioWithMeta) => {
    setScenarioToEdit(scenario);
    setEditDialogOpen(true);
  };


  const handleLoadIntoPlayground = (scenario: ScenarioWithMeta) => {
    sessionStorage.setItem(
      "scenario_conversation",
      JSON.stringify(scenario.conversationMessages),
    );
    sessionStorage.setItem("scenario_sr_data", JSON.stringify(scenario.srData));
    sessionStorage.setItem(
      "scenario_supplier_chat",
      JSON.stringify(scenario.pastSupplierConversation),
    );
    sessionStorage.setItem("scenario_id", scenario.id);
    sessionStorage.setItem("scenario_name", scenario.name);

    addToast(`Loading "${scenario.name}" into playground...`, "success");
    window.location.href = "/";
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this scenario?")) return;

    try {
      const response = await fetch(`/api/scenarios?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Request failed with status ${response.status}`,
        );
      }
      addToast("Scenario deleted", "success");
      loadScenarios();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete scenario";
      addToast(message, "error");
    }
  };

  const handleNewScenario = () => {
    setNewDialogOpen(true);
  };

  if (loading && scenarios.length === 0) {
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
          <div className="flex h-screen items-center justify-center">
            <div className="text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Save className="animate-spin-slow" size={24} />
              </div>
              <p className="mt-4 text-muted-foreground">
                Loading scenarios...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
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
          {/* Top Bar */}
          <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-4 sm:px-6 py-4 backdrop-blur-sm">
            <div className="mx-auto w-full max-w-6xl flex items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-2xl font-serif font-bold tracking-tight text-foreground">
                    Saved Scenarios
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Manage and reuse your generated scenarios
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button size="sm" variant="outline" onClick={handleNewScenario} className="gap-2">
                  <Save size={16} />
                  New Scenario
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
            {error && (
              <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <X className="mt-0.5 h-5 w-5 text-destructive" />
                  <div>
                    <h3 className="font-medium text-destructive">
                      Error
                    </h3>
                    <p className="text-sm text-destructive/80">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {scenarios.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                  <Save size={32} />
                </div>
                <h3 className="text-lg font-medium text-foreground">
                  No scenarios found
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate a scenario first to save it here
                </p>
                <Button className="mt-6 gap-2" onClick={handleNewScenario}>
                  <Save size={16} />
                  Generate New Scenario
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80">
                        Name
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80">
                        ID
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 text-center">
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare
                            size={12}
                            className="text-primary"
                          />{" "}
                          Msgs
                        </span>
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 text-center">
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle
                            size={12}
                            className="text-primary"
                          />{" "}
                          Supplier
                        </span>
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 text-center">
                        <span className="inline-flex items-center gap-1">
                          <Database size={12} className="text-primary" /> SR
                        </span>
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80">
                        Created
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 text-center">
                        Playground
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 text-center">
                        Results
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scenarios.map((scenario) => (
                      <TableRow
                        key={scenario.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                        onClick={() => handleRowClick(scenario)}
                      >
                        <TableCell className="font-medium text-foreground max-w-[200px] truncate">
                          {scenario.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-mono font-medium"
                          >
                            {scenario.id.slice(0, 8)}...
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm text-foreground/70">
                          {scenario.messageCount || 0}
                        </TableCell>
                        <TableCell className="text-center text-sm text-foreground/70">
                          {scenario.supplierMessageCount || 0}
                        </TableCell>
                        <TableCell className="text-center text-sm text-foreground/70">
                          {scenario.srData.length}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(scenario.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLoadIntoPlayground(scenario);
                            }}
                            className="text-[10px] font-bold uppercase tracking-wider h-8 px-3 gap-2"
                          >
                            <Play size={12} fill="currentColor" />
                            Load
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedScenarioForResults(scenario);
                              setResultsDialogOpen(true);
                            }}
                            className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary hover:bg-primary/10 h-8 px-3"
                          >
                            View Results
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(scenario);
                              }}
                              className="text-muted-foreground/60 hover:text-foreground hover:bg-muted h-8 w-8 p-0"
                              title="Edit scenario"
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => handleDelete(scenario.id, e)}
                              className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                              title="Delete scenario"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1 || loading}
                        className="h-8 text-xs px-2"
                      >
                        <ChevronLeft size={14} className="mr-1" />
                        Previous
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1,
                        ).map((pageNum) => (
                          <Button
                            key={pageNum}
                            size="sm"
                            variant={pageNum === page ? "default" : "outline"}
                            onClick={() => setPage(pageNum)}
                            disabled={loading}
                            className={cn(
                              "h-8 w-8 p-0 text-xs",
                              pageNum === page &&
                                "bg-primary text-primary-foreground hover:bg-primary/90",
                            )}
                          >
                            {pageNum}
                          </Button>
                        ))}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages || loading}
                        className="h-8 text-xs px-2"
                      >
                        Next
                        <ChevronRight size={14} className="ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <NewScenarioDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUpdated={() => {
          addToast("Scenario updated successfully!", "success");
          setScenarioToEdit(null);
          loadScenarios();
        }}
        scenario={scenarioToEdit}
      />

      <NewScenarioDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        onCreated={() => {
          addToast("Scenario created successfully!", "success");
          loadScenarios();
        }}
      />

      <ScenarioResultsDialog
        open={resultsDialogOpen}
        onOpenChange={setResultsDialogOpen}
        scenarioId={selectedScenarioForResults?.id || null}
        scenarioName={selectedScenarioForResults?.name || null}
      />
    </>
  );
}

export default function ScenariosPage() {
  return (
    <ToastProvider>
      <ScenariosPageContent />
    </ToastProvider>
  );
}
