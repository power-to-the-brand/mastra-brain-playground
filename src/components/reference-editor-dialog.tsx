"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Eye, Edit3 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { Reference } from "@/db";

interface ReferenceEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reference: (Reference & { content?: string }) | null;
  onSave: (data: Partial<Reference> & { content?: string }) => Promise<void>;
  isSaving?: boolean;
}

export function ReferenceEditorDialog({
  open,
  onOpenChange,
  reference,
  onSave,
  isSaving,
}: ReferenceEditorDialogProps) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [content, setContent] = React.useState("");
  const [previewMode, setPreviewMode] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(reference?.name ?? "");
      setDescription(reference?.description ?? "");
      setContent(reference?.content ?? "");
      setPreviewMode(false);
    }
  }, [open, reference]);

  const handleSave = async () => {
    await onSave({
      id: reference?.id,
      name,
      description,
      content,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="px-8 py-6 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-serif text-xl tracking-tight">
              {reference?.id ? "Edit Reference" : "Create New Reference"}
            </DialogTitle>
            <div className="flex items-center gap-2 pr-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
                className={cn(
                  "gap-2 h-8 px-3 transition-all",
                  previewMode ? "bg-primary/10 text-primary hover:bg-primary/20" : "hover:bg-muted"
                )}
              >
                {previewMode ? <Edit3 size={14} /> : <Eye size={14} />}
                {previewMode ? "Switch to Editor" : "Live Preview"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          <div className="px-8 py-4 space-y-4 border-b">
            <div>
              <label className="text-sm font-medium">Filename</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., target-set"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this reference..."
                className="mt-1 min-h-15"
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {previewMode ? (
              <div className="h-full overflow-y-auto p-10 bg-card/30">
                <div className="max-w-5xl mx-auto prose prose-stone dark:prose-invert prose-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content || "*No content yet*"}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="# Write your reference content here..."
                  className="flex-1 w-full p-8 font-mono text-sm resize-none border-none focus-visible:ring-0 bg-transparent leading-relaxed"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-8 py-6 border-t bg-muted/20 flex items-center justify-between sm:justify-between">
          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest opacity-50">
            Markdown
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-10 px-6">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !name.trim() || !content.trim()}
              className="h-10 px-8 shadow-lg shadow-primary/10 transition-all hover:shadow-primary/20 active:scale-95"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
