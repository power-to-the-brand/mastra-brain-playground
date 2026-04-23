'use client';

import { useState, useCallback } from 'react';
import { FileTreeNode } from './file-tree-node';
import { TreeNode } from '@/lib/s3';

interface FileTreeProps {
  rootPrefix?: string;
  onSelectSkill?: (prefix: string) => void;
  onDropFiles?: (files: FileList | null, targetPrefix: string) => void;
}

export function FileTree({ rootPrefix = 'playground/files/', onSelectSkill, onDropFiles }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([rootPrefix]));
  const [treeData, setTreeData] = useState<Record<string, { folders: TreeNode[]; files: TreeNode[] }>>({});
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: TreeNode } | null>(null);

  const fetchTree = useCallback(async (prefix: string) => {
    setLoading((prev) => new Set(prev).add(prefix));
    try {
      const res = await fetch(`/api/s3/tree?prefix=${encodeURIComponent(prefix)}`);
      const data = await res.json();
      setTreeData((prev) => ({ ...prev, [prefix]: data }));
    } catch (err) {
      console.error('Failed to fetch tree:', err);
    } finally {
      setLoading((prev) => { const next = new Set(prev); next.delete(prefix); return next; });
    }
  }, []);

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

  const handleDrop = useCallback((e: React.DragEvent, prefix: string) => {
    e.preventDefault();
    if (onDropFiles) {
      onDropFiles(e.dataTransfer.files, prefix);
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

  return (
    <div className="border rounded-md p-2 h-full overflow-auto bg-background" onDragOver={(e) => e.preventDefault()}>
      <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Files</div>
      {rootData?.folders.map((folder) => (
        <FileTreeNode
          key={folder.prefix}
          node={folder}
          level={0}
          onToggle={toggle}
          onSelect={(node) => node.hasSkill && onSelectSkill?.(node.prefix)}
          onContextMenu={handleContextMenu}
          onDrop={handleDrop}
          isExpanded={expanded.has(folder.prefix)}
          isLoading={loading.has(folder.prefix)}
          childrenNodes={[
            ...(treeData[folder.prefix]?.folders || []),
            ...(treeData[folder.prefix]?.files || []),
          ]}
        />
      ))}
      {rootData?.files.map((file) => (
        <FileTreeNode key={file.prefix} node={file} level={0} onToggle={toggle} onSelect={(node) => node.hasSkill && onSelectSkill?.(node.prefix)} onContextMenu={handleContextMenu} onDrop={handleDrop} />
      ))}
      {contextMenu && (
        <div
          className="fixed z-50 bg-popover border rounded-md shadow-md py-1 min-w-[160px]"
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
