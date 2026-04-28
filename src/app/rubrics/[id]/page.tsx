"use client";

import * as React from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChevronLeft,
  Edit,
  Trash2,
  Loader2,
  GripVertical,
  Target,
  Hash,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { useToast, ToastProvider } from "@/components/ui/toast-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { RubricEditorDialog } from "@/components/rubric-editor-dialog";
import type { Rubric } from "@/db";

function RubricDetailContent({ id }: { id: string }) {
  const { addToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [rubric, setRubric] = React.useState<Rubric | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editOpen, setEditOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchRubric = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/rubrics/${id}`);
      if (!res.ok) {
        setRubric(null);
        return;
      }
      const data = await res.json();
      setRubric(data);
    } catch {
      setRubric(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchRubric();
  }, [fetchRubric]);

  const handleSave = async (rubricData: Partial<Rubric>) => {
    setIsSaving(true);
    try {
      const url = `/api/rubrics/${id}`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rubricData),
      });

      if (!response.ok) throw new Error("Failed to save rubric");

      addToast("Rubric updated successfully", "success");
      setEditOpen(false);
      fetchRubric();
    } catch {
      addToast("Failed to save rubric", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/rubrics/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete rubric");
      addToast("Rubric deleted successfully", "success");
    } catch {
      addToast("Failed to delete rubric", "error");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading rubric...
        </div>
      </div>
    );
  }

  if (!rubric) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">Rubric not found.</p>
          <Link href="/rubrics">
            <Button variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Rubrics
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const dimensions = Array.isArray(rubric.dimensions) ? rubric.dimensions : [];

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
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <Link href="/rubrics">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="font-serif text-2xl font-bold tracking-tight">
                    {rubric.name}
                  </h1>
                  {rubric.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {rubric.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
                className="gap-1.5"
              >
                <Edit size={14} />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="gap-1.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              >
                <Trash2 size={14} />
                Delete
              </Button>
            </div>
          </div>

          {/* Metadata bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Hash className="h-3.5 w-3.5" />
              <span>{dimensions.length} dimension{dimensions.length !== 1 ? "s" : ""}</span>
            </div>
            {rubric.passingThreshold != null && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                <span>Passing threshold: {String(rubric.passingThreshold)}%</span>
              </div>
            )}
          </div>

          {/* Dimensions */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">Dimensions</h2>
            {dimensions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No dimensions defined for this rubric.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {dimensions.map((dim, index) => (
                  <Card
                    key={index}
                    className="group hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <GripVertical
                            size={14}
                            className="text-muted-foreground/40 shrink-0"
                          />
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-mono shrink-0"
                          >
                            #{index + 1}
                          </Badge>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono shrink-0"
                        >
                          weight: {dim.weight}
                        </Badge>
                      </div>
                      <CardTitle className="text-base mt-2">
                        {dim.name}
                      </CardTitle>
                      {dim.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {dim.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {dim.scale && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Scale className="h-3 w-3" />
                          <span>
                            Scale: {dim.scale.min} – {dim.scale.max}
                          </span>
                        </div>
                      )}
                      {dim.scoringCriteria && (
                        <div className="rounded-md bg-muted/50 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            Scoring Criteria
                          </p>
                          <p className="text-xs whitespace-pre-wrap">
                            {dim.scoringCriteria}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit Dialog */}
      <RubricEditorDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        rubric={rubric}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Rubric
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{rubric.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
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

export default function RubricDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  return (
    <ToastProvider>
      <RubricDetailContent id={id} />
    </ToastProvider>
  );
}
