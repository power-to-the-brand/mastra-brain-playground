'use client';

import { useState, useCallback } from 'react';
import { FileTree } from '@/components/file-tree';
import { SkillImportPreview, DetectedSkill } from '@/components/skill-import-preview';
import matter from 'gray-matter';
import { Upload, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface FileEntry {
  path: string;
  content: string;
  encoding: 'utf8' | 'base64';
}

export default function BulkUploadPage() {
  const [importOpen, setImportOpen] = useState(false);
  const [detectedSkills, setDetectedSkills] = useState<DetectedSkill[]>([]);
  const [importTargetPrefix, setImportTargetPrefix] = useState('');
  const [pendingFiles, setPendingFiles] = useState<FileEntry[]>([]);

  const handleDrop = useCallback(async (files: FileList | null, targetPrefix: string) => {
    if (!files || files.length === 0) return;
    const entries: FileEntry[] = [];
    const detected: DetectedSkill[] = [];

    for (const file of Array.from(files)) {
      const content = await file.text();
      const path = (file as any).webkitRelativePath || file.name;
      entries.push({ path, content, encoding: 'utf8' });

      if (path.endsWith('/SKILL.md') || path === 'SKILL.md') {
        const parsed = matter(content);
        const folderName = path.replace(/\/SKILL\.md$/, '').split('/').pop() || 'Untitled';
        detected.push({
          path,
          name: parsed.data.name || folderName,
          description: parsed.data.description || '',
          version: parsed.data.version || '1.0.0',
          tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [],
        });
      }
    }

    setPendingFiles(entries);
    setDetectedSkills(detected);
    setImportTargetPrefix(targetPrefix);
    setImportOpen(true);
  }, []);

  const handleImportConfirm = useCallback(async (_skills: DetectedSkill[]) => {
    try {
      const res = await fetch('/api/skills/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPrefix: importTargetPrefix, files: pendingFiles }),
      });
      if (!res.ok) throw new Error('Import failed');
      setImportOpen(false);
      window.location.reload();
    } catch (err) {
      console.error('Import failed:', err);
      alert('Import failed. Check console for details.');
    }
  }, [importTargetPrefix, pendingFiles]);

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/skills">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft size={16} />
                Back to Skills
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Bulk Upload Skills</h1>
              <p className="text-muted-foreground">
                Drag and drop a folder to upload multiple skills at once.
              </p>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(100vh-200px)] gap-4">
          <div className="w-64 shrink-0">
            <FileTree onDropFiles={handleDrop} />
          </div>
          <div className="flex-1 border rounded-lg p-6 bg-card/50 flex flex-col items-center justify-center text-center">
            <Upload className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2">Drop a folder here</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Drag and drop a folder from your computer onto the file tree on the left.
              Any folder containing a <code className="bg-muted px-1 rounded">SKILL.md</code> file
              will be detected as a skill.
            </p>
          </div>
        </div>
      </div>

      <SkillImportPreview
        open={importOpen}
        skills={detectedSkills}
        targetPrefix={importTargetPrefix}
        onConfirm={handleImportConfirm}
        onCancel={() => setImportOpen(false)}
      />
    </div>
  );
}
