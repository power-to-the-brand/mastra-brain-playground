"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";

interface Module {
  id: string;
  name: string;
  description: string | null;
}

interface ModuleManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modules: Module[];
  onModulesChange: () => void;
}

export function ModuleManager({ open, onOpenChange, modules, onModulesChange }: ModuleManagerProps) {
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() || undefined }),
      });
      if (res.ok) {
        setNewName("");
        setNewDescription("");
        onModulesChange();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create module");
      }
    } catch (error) {
      console.error("Error creating module:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/modules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), description: editDescription.trim() || undefined }),
      });
      if (res.ok) {
        setEditingId(null);
        onModulesChange();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update module");
      }
    } catch (error) {
      console.error("Error updating module:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this module? Agents in this module will become uncategorized.")) return;
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/modules/${id}`, { method: "DELETE" });
      if (res.ok) {
        onModulesChange();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete module");
      }
    } catch (error) {
      console.error("Error deleting module:", error);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[28rem] bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Manage Modules</DialogTitle>
          <DialogDescription>
            Create, rename, or delete agent grouping modules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new module */}
          <div className="space-y-2">
            <Label htmlFor="new-module-name">New Module</Label>
            <div className="flex gap-2">
              <Input
                id="new-module-name"
                placeholder="Module name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button onClick={handleCreate} disabled={isCreating || !newName.trim()}>
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            <Textarea
              placeholder="Optional description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Module list */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {modules.length === 0 ? (
              <p className="text-sm text-stone-500 text-center py-4">No modules yet.</p>
            ) : (
              modules.map((mod) => (
                <div
                  key={mod.id}
                  className="flex items-center justify-between p-2 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950"
                >
                  {editingId === mod.id ? (
                    <div className="flex-1 space-y-2 mr-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                      />
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        placeholder="Description"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdate(mod.id)} disabled={isSaving}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{mod.name}</p>
                        {mod.description && (
                          <p className="text-xs text-stone-500 truncate">{mod.description}</p>
                        )}
                      </div>
                      <div className="flex space-x-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingId(mod.id);
                            setEditName(mod.name);
                            setEditDescription(mod.description || "");
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(mod.id)}
                          disabled={isDeleting === mod.id}
                        >
                          {isDeleting === mod.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
