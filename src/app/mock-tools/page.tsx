"use client";

import { useState, useEffect } from "react";
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
  Wrench,
} from "lucide-react";
import { useToast, ToastProvider } from "@/components/ui/toast-provider";
import { MockToolEditorDialog } from "@/components/mock-tool-editor-dialog";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { MockTool } from "@/db";

function MockToolsPageContent() {
  const { addToast } = useToast();
  const [mockTools, setMockTools] = useState<MockTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMockTool, setSelectedMockTool] = useState<MockTool | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mockToolToDelete, setMockToolToDelete] = useState<MockTool | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadMockTools = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/mock-tools");
      if (!response.ok) throw new Error("Failed to load mock tools");
      const result = await response.json();
      const data = result.data;

      if (Array.isArray(data)) {
        setMockTools(data);
      } else {
        console.error("Mock tools data is not an array:", data);
        setMockTools([]);
      }
    } catch {
      addToast("Failed to load mock tools", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMockTools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = () => {
    setSelectedMockTool(null);
    setDialogOpen(true);
  };

  const handleEdit = (mockTool: MockTool) => {
    setSelectedMockTool(mockTool);
    setDialogOpen(true);
  };

  const handleSave = async (mockToolData: Partial<MockTool>) => {
    setIsSaving(true);
    try {
      const url = mockToolData.id ? `/api/mock-tools/${mockToolData.id}` : "/api/mock-tools";
      const method = mockToolData.id ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockToolData),
      });

      if (!response.ok) throw new Error("Failed to save mock tool");

      addToast(
        `Mock tool ${mockToolData.id ? "updated" : "created"} successfully`,
        "success",
      );

      setDialogOpen(false);
      loadMockTools();
    } catch {
      addToast("Failed to save mock tool", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteDialog = (mockTool: MockTool) => {
    setMockToolToDelete(mockTool);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!mockToolToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/mock-tools/${mockToolToDelete.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete mock tool");

      addToast("Mock tool deleted successfully", "success");
      loadMockTools();
    } catch {
      addToast("Failed to delete mock tool", "error");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setMockToolToDelete(null);
    }
  };

  const filteredMockTools = mockTools.filter(
    (mt) =>
      mt.toolId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mt.description?.toLowerCase().includes(searchQuery.toLowerCase()),
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
              <h1 className="text-3xl font-bold tracking-tight">Mock Tools</h1>
              <p className="text-muted-foreground">
                Manage mock tool overrides for Mastra agents.
              </p>
            </div>
            <Button onClick={handleCreate} className="gap-2">
              <Plus size={16} />
              Create Mock Tool
            </Button>
          </div>

          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search mock tools..."
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
                    <TableHead className="w-48 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      Tool ID
                    </TableHead>
                    <TableHead className="w-40 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      Name
                    </TableHead>
                    <TableHead className="w-28 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      Mode
                    </TableHead>
                    <TableHead className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      Description
                    </TableHead>
                    <TableHead className="w-28 text-right font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && mockTools.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredMockTools.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No mock tools found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMockTools.map((mockTool) => (
                      <TableRow
                        key={mockTool.id}
                        className="group hover:bg-muted/20 transition-colors"
                      >
                        <TableCell className="py-4">
                          <code className="text-[11px] font-mono bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">
                            {mockTool.toolId}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div
                            className="font-medium text-sm truncate"
                            title={mockTool.name}
                          >
                            {mockTool.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] px-1.5 py-0 h-5 bg-background/50"
                          >
                            {mockTool.mockMode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div
                            className="text-[11px] text-muted-foreground line-clamp-2"
                            title={mockTool.description || ""}
                          >
                            {mockTool.description || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                              onClick={() => handleEdit(mockTool)}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => openDeleteDialog(mockTool)}
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

      <MockToolEditorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mockTool={selectedMockTool}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-destructive" />
              Delete Mock Tool
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{mockToolToDelete?.name}</strong>?
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

export default function MockToolsPage() {
  return (
    <ToastProvider>
      <MockToolsPageContent />
    </ToastProvider>
  );
}
