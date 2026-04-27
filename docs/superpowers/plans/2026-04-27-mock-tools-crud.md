# Mock Tools CRUD Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full CRUD page at `/mock-tools` for managing mock tool overrides, following the table + dialog pattern used by `/skills`, while removing the deprecated `/tools` page and API.

**Architecture:** A single Next.js client page (`src/app/mock-tools/page.tsx`) fetches data from the existing `/api/mock-tools` endpoint. Create/edit opens a shared dialog component (`src/components/mock-tool-editor-dialog.tsx`) with a form for all `mockTools` schema fields. Delete triggers a shadcn `DeleteConfirmDialog`. No server-side logic changes are needed — the API is already fully built.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, Lucide React.

---

## File Structure

| File | Action | Responsibility |
|------|--------|--------------|
| `src/components/mock-tool-editor-dialog.tsx` | Create | Dialog form for creating/editing mock tools |
| `src/app/mock-tools/page.tsx` | Create | CRUD page with table, search, create/edit/delete actions |
| `src/components/ui/sidebar.tsx` | Modify | Add `/mock-tools` nav item; remove `/tools` nav item |
| `src/app/tools/page.tsx` | Delete | Deprecated read-only tools page |
| `src/app/api/tools/route.ts` | Delete | Deprecated tools API route |

---

### Task 1: Create `MockToolEditorDialog` component

**Files:**
- Create: `src/components/mock-tool-editor-dialog.tsx`

- [ ] **Step 1: Create the dialog component file**

```tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { MockTool } from "@/db";

interface MockToolEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mockTool: (MockTool & { content?: string }) | null;
  onSave: (data: Partial<MockTool> & { content?: string }) => Promise<void>;
  isSaving: boolean;
}

export function MockToolEditorDialog({
  open,
  onOpenChange,
  mockTool,
  onSave,
  isSaving,
}: MockToolEditorDialogProps) {
  const [formData, setFormData] = useState<Partial<MockTool>>({});
  const [jsonErrors, setJsonErrors] = useState<{
    inputSchema?: string;
    mockFixedResponse?: string;
  }>({});

  useEffect(() => {
    if (open) {
      setFormData(
        mockTool
          ? {
              id: mockTool.id,
              toolId: mockTool.toolId,
              name: mockTool.name,
              description: mockTool.description,
              inputSchema: mockTool.inputSchema,
              mockMode: mockTool.mockMode,
              mockFixedResponse: mockTool.mockFixedResponse,
              mockSimulationPrompt: mockTool.mockSimulationPrompt,
              mockSimulationModel: mockTool.mockSimulationModel,
            }
          : {
              toolId: "",
              name: "",
              description: "",
              inputSchema: [],
              mockMode: "fixed",
              mockFixedResponse: undefined,
              mockSimulationPrompt: "",
              mockSimulationModel: "",
            },
      );
      setJsonErrors({});
    }
  }, [open, mockTool]);

  const validateJson = (value: string, field: "inputSchema" | "mockFixedResponse"): boolean => {
    if (!value.trim()) {
      setJsonErrors((prev) => ({ ...prev, [field]: undefined }));
      return true;
    }
    try {
      JSON.parse(value);
      setJsonErrors((prev) => ({ ...prev, [field]: undefined }));
      return true;
    } catch {
      setJsonErrors((prev) => ({ ...prev, [field]: "Invalid JSON" }));
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.toolId || !formData.name || !formData.mockMode) {
      return;
    }

    const inputSchemaValid = validateJson(
      JSON.stringify(formData.inputSchema ?? []),
      "inputSchema",
    );
    const fixedResponseValid =
      formData.mockMode !== "fixed" ||
      validateJson(
        JSON.stringify(formData.mockFixedResponse ?? {}),
        "mockFixedResponse",
      );

    if (!inputSchemaValid || !fixedResponseValid) return;

    await onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mockTool ? "Edit Mock Tool" : "Create Mock Tool"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="toolId">Tool ID *</Label>
            <input
              id="toolId"
              type="text"
              required
              value={formData.toolId ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, toolId: e.target.value }))
              }
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!!mockTool}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <input
              id="name"
              type="text"
              required
              value={formData.name ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={3}
              value={formData.description ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inputSchema">Input Schema (JSON)</Label>
            <textarea
              id="inputSchema"
              rows={4}
              value={JSON.stringify(formData.inputSchema ?? [], null, 2)}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  inputSchema: e.target.value,
                }));
                validateJson(e.target.value, "inputSchema");
              }}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            />
            {jsonErrors.inputSchema && (
              <p className="text-xs text-destructive">
                {jsonErrors.inputSchema}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Mock Mode *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mockMode"
                  value="fixed"
                  checked={formData.mockMode === "fixed"}
                  onChange={() =>
                    setFormData((prev) => ({ ...prev, mockMode: "fixed" }))
                  }
                />
                Fixed Response
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mockMode"
                  value="llm_simulated"
                  checked={formData.mockMode === "llm_simulated"}
                  onChange={() =>
                    setFormData((prev) => ({
                      ...prev,
                      mockMode: "llm_simulated",
                    }))
                  }
                />
                LLM Simulated
              </label>
            </div>
          </div>

          {formData.mockMode === "fixed" && (
            <div className="space-y-2">
              <Label htmlFor="mockFixedResponse">Mock Fixed Response (JSON)</Label>
              <textarea
                id="mockFixedResponse"
                rows={4}
                value={
                  formData.mockFixedResponse
                    ? JSON.stringify(formData.mockFixedResponse, null, 2)
                    : ""
                }
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    mockFixedResponse: e.target.value,
                  }));
                  validateJson(e.target.value, "mockFixedResponse");
                }}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              />
              {jsonErrors.mockFixedResponse && (
                <p className="text-xs text-destructive">
                  {jsonErrors.mockFixedResponse}
                </p>
              )}
            </div>
          )}

          {formData.mockMode === "llm_simulated" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="mockSimulationPrompt">
                  Simulation Prompt
                </Label>
                <textarea
                  id="mockSimulationPrompt"
                  rows={4}
                  value={formData.mockSimulationPrompt ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      mockSimulationPrompt: e.target.value,
                    }))
                  }
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mockSimulationModel">Simulation Model</Label>
                <input
                  id="mockSimulationModel"
                  type="text"
                  value={formData.mockSimulationModel ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      mockSimulationModel: e.target.value,
                    }))
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mockTool ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify the component file was created**

Run: `ls src/components/mock-tool-editor-dialog.tsx`
Expected: file exists

- [ ] **Step 3: Commit**

```bash
git add src/components/mock-tool-editor-dialog.tsx
git commit -m "feat: add MockToolEditorDialog component"
```

---

### Task 2: Create `/mock-tools` page

**Files:**
- Create: `src/app/mock-tools/page.tsx`

- [ ] **Step 1: Create the page file**

```tsx
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  Search,
  Wrench,
} from "lucide-react";
import { useToast, ToastProvider } from "@/components/ui/toast-provider";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { MockToolEditorDialog } from "@/components/mock-tool-editor-dialog";
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

  const loadMockTools = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/mock-tools");
      if (!response.ok) throw new Error("Failed to load mock tools");
      const rawData = await response.json();
      const data = Array.isArray(rawData) ? rawData : rawData.data;
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
      const url = mockToolData.id
        ? `/api/mock-tools/${mockToolData.id}`
        : "/api/mock-tools";
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

  const handleDeleteClick = (mockTool: MockTool) => {
    setMockToolToDelete(mockTool);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!mockToolToDelete) return;
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
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wrench size={20} strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Mock Tools
                </h1>
                <p className="text-muted-foreground">
                  Manage mock tool overrides for Mastra agents.
                </p>
              </div>
            </div>
            <Button onClick={handleCreate} className="gap-2">
              <Plus size={16} />
              Create Mock Tool
            </Button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search mock tools..."
                className="pl-8 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      Tool ID
                    </TableHead>
                    <TableHead className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      Name
                    </TableHead>
                    <TableHead className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      Mode
                    </TableHead>
                    <TableHead className="w-[35%] font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      Description
                    </TableHead>
                    <TableHead className="w-24 text-right font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
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
                          <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
                            {mockTool.toolId}
                          </code>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="font-medium text-sm">
                            {mockTool.name}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="text-xs uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            {mockTool.mockMode}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="text-sm text-muted-foreground whitespace-normal line-clamp-2">
                            {mockTool.description || "—"}
                          </span>
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
                              onClick={() => handleDeleteClick(mockTool)}
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

          {!loading && mockTools.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing {filteredMockTools.length} of {mockTools.length} mock
              tool{mockTools.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </main>

      {/* Editor Dialog */}
      <MockToolEditorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mockTool={selectedMockTool}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Mock Tool?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {mockToolToDelete?.name}
              </span>
              ? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isSaving}
            >
              {isSaving && (
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
```

- [ ] **Step 2: Verify the page file was created**

Run: `ls src/app/mock-tools/page.tsx`
Expected: file exists

- [ ] **Step 3: Commit**

```bash
git add src/app/mock-tools/page.tsx
git commit -m "feat: add mock-tools CRUD page"
```

---

### Task 3: Update sidebar navigation

**Files:**
- Modify: `src/components/ui/sidebar.tsx`

- [ ] **Step 1: Replace the `buildItems` array in `sidebar.tsx`**

Find the `buildItems` array (around line 32–58) and replace it with:

```tsx
const buildItems = [
  {
    href: "/scenario-builder",
    label: "Scenario Builder",
    icon: <LayoutDashboard size={18} strokeWidth={2} />,
  },
  {
    href: "/scenarios",
    label: "Scenarios",
    icon: <Save size={18} strokeWidth={2} />,
  },
  {
    href: "/agents",
    label: "Agents",
    icon: <Users size={18} strokeWidth={2} />,
  },
  {
    href: "/skills",
    label: "Skills",
    icon: <Settings size={18} strokeWidth={2} />,
  },
  {
    href: "/mock-tools",
    label: "Mock Tools",
    icon: <Wrench size={18} strokeWidth={2} />,
  },
  {
    href: "/s3-workspace",
    label: "S3 Workspace",
    icon: <Cloud size={18} strokeWidth={2} />,
  },
];
```

This adds the `/mock-tools` nav item (using the existing `Wrench` icon) and removes the old `/tools` entry.

- [ ] **Step 2: Verify the sidebar renders without errors**

Run: `cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground && pnpm tsc --noEmit`
Expected: TypeScript compilation succeeds (no errors in `sidebar.tsx`)

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/sidebar.tsx
git commit -m "feat: add /mock-tools to sidebar nav, remove /tools"
```

---

### Task 4: Remove deprecated `/tools` page and API

**Files:**
- Delete: `src/app/tools/page.tsx`
- Delete: `src/app/api/tools/route.ts`

- [ ] **Step 1: Delete the deprecated files**

```bash
git rm src/app/tools/page.tsx src/app/api/tools/route.ts
```

- [ ] **Step 2: Verify files are removed**

Run: `ls src/app/tools/page.tsx src/app/api/tools/route.ts`
Expected: `No such file or directory` for both

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove deprecated /tools page and API"
```

---

### Task 5: End-to-end verification

**Files:**
- No files created or modified

- [ ] **Step 1: Build the project**

Run: `cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground && pnpm build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Start the dev server and manually verify**

Run: `cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground && pnpm dev`
Then open `http://localhost:3000/mock-tools` in a browser.

Verify:
1. The `/mock-tools` page loads and shows the table.
2. The sidebar shows "Mock Tools" under the Build section.
3. The sidebar does **not** show a "Tools" entry.
4. Clicking "Create Mock Tool" opens the dialog with all fields.
5. Creating a mock tool with mode "fixed" shows the JSON response field.
6. Creating a mock tool with mode "llm_simulated" shows prompt + model fields.
7. Searching filters the table.
8. Editing a mock tool opens the dialog pre-filled.
9. Deleting a mock tool shows the shadcn confirmation dialog.
10. The old `/tools` route returns a 404.

- [ ] **Step 3: Commit (if any fixes were needed)**

If fixes were made during verification, commit them:

```bash
git add -A
git commit -m "fix: address mock-tools page verification issues"
```

---

## Self-Review

**1. Spec coverage:**
- Table + dialog CRUD pattern: ✅ Task 1, Task 2
- Search/filter: ✅ Task 2
- Delete confirmation dialog (shadcn, not browser `confirm`): ✅ Task 2
- Remove deprecated `/tools` page and API: ✅ Task 4
- Update sidebar navigation: ✅ Task 3
- Max-width layout (`max-w-7xl mx-auto`): ✅ Task 2
- Consistent with `/skills` pattern: ✅ Task 2 mirrors `/skills/page.tsx`

**2. Placeholder scan:** No TBDs, TODOs, vague requirements, or "similar to Task N" references found.

**3. Type consistency:**
- `MockToolEditorDialogProps` uses `Partial<MockTool> & { content?: string }` to match the `SkillEditorDialog` pattern.
- `handleSave` in the page accepts `Partial<MockTool>` which aligns with the dialog's `onSave` signature.
- Field names (`toolId`, `name`, `description`, `inputSchema`, `mockMode`, `mockFixedResponse`, `mockSimulationPrompt`, `mockSimulationModel`) match the `mockTools` Drizzle schema exactly.

**4. Gaps:** None identified.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-27-mock-tools-crud.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints for review.

Which approach would you like?