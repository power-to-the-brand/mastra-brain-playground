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
import { Loader2, Save, Eye, Edit3, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import matter from "gray-matter";
import { cn } from "@/lib/utils";
import { TreeNode } from "@/lib/s3";

interface Skill {
  id?: string;
  name: string;
  description: string | null;
  version: string;
  tags: string[] | null;
  content?: string;
  s3Location?: string;
}

interface SkillEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: Skill | null;
  onSave: (skill: Skill) => Promise<void>;
  isSaving?: boolean;
}

const DEFAULT_TEMPLATE = `---
name: New Skill
description: Description of what this skill does
version: 1.0.0
tags: 
    - example
    - sample 2
---

# New Skill

Write your skill content here...`;

export function SkillEditorDialog({
  open,
  onOpenChange,
  skill,
  onSave,
  isSaving,
}: SkillEditorDialogProps) {
  const [content, setContent] = React.useState("");
  const [previewMode, setPreviewMode] = React.useState(false);
  const [siblingFiles, setSiblingFiles] = React.useState<TreeNode[]>([]);
  const folderPrefix = skill?.s3Location?.replace(/SKILL\.md$/, '');

  React.useEffect(() => {
    if (open) {
      if (skill) {
        // If we have a skill, we need to reconstruct the markdown with frontmatter
        // if it doesn't already have it (though it should if we're moving to this pattern)
        const hasFrontmatter = skill.content?.trim().startsWith("---");

        if (hasFrontmatter) {
          setContent(skill.content || "");
        } else {
          const frontmatter = {
            name: skill.name,
            description: skill.description,
            version: skill.version,
            tags: skill.tags,
          };
          const reconstructed = matter.stringify(skill.content || "", frontmatter);
          setContent(reconstructed);
        }
      } else {
        setContent(DEFAULT_TEMPLATE);
      }
    }
  }, [skill, open]);

  React.useEffect(() => {
    if (open && folderPrefix) {
      fetch(`/api/s3/tree?prefix=${encodeURIComponent(folderPrefix)}`)
        .then(res => res.json())
        .then(data => {
          const siblings = [
            ...(data.folders || []),
            ...(data.files || []).filter((f: TreeNode) => f.name !== 'SKILL.md'),
          ];
          setSiblingFiles(siblings);
        })
        .catch(err => console.error('Failed to load sibling files:', err));
    }
  }, [open, folderPrefix]);

  const handleSave = async () => {
    try {
      const parsed = matter(content);
      const { data } = parsed;

      const skillData: Skill = {
        ...skill,
        name: data.name || "Untitled Skill",
        description: data.description || "",
        version: data.version || "1.0.0",
        tags: Array.isArray(data.tags) ? data.tags : [],
        content: content, // We save the full content including frontmatter
      };

      await onSave(skillData);
    } catch (err) {
      console.error("Failed to parse frontmatter", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="px-8 py-6 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-serif text-xl tracking-tight">
              {skill?.id ? "Edit Skill" : "Create New Skill"}
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

        <div className="flex-1 flex overflow-hidden bg-background">
          {folderPrefix && (
            <div className="w-48 border-r border-border/50 p-3 overflow-y-auto bg-muted/10">
              <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Files</div>
              {siblingFiles.map((file) => (
                <div key={file.prefix} className="text-sm py-1.5 px-2 rounded hover:bg-accent cursor-pointer truncate">
                  {file.name}
                </div>
              ))}
              {siblingFiles.length === 0 && (
                <div className="text-xs text-muted-foreground px-2">No other files</div>
              )}
            </div>
          )}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-8 py-3 bg-muted/10 border-b text-[11px] text-muted-foreground">
              <Info size={12} className="text-primary/60" />
              <span>Metadata (name, description, tags) is automatically extracted from the YAML frontmatter block at the top.</span>
            </div>

            <div className="flex-1 overflow-hidden relative">
              {previewMode ? (
                <div className="h-full overflow-y-auto p-10 bg-card/30">
                  <div className="max-w-5xl mx-auto prose prose-stone dark:prose-invert prose-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {matter(content).content || "*No content yet*"}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="flex-1 w-full p-8 font-mono text-sm resize-none border-none focus-visible:ring-0 bg-transparent leading-relaxed"
                    placeholder={DEFAULT_TEMPLATE}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-8 py-6 border-t bg-muted/20 flex items-center justify-between sm:justify-between">
          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest opacity-50">
            Markdown + YAML Frontmatter
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-10 px-6">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !content.trim()}
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
