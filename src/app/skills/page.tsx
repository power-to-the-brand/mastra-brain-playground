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
  Plus,
  Edit,
  Trash2,
  Loader2,
  ExternalLink,
  Search,
} from "lucide-react";
import { useToast, ToastProvider } from "@/components/ui/toast-provider";
import { SkillEditorDialog } from "@/components/skill-editor-dialog";
import { SkillFileManager } from "@/components/skill-file-manager";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { Skill } from "@/db";

function SkillsPageContent() {
  const { addToast } = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<(Skill & { content?: string }) | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/skills");
      if (!response.ok) throw new Error("Failed to load skills");
      const rawData = await response.json();
      const data = Array.isArray(rawData) ? rawData : rawData.data;
      
      if (Array.isArray(data)) {
        setSkills(data);
      } else {
        console.error("Skills data is not an array:", data);
        setSkills([]);
      }
    } catch {
      addToast("Failed to load skills", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = () => {
    setSelectedSkill(null);
    setDialogOpen(true);
  };

  const handleEdit = async (skill: Skill) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/skills/${skill.id}`);
      if (!response.ok) throw new Error("Failed to fetch skill details");
      const data = await response.json();
      setSelectedSkill(data);
      setDialogOpen(true);
    } catch {
      addToast("Failed to fetch skill details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (skillData: Partial<Skill> & { content?: string }) => {
    setIsSaving(true);
    try {
      const url = skillData.id ? `/api/skills/${skillData.id}` : "/api/skills";
      const method = skillData.id ? "PATCH" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(skillData),
      });

      if (!response.ok) throw new Error("Failed to save skill");

      addToast(`Skill ${skillData.id ? "updated" : "created"} successfully`, "success");
      
      setDialogOpen(false);
      loadSkills();
    } catch {
      addToast("Failed to save skill", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this skill? This will also remove the file from S3.")) return;

    try {
      const response = await fetch(`/api/skills/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete skill");

      addToast("Skill deleted successfully", "success");
      loadSkills();
    } catch {
      addToast("Failed to delete skill", "error");
    }
  };

  const filteredSkills = skills.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
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
        <SkillFileManager>
          <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Skills Management</h1>
              <p className="text-muted-foreground">
                Manage dynamic skills stored in S3 for Mastra agents.
              </p>
            </div>
            <Button onClick={handleCreate} className="gap-2">
              <Plus size={16} />
              Create Skill
            </Button>
          </div>

          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search skills..."
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
                    <TableHead className="w-20 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Version</TableHead>
                    <TableHead className="w-55 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Tags</TableHead>
                    <TableHead className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">S3 Location</TableHead>
                    <TableHead className="w-25 text-right font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && skills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredSkills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No skills found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSkills.map((skill) => (
                      <TableRow key={skill.id} className="group hover:bg-muted/20 transition-colors">
                        <TableCell className="py-4">
                          <div className="font-medium text-sm truncate" title={skill.name}>{skill.name}</div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5" title={skill.description || ""}>
                            {skill.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-5 bg-background/50">
                            {skill.version}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-h-10 overflow-y-auto scrollbar-hide">
                            {skill.tags?.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-primary/5 text-primary border-primary/10">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono bg-muted/30 px-2 py-1 rounded border border-border/50 w-fit max-w-full">
                            <ExternalLink size={10} className="shrink-0 opacity-50" />
                            <span className="truncate" title={skill.s3Location}>{skill.s3Location}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                              onClick={() => handleEdit(skill)}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDelete(skill.id)}
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
        </SkillFileManager>
      </main>

      <SkillEditorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        skill={selectedSkill}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}

export default function SkillsPage() {
  return (
    <ToastProvider>
      <SkillsPageContent />
    </ToastProvider>
  );
}
