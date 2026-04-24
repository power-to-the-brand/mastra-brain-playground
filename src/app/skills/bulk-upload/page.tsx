'use client';

import { useState, useCallback } from 'react';
import { FileTree, DroppedFile } from '@/components/file-tree';
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

async function readEntriesRecursively(reader: any): Promise<any[]> {
  const entries: any[] = [];
  let readMore = true;
  while (readMore) {
    const batch = await new Promise<any[]>((resolve) => reader.readEntries(resolve));
    if (batch.length === 0) {
      readMore = false;
    } else {
      entries.push(...batch);
    }
  }
  return entries;
}

async function collectFilesFromDrop(items: DataTransferItemList): Promise<DroppedFile[]> {
  const result: DroppedFile[] = [];

  async function readEntry(entry: any, path = ''): Promise<void> {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve) => entry.file(resolve));
      result.push({ file, path: path + file.name });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const entries = await readEntriesRecursively(dirReader);
      for (const child of entries) {
        await readEntry(child, path + entry.name + '/');
      }
    }
  }

  for (const item of Array.from(items)) {
    const entry = (item as any).webkitGetAsEntry?.();
    if (entry) {
      await readEntry(entry);
    }
  }

  return result;
}

export default function BulkUploadPage() {
  const [importOpen, setImportOpen] = useState(false);
  const [detectedSkills, setDetectedSkills] = useState<DetectedSkill[]>([]);
  const [importTargetPrefix, setImportTargetPrefix] = useState('');
  const [pendingFiles, setPendingFiles] = useState<FileEntry[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const processDroppedFiles = useCallback(async (files: DroppedFile[], targetPrefix: string) => {
    if (files.length === 0) return;
    const entries: FileEntry[] = [];
    const detected: DetectedSkill[] = [];

    for (const { file, path } of files) {
      const content = await file.text();
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

  const handleTreeDrop = useCallback(async (files: DroppedFile[], targetPrefix: string) => {
    await processDroppedFiles(files, targetPrefix);
  }, [processDroppedFiles]);

  const handleZoneDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!e.dataTransfer.items || e.dataTransfer.items.length === 0) return;
    const files = await collectFilesFromDrop(e.dataTransfer.items);
    if (files.length > 0) {
      await processDroppedFiles(files, 'playground/skills/');
    }
  }, [processDroppedFiles]);

  const handleZoneDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleZoneDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleImportConfirm = useCallback(async (_skills: DetectedSkill[]) => {
    setIsImporting(true);
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
    } finally {
      setIsImporting(false);
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
            <FileTree onDropFiles={handleTreeDrop} />
          </div>
          <div
            className={`flex-1 border rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors ${
              isDragOver ? 'bg-primary/5 border-primary/30' : 'bg-card/50'
            }`}
            onDragOver={handleZoneDragOver}
            onDragLeave={handleZoneDragLeave}
            onDrop={handleZoneDrop}
          >
            <Upload className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2">Drop a folder here</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Drag and drop a folder from your computer onto the file tree on the left or directly here.
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
        isLoading={isImporting}
      />
    </div>
  );
}
