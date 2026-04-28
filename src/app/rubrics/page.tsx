"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  Search,
  ClipboardList,
  ExternalLink,
} from "lucide-react";
import { useToast, ToastProvider } from "@/components/ui/toast-provider";
import { RubricEditorDialog } from "@/components/rubric-editor-dialog";
import { Sidebar } from "@/components/ui/sidebar";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Rubric } from "@/db";

function RubricsPageContent() {
  const { addToast } = useToast();
  const [rubricsList, setRubricsList] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rubricToDelete, setRubricToDelete] = useState<Rubric | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadRubrics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/rubrics");
      if (!response.ok) throw new Error("Failed to load rubrics");
      const result = await response.json();
      const data = result.data;

      if (Array.isArray(data)) {
        setRubricsList(data);
      } else {
        console.error("Rubrics data is not an array:", data);
        setRubricsList([]);
      }
    } catch {
      addToast("Failed to load rubrics", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadRubrics();
  }, [loadRubrics]);

  const handleCreate = () => {
    setSelectedRubric(null);
    setDialogOpen(true);
  };

  const handleEdit = (rubric: Rubric) => {
    setSelectedRubric(rubric);
    setDialogOpen(true);
  };

  const handleSave = async (rubricData: Partial<Rubric>) => {
    setIsSaving(true);
    try {
      const url = rubricData.id ? `/api/rubrics/${rubricData.id}` : "/api/rubrics";
      const method = rubricData.id ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rubricData),
      });

      if (!response.ok) throw new Error("Failed to save rubric");

      addToast(
        `Rubric ${rubricData.id ? "updated" : "created"} successfully`,
        "success",
      );

      setDialogOpen(false);
      loadRubrics();
    } catch {
      addToast("Failed to save rubric", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteDialog = (rubric: Rubric) => {
    setRubricToDelete(rubric);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!rubricToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/rubrics/${rubricToDelete.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete rubric");

      addToast("Rubric deleted successfully", "success");
      loadRubrics();
    } catch {
      addToast("Failed to delete rubric", "error");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setRubricToDelete(null);
    }
  };

  const filteredRubrics = rubricsList.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description?.toLowerCase() ?? "").includes(searchQuery.toLowerCase()),
  );

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
        <div className="p-8 space-y-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Rubrics</h1>
              <p className="text-muted-foreground">
                Manage evaluation rubrics for judging agent performance.
              </p>
            </div>
            <Button onClick={handleCreate} className="gap-2">
              <Plus size={16} />
              Create Rubric
            </Button>
          </div>

          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search rubrics..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="w-full table-fixed">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-48 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      Name
                    </TableHead>
                    <TableHead className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      Description
                    </TableHead>
                    <TableHead className="w-24 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      Dimensions
                    </TableHead>
                    <TableHead className="w-28 text-right font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && rubricsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredRubrics.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No rubrics found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRubrics.map((rubric) => (
                      <TableRow
                        key={rubric.id}
                        className="group hover:bg-muted/20 transition-colors"
                      >
                        <TableCell className="py-4">
                          <Link
                            href={`/rubrics/${rubric.id}`}
                            className="font-medium text-sm hover:text-primary transition-colors inline-flex items-center gap-1 group/link"
                            title={rubric.name}
                          >
                            <span className="truncate max-w-[180px]">{rubric.name}</span>
                            <ExternalLink size={12} className="shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity text-muted-foreground" />
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div
                            className="text-[11px] text-muted-foreground line-clamp-2"
                            title={rubric.description || ""}
                          >
                            {rubric.description || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] px-1.5 py-0 h-5 bg-background/50"
                          >
                            {rubric.dimensions?.length ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                              onClick={() => handleEdit(rubric)}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => openDeleteDialog(rubric)}
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
        </div>
      </main>

      <RubricEditorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rubric={selectedRubric}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-destructive" />
              Delete Rubric
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{rubricToDelete?.name}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
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

export default function RubricsPage() {
  return (
    <ToastProvider>
      <RubricsPageContent />
    </ToastProvider>
  );
}