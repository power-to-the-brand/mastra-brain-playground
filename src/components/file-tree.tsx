'use client';

import { useState, useCallback } from 'react';
import { FileTreeNode } from './file-tree-node';
import { TreeNode } from '@/lib/s3';

interface FileTreeProps {
  rootPrefix?: string;
  onSelectSkill?: (prefix: string) => void;
  onDropFiles?: (files: FileList | null, targetPrefix: string) => void;
  onContextMenu?: (e: React.MouseEvent, node: TreeNode) => void;
}

export function FileTree({ rootPrefix = 'playground/files/', onSelectSkill, onDropFiles, onContextMenu }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([rootPrefix]));
  const [treeData, setTreeData] = useState<Record<string, { folders: TreeNode[]; files: TreeNode[] }>>({});
  const [loading, setLoading] = useState<Set<string>>(new Set());

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
          onContextMenu={onContextMenu || (() => {})}
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
        <FileTreeNode key={file.prefix} node={file} level={0} onToggle={toggle} onSelect={(node) => node.hasSkill && onSelectSkill?.(node.prefix)} onContextMenu={onContextMenu || (() => {})} onDrop={handleDrop} />
      ))}
    </div>
  );
}
