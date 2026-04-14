"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import type { Scenario } from "@/db/schema";
import { ToastProvider, useToast } from "@/components/ui/toast-provider";
import { ScenarioDetailDialog } from "@/components/scenario-detail-dialog";

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
  const router = useRouter();
  const { addToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedScenario, setSelectedScenario] =
    useState<ScenarioWithMeta | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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
    setSelectedScenario(scenario);
    setDialogOpen(true);
  };

  const handleUpdateOnly = async (scenario: {
    id: string;
    name: string;
    conversationMessages: ScenarioWithMeta["conversationMessages"];
    srData: ScenarioWithMeta["srData"];
    pastSupplierConversation: ScenarioWithMeta["pastSupplierConversation"];
  }) => {
    setIsUpdating(true);
    try {
      const response = await fetch("/api/scenarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: scenario.id,
          name: scenario.name,
          conversationMessages: scenario.conversationMessages,
          srData: scenario.srData,
          pastSupplierConversation: scenario.pastSupplierConversation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Request failed with status ${response.status}`,
        );
      }

      addToast(`Scenario "${scenario.name}" updated successfully!`, "success");
      setDialogOpen(false);
      setSelectedScenario(null);
      loadScenarios();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update scenario";
      addToast(message, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateAndLoad = async (scenario: {
    id: string;
    name: string;
    conversationMessages: ScenarioWithMeta["conversationMessages"];
    srData: ScenarioWithMeta["srData"];
    pastSupplierConversation: ScenarioWithMeta["pastSupplierConversation"];
  }) => {
    setIsUpdating(true);
    try {
      const response = await fetch("/api/scenarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: scenario.id,
          name: scenario.name,
          conversationMessages: scenario.conversationMessages,
          srData: scenario.srData,
          pastSupplierConversation: scenario.pastSupplierConversation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Request failed with status ${response.status}`,
        );
      }

      const data = await response.json();

      sessionStorage.setItem(
        "scenario_conversation",
        JSON.stringify(data.data.conversationMessages),
      );
      sessionStorage.setItem(
        "scenario_sr_data",
        JSON.stringify(data.data.srData),
      );
      sessionStorage.setItem(
        "scenario_supplier_chat",
        JSON.stringify(data.data.pastSupplierConversation),
      );
      sessionStorage.setItem("scenario_name", data.data.name);

      addToast(
        `Scenario "${scenario.name}" updated. Loading into playground...`,
        "success",
      );
      window.location.href = "/";
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update scenario";
      addToast(message, "error");
    } finally {
      setIsUpdating(false);
    }
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
    router.push("/scenario-builder");
  };

  if (loading && scenarios.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50/50 text-stone-800 dark:bg-stone-950 dark:text-stone-100">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main
          className={cn(
            "ml-0 transition-all duration-300 w-full",
            sidebarCollapsed ? "sm:ml-20" : "sm:ml-64",
          )}
        >
          <div className="flex h-[calc(100vh-80px)] items-center justify-center">
            <div className="text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                <Save className="animate-spin-slow" size={24} />
              </div>
              <p className="mt-4 text-stone-500 dark:text-stone-400">
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
      <div className="min-h-screen bg-stone-50/50 text-stone-800 dark:bg-stone-950 dark:text-stone-100">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main
          className={cn(
            "ml-0 transition-all duration-300 w-full",
            sidebarCollapsed ? "sm:ml-20" : "sm:ml-64",
          )}
        >
          {/* Top Bar */}
          <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-stone-50/80 px-4 sm:px-6 py-4 backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/80">
            <div className="w-full max-w-6xl flex items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-2xl font-serif italic tracking-tight text-stone-900 dark:text-stone-100">
                    Saved Scenarios
                  </h1>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Manage and reuse your generated scenarios
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button size="sm" variant="outline" onClick={handleNewScenario}>
                  <Save size={16} className="mr-2" />
                  New Scenario
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900/30 dark:bg-red-900/10">
                <div className="flex items-start gap-3">
                  <X className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
                  <div>
                    <h3 className="font-medium text-red-800 dark:text-red-300">
                      Error
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {scenarios.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-600 mb-4">
                  <Save size={32} />
                </div>
                <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100">
                  No scenarios found
                </h3>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                  Generate a scenario first to save it here
                </p>
                <Button className="mt-6" onClick={handleNewScenario}>
                  <Save size={16} className="mr-2" />
                  Generate New Scenario
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white/70 shadow-sm dark:border-stone-800/50 dark:bg-stone-900/50">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        Name
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        ID
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 text-center">
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare
                            size={12}
                            className="text-orange-500"
                          />{" "}
                          Msgs
                        </span>
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 text-center">
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle
                            size={12}
                            className="text-purple-500"
                          />{" "}
                          Supplier
                        </span>
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 text-center">
                        <span className="inline-flex items-center gap-1">
                          <Database size={12} className="text-blue-500" /> SR
                        </span>
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        Created
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scenarios.map((scenario) => (
                      <TableRow
                        key={scenario.id}
                        className="cursor-pointer hover:bg-orange-50/30 dark:hover:bg-orange-900/10 transition-colors"
                        onClick={() => handleRowClick(scenario)}
                      >
                        <TableCell className="font-medium text-stone-900 dark:text-stone-100 max-w-[200px] truncate">
                          {scenario.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="text-xs font-mono"
                          >
                            {scenario.id.slice(0, 8)}...
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm text-stone-600 dark:text-stone-400">
                          {scenario.messageCount || 0}
                        </TableCell>
                        <TableCell className="text-center text-sm text-stone-600 dark:text-stone-400">
                          {scenario.supplierMessageCount || 0}
                        </TableCell>
                        <TableCell className="text-center text-sm text-stone-600 dark:text-stone-400">
                          {scenario.srData.length}
                        </TableCell>
                        <TableCell className="text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                          {new Date(scenario.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleDelete(scenario.id, e)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 p-0"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-stone-200/60 px-4 py-3 dark:border-stone-800">
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1 || loading}
                        className="h-8 text-xs"
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
                                "bg-orange-600 hover:bg-orange-700",
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
                        className="h-8 text-xs"
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

      <ScenarioDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        scenario={selectedScenario}
        onUpdateOnly={handleUpdateOnly}
        onUpdateAndLoad={handleUpdateAndLoad}
        isUpdating={isUpdating}
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
