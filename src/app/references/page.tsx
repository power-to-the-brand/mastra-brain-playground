"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  ExternalLink,
  Search,
} from "lucide-react";
import { useToast, ToastProvider } from "@/components/ui/toast-provider";
import { ReferenceEditorDialog } from "@/components/reference-editor-dialog";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { Reference } from "@/db";

function ReferencesPageContent() {
  const { addToast } = useToast();
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReference, setSelectedReference] = useState<(Reference & { content?: string }) | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const loadReferences = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/references");
      if (!response.ok) throw new Error("Failed to load references");
      const rawData = await response.json();
      const data = Array.isArray(rawData) ? rawData : rawData.data;
      
      if (Array.isArray(data)) {
        setReferences(data);
      } else {
        console.error("References data is not an array:", data);
        setReferences([]);
      }
    } catch {
      addToast("Failed to load references", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = () => {
    setSelectedReference(null);
    setDialogOpen(true);
  };

  const handleEdit = async (reference: Reference) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/references/${reference.id}`);
      if (!response.ok) throw new Error("Failed to fetch reference details");
      const data = await response.json();
      setSelectedReference(data);
      setDialogOpen(true);
    } catch {
      addToast("Failed to fetch reference details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (referenceData: Partial<Reference> & { content?: string }) => {
    setIsSaving(true);
    try {
      const url = referenceData.id ? `/api/references/${referenceData.id}` : "/api/references";
      const method = referenceData.id ? "PATCH" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(referenceData),
      });

      if (!response.ok) throw new Error("Failed to save reference");

      addToast(`Reference ${referenceData.id ? "updated" : "created"} successfully`, "success");
      
      setDialogOpen(false);
      loadReferences();
    } catch {
      addToast("Failed to save reference", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this reference? This will also remove the file from S3.")) return;

    try {
      const response = await fetch(`/api/references/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete reference");

      addToast("Reference deleted successfully", "success");
      loadReferences();
    } catch {
      addToast("Failed to delete reference", "error");
    }
  };

  const filteredReferences = references.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">References Management</h1>
              <p className="text-muted-foreground">
                Manage reference documents stored in S3 for Mastra agents.
              </p>
            </div>
            <Button onClick={handleCreate} className="gap-2">
              <Plus size={16} />
              Create Reference
            </Button>
          </div>

          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search references..."
                className="pl-8 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                    <TableHead className="w-50 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Name</TableHead>
                    <TableHead className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Description</TableHead>
                    <TableHead className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">S3 Location</TableHead>
                    <TableHead className="w-25 text-right font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && references.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredReferences.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No references found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReferences.map((reference) => (
                      <TableRow key={reference.id} className="group hover:bg-muted/20 transition-colors">
                        <TableCell className="py-4">
                          <div className="font-medium text-sm truncate" title={reference.name}>{reference.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-[11px] text-muted-foreground line-clamp-1" title={reference.description || ""}>
                            {reference.description || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono bg-muted/30 px-2 py-1 rounded border border-border/50 w-fit max-w-full">
                            <ExternalLink size={10} className="shrink-0 opacity-50" />
                            <span className="truncate" title={reference.s3Location}>{reference.s3Location}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                              onClick={() => handleEdit(reference)}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDelete(reference.id)}
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

      <ReferenceEditorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reference={selectedReference}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}

export default function ReferencesPage() {
  return (
    <ToastProvider>
      <ReferencesPageContent />
    </ToastProvider>
  );
}
