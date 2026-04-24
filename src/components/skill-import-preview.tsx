'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export interface DetectedSkill {
  path: string;
  name: string;
  description: string;
  version: string;
  tags: string[];
}

interface SkillImportPreviewProps {
  open: boolean;
  skills: DetectedSkill[];
  targetPrefix: string;
  onConfirm: (skills: DetectedSkill[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SkillImportPreview({ open, skills, targetPrefix, onConfirm, onCancel, isLoading }: SkillImportPreviewProps) {
  const [editableSkills, setEditableSkills] = useState<DetectedSkill[]>(skills);

  const updateSkill = (index: number, field: keyof DetectedSkill, value: string | string[]) => {
    setEditableSkills((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Import {skills.length} Skill{skills.length !== 1 ? 's' : ''}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground mb-4">
          Target: <code className="bg-muted px-1 rounded">{targetPrefix}</code>
        </div>
        <div className="space-y-4">
          {editableSkills.map((skill, idx) => (
            <div key={skill.path} className="border rounded-lg p-4 space-y-3">
              <div className="text-xs text-muted-foreground font-mono">{skill.path}</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input value={skill.name} onChange={(e) => updateSkill(idx, 'name', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Version</Label>
                  <Input value={skill.version} onChange={(e) => updateSkill(idx, 'version', e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Input value={skill.description} onChange={(e) => updateSkill(idx, 'description', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Tags</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {skill.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
          <Button onClick={() => onConfirm(editableSkills)} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Import'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
