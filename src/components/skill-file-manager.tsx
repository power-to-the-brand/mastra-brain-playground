'use client';

import { useState, useCallback } from 'react';
import { FileTree, DroppedFile } from './file-tree';
import { SkillImportPreview, DetectedSkill } from './skill-import-preview';
import matter from 'gray-matter';

interface SkillFileManagerProps {
  children: React.ReactNode;
}

interface FileEntry {
  path: string;
  content: string;
  encoding: 'utf8' | 'base64';
}

export function SkillFileManager({ children }: SkillFileManagerProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [detectedSkills, setDetectedSkills] = useState<DetectedSkill[]>([]);
  const [importTargetPrefix, setImportTargetPrefix] = useState('');
  const [pendingFiles, setPendingFiles] = useState<FileEntry[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const handleDrop = useCallback(
    async (files: DroppedFile[], targetPrefix: string) => {
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
    },
    []
  );

  const handleImportConfirm = useCallback(
    async (skills: DetectedSkill[]) => {
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
    },
    [importTargetPrefix, pendingFiles]
  );

  return (
    <div className="flex h-full gap-4">
      <div className="w-64 shrink-0">
        <FileTree onDropFiles={handleDrop} />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
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
