'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileTreeNode } from './file-tree-node';
import { TreeNode } from '@/lib/s3';
import { FolderPlus, Loader2, AlertCircle } from 'lucide-react';

export interface DroppedFile {
  file: File;
  path: string;
}

interface FileTreeProps {
  rootPrefix?: string;
  onSelectSkill?: (prefix: string) => void;
  onDropFiles?: (files: DroppedFile[], targetPrefix: string) => void;
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
      const reader = entry.createReader();
      const entries = await readEntriesRecursively(reader);
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

export function FileTree({ rootPrefix = 'playground/', onSelectSkill, onDropFiles }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([rootPrefix]));
  const [treeData, setTreeData] = useState<Record<string, { folders: TreeNode[]; files: TreeNode[]; hasSkill?: boolean }>>({});
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: TreeNode } | null>(null);

  const fetchTree = useCallback(async (prefix: string) => {
    setLoading((prev) => new Set(prev).add(prefix));
    setFetchError(null);
    try {
      const res = await fetch(`/api/s3/tree?prefix=${encodeURIComponent(prefix)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();

      const hasSkill = data.files.some((f: TreeNode) => f.name === 'SKILL.md');

      setTreeData((prev) => {
        const next = { ...prev, [prefix]: { ...data, hasSkill } };
        return next;
      });

      // Mark parent folder if this prefix contains SKILL.md
      if (hasSkill) {
        const parentPrefix = prefix.substring(0, prefix.lastIndexOf('/', prefix.length - 2) + 1);
        if (parentPrefix) {
          setTreeData((prev) => {
            const parent = prev[parentPrefix];
            if (!parent) return prev;
            const updatedFolders = parent.folders.map((f) =>
              f.prefix === prefix ? { ...f, hasSkill: true } : f
            );
            return { ...prev, [parentPrefix]: { ...parent, folders: updatedFolders } };
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch tree:', err);
      setFetchError(err.message || 'Failed to load file tree');
    } finally {
      setLoading((prev) => {
        const next = new Set(prev);
        next.delete(prefix);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    fetchTree(rootPrefix);
  }, [fetchTree, rootPrefix]);

  const toggle = useCallback((prefix: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(prefix)) {
        next.delete(prefix);
      } else {
        next.add(prefix);
        if (!treeData[prefix]) {
          fetchTree(prefix);
        }
      }
      return next;
    });
  }, [treeData, fetchTree]);

  const handleDrop = useCallback(async (e: React.DragEvent, prefix: string) => {
    e.preventDefault();
    if (!onDropFiles || !e.dataTransfer.items || e.dataTransfer.items.length === 0) return;
    const files = await collectFilesFromDrop(e.dataTransfer.items);
    if (files.length > 0) {
      onDropFiles(files, prefix);
    }
  }, [onDropFiles]);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const createFolder = useCallback(async (prefix: string, folderName: string) => {
    const newPrefix = prefix.endsWith('/') ? `${prefix}${folderName}/` : `${prefix}/${folderName}/`;
    await fetch('/api/s3/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPrefix: newPrefix, files: [{ path: '.keep', content: '', encoding: 'utf8' }] }),
    });
    await fetchTree(prefix);
  }, [fetchTree]);

  const deleteNode = useCallback(async (node: TreeNode) => {
    await fetch('/api/s3/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(node.type === 'folder' ? { prefix: node.prefix } : { key: node.prefix }),
    });
    // Refresh parent
    const parentPrefix = node.prefix.substring(0, node.prefix.lastIndexOf('/', node.prefix.length - 2) + 1);
    await fetchTree(parentPrefix || rootPrefix);
  }, [fetchTree, rootPrefix]);

  const rootData = treeData[rootPrefix];
  const isRootLoading = loading.has(rootPrefix);
  const hasContent = rootData && (rootData.folders.length > 0 || rootData.files.length > 0);

  return (
    <div className="border rounded-md p-2 h-full overflow-auto bg-background flex flex-col" onDragOver={(e) => e.preventDefault()}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Files</div>
        <button
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="New Folder"
          onClick={() => {
            const name = prompt('Folder name:');
            if (name) createFolder(rootPrefix, name);
          }}
        >
          <FolderPlus size={14} />
        </button>
      </div>

      {isRootLoading && !rootData && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading...
        </div>
      )}

      {fetchError && (
        <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-md p-2 mb-2">
          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-medium">Failed to load files</div>
            <div className="opacity-80">{fetchError}</div>
          </div>
        </div>
      )}

      {rootData?.folders.map((folder) => (
        <FileTreeNode
          key={folder.prefix}
          node={folder}
          level={0}
          onToggle={toggle}
          onSelect={(node) => node.hasSkill && onSelectSkill?.(node.prefix)}
          onContextMenu={handleContextMenu}
          onDrop={handleDrop}
          expanded={expanded}
          loading={loading}
          treeData={treeData}
        />
      ))}
      {rootData?.files.map((file) => (
        <FileTreeNode key={file.prefix} node={file} level={0} onToggle={toggle} onSelect={(node) => node.hasSkill && onSelectSkill?.(node.prefix)} onContextMenu={handleContextMenu} onDrop={handleDrop} expanded={expanded} loading={loading} treeData={treeData} />
      ))}

      {!isRootLoading && !fetchError && !hasContent && (
        <div className="text-center py-8 px-2">
          <div className="text-xs text-muted-foreground mb-3">
            No folders yet.
          </div>
          <button
            className="text-xs text-primary hover:underline flex items-center gap-1 mx-auto"
            onClick={() => {
              const name = prompt('Folder name:');
              if (name) createFolder(rootPrefix, name);
            }}
          >
            <FolderPlus size={12} />
            Create your first folder
          </button>
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed z-50 bg-popover border rounded-md shadow-md py-1 min-w-40"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseLeave={() => setContextMenu(null)}
        >
          {contextMenu.node.type === 'folder' && (
            <button
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
              onClick={() => {
                const name = prompt('Folder name:');
                if (name) createFolder(contextMenu.node.prefix, name);
                setContextMenu(null);
              }}
            >
              New Folder
            </button>
          )}
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent text-destructive"
            onClick={() => {
              if (confirm(`Delete ${contextMenu.node.name}?`)) deleteNode(contextMenu.node);
              setContextMenu(null);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
