"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Loader2,
  Trash2,
  Edit,
  Scale,
  Settings2,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast, ToastProvider } from "@/components/ui/toast-provider";
import Link from "next/link";
import type { Judge, Rubric } from "@/db";

function JudgesPageContent() {
  const { addToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [judges, setJudges] = useState<(Judge & { rubric?: Rubric })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [judgeToDelete, setJudgeToDelete] = useState<Judge | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchJudges = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/judges");
      if (!response.ok) throw new Error("Failed to fetch judges");
      const result = await response.json();
      setJudges(result.data || []);
    } catch (error) {
      console.error("Error fetching judges:", error);
      addToast("Failed to load judges", "error");
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchJudges();
  }, [fetchJudges]);

  const openDeleteDialog = (judge: Judge) => {
    setJudgeToDelete(judge);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!judgeToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/judges/${judgeToDelete.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete judge");

      addToast("Judge deleted successfully", "success");
      fetchJudges();
    } catch (error) {
      addToast("Failed to delete judge", "error");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setJudgeToDelete(null);
    }
  };

  const filteredJudges = judges.filter(
    (j) =>
      j.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.description?.toLowerCase() ?? "").includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        className={cn(
          "flex-1 transition-all duration-300 flex flex-col",
          sidebarCollapsed ? "ml-20" : "ml-64"
        )}
      >
        <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-serif font-bold tracking-tight">Judges</h1>
              <p className="text-stone-500 dark:text-stone-400 mt-2">
                Manage your LLM judges for evaluating agent performance.
              </p>
            </div>
            <Link href="/judges/new">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-lg shadow-amber-900/20">
                <Plus className="h-4 w-4" />
                Add Judge
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="search"
                placeholder="Search judges..."
                aria-label="Search judges"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-stone-100/80 dark:bg-stone-900/80">
                <TableRow className="border-stone-200 dark:border-stone-800 hover:bg-transparent">
                  <TableHead className="text-stone-500 dark:text-stone-400 uppercase text-[10px] font-bold tracking-widest w-[250px]">
                    Judge
                  </TableHead>
                  <TableHead className="text-stone-500 dark:text-stone-400 uppercase text-[10px] font-bold tracking-widest">
                    Model
                  </TableHead>
                  <TableHead className="text-stone-500 dark:text-stone-400 uppercase text-[10px] font-bold tracking-widest">
                    Mode
                  </TableHead>
                  <TableHead className="text-stone-500 dark:text-stone-400 uppercase text-[10px] font-bold tracking-widest">
                    Rubric
                  </TableHead>
                  <TableHead className="text-stone-500 dark:text-stone-400 uppercase text-[10px] font-bold tracking-widest text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-amber-600" />
                    </TableCell>
                  </TableRow>
                ) : filteredJudges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-stone-500">
                      No judges found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJudges.map((judge) => (
                    <TableRow
                      key={judge.id}
                      className="border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                    >
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="font-serif font-semibold text-stone-900 dark:text-stone-100">
                            {judge.name}
                          </span>
                          {judge.description && (
                            <span className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1">
                              {judge.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30">
                          {judge.model}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-tighter bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/30">
                          {judge.mode.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {judge.rubric ? (
                          <Link href={`/rubrics/${judge.rubricId}`} className="flex items-center gap-1.5 text-sm hover:text-amber-600 transition-colors group">
                            <Scale className="h-3.5 w-3.5 text-stone-400 group-hover:text-amber-600" />
                            {judge.rubric.name}
                          </Link>
                        ) : (
                          <span className="text-stone-400 text-sm italic">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/judges/${judge.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
                            >
                              <Edit size={14} />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-stone-500 hover:text-red-600"
                            onClick={() => openDeleteDialog(judge)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <Settings2 className="h-5 w-5 text-red-600" />
              Delete Judge
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{judgeToDelete?.name}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="border-stone-200 dark:border-stone-700"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function JudgesPage() {
  return (
    <ToastProvider>
      <JudgesPageContent />
    </ToastProvider>
  );
}
