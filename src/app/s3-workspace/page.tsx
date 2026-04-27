"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileTree } from "@/components/file-tree";
import { ConvertDialog } from "@/components/s3-workspace/convert-dialog";
import { ConversionResults, ConversionResult } from "@/components/s3-workspace/conversion-results";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ToastProvider, useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";
import { Loader2, Wand2, Pencil, Save, X } from "lucide-react";
import type { TreeNode } from "@/lib/s3";

function S3WorkspacePageContent() {
  const { addToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [results, setResults] = useState<ConversionResult[] | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const maxFiles = 10;

  const isMarkdownFile = (key: string | null) => {
    if (!key) return false;
    const lower = key.toLowerCase();
    return lower.endsWith(".md") || lower.endsWith(".mdx");
  };

  const handleToggleSelect = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        if (next.size >= maxFiles) {
          addToast(`Maximum ${maxFiles} files can be selected`, "error");
          return prev;
        }
        next.add(key);
      }
      return next;
    });
  }, [addToast]);

  const handleSelectFile = useCallback(async (node: TreeNode) => {
    setPreviewKey(node.prefix);
    setPreviewContent(null);
    setPreviewLoading(true);
    setIsEditing(false);
    setEditContent("");
    try {
      const res = await fetch(`/api/s3/preview?key=${encodeURIComponent(node.prefix)}`);
      if (!res.ok) throw new Error("Failed to fetch preview");
      const data = await res.json();
      setPreviewContent(data.content ?? "");
    } catch {
      setPreviewContent("Failed to load preview.");
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      setIsEditing(false);
      setEditContent("");
    } else {
      setEditContent(previewContent ?? "");
      setIsEditing(true);
    }
  }, [isEditing, previewContent]);

  const handleSave = useCallback(async () => {
    if (!previewKey) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/s3/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: previewKey, content: editContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setPreviewContent(editContent);
      setIsEditing(false);
      setEditContent("");
      addToast("File saved successfully", "success");
    } catch (err: any) {
      addToast(err.message || "Save failed", "error");
    } finally {
      setIsSaving(false);
    }
  }, [previewKey, editContent, addToast]);

  const handleConvert = useCallback(async (model: string) => {
    setIsConverting(true);
    setResults(null);
    try {
      const res = await fetch("/api/s3-workspace/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKeys: Array.from(selectedKeys), model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Conversion failed");
      setResults(data.results);
      const successCount = data.results.filter((r: ConversionResult) => r.success).length;
      addToast(`Created ${successCount} mock tool${successCount !== 1 ? "s" : ""}`, "success");
    } catch (err: any) {
      addToast(err.message || "Conversion failed", "error");
    } finally {
      setIsConverting(false);
      setConvertDialogOpen(false);
    }
  }, [selectedKeys, addToast]);

  const selectedArray = Array.from(selectedKeys);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className={cn("ml-0 transition-all duration-300", sidebarCollapsed ? "sm:ml-20" : "sm:ml-64")}>
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">S3 Workspace</h1>
              <p className="text-muted-foreground">
                Browse S3 files and convert them into mock tools.
              </p>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="flex h-[calc(100vh-200px)] gap-4">
            {/* File Tree */}
            <div className="w-80 shrink-0">
              <FileTree
                rootPrefix="playground/"
                selectable
                selectedKeys={selectedKeys}
                onToggleSelect={handleToggleSelect}
                onSelectFile={handleSelectFile}
              />
            </div>

            {/* Preview & Actions */}
            <div className="flex-1 flex flex-col gap-4">
              {/* Preview Pane */}
              <div className="flex-1 border rounded-lg bg-card/50 overflow-hidden flex flex-col">
                {/* Preview Header */}
                {previewKey && (
                  <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                    <div className="text-xs font-mono text-muted-foreground truncate">
                      {previewKey}
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-muted-foreground hover:text-foreground"
                            onClick={handleEditToggle}
                            disabled={isSaving}
                          >
                            <X className="h-3.5 w-3.5" />
                            Cancel
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="gap-1"
                            onClick={handleSave}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                            Save
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-muted-foreground hover:text-foreground"
                          onClick={handleEditToggle}
                          disabled={previewLoading || previewContent === null}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 p-4 overflow-auto">
                  {previewLoading ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Loading preview...
                    </div>
                  ) : previewContent !== null ? (
                    <div className="h-full">
                      {isEditing ? (
                        <textarea
                          className="w-full h-full resize-none bg-transparent text-sm font-mono text-foreground outline-none border-none p-0 focus:ring-0"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          spellCheck={false}
                        />
                      ) : isMarkdownFile(previewKey) ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {previewContent}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <pre className="text-sm whitespace-pre-wrap font-mono text-foreground">
                          {previewContent}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      Select a file to preview its contents.
                    </div>
                  )}
                </div>
              </div>

              {/* Results */}
              {results && <ConversionResults results={results} />}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm px-6 py-3 z-40">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedArray.length} file{selectedArray.length !== 1 ? "s" : ""} selected
            {selectedArray.length >= maxFiles && (
              <span className="text-destructive ml-2">(max {maxFiles})</span>
            )}
          </div>
          <Button
            onClick={() => setConvertDialogOpen(true)}
            disabled={selectedArray.length === 0 || isConverting}
            className="gap-2"
          >
            {isConverting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Convert to Mock Tools
          </Button>
        </div>
      </div>

      <ConvertDialog
        open={convertDialogOpen}
        fileKeys={selectedArray}
        onOpenChange={setConvertDialogOpen}
        onConfirm={handleConvert}
        isLoading={isConverting}
      />
    </div>
  );
}

export default function S3WorkspacePage() {
  return (
    <ToastProvider>
      <S3WorkspacePageContent />
    </ToastProvider>
  );
}
