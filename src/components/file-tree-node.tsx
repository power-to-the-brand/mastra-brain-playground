'use client';

import { ChevronRight, ChevronDown, Folder, FileText, Sparkles } from 'lucide-react';
import { TreeNode } from '@/lib/s3';

interface FileTreeNodeProps {
  node: TreeNode;
  level: number;
  onToggle: (prefix: string) => void;
  onSelect: (node: TreeNode) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
  onDrop: (e: React.DragEvent, prefix: string) => void;
  childrenNodes?: TreeNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

export function FileTreeNode({
  node, level, onToggle, onSelect, onContextMenu, onDrop,
  childrenNodes, isExpanded, isLoading,
}: FileTreeNodeProps) {
  const isFolder = node.type === 'folder';
  const paddingLeft = level * 16 + 8;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1 px-2 rounded-sm hover:bg-accent cursor-pointer select-none text-sm"
        style={{ paddingLeft }}
        onClick={() => isFolder ? onToggle(node.prefix) : onSelect(node)}
        onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, node); }}
        onDragOver={handleDragOver}
        onDrop={(e) => { e.preventDefault(); if (isFolder) onDrop(e, node.prefix); }}
      >
        {isFolder ? (
          <>
            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <Folder className="w-4 h-4 text-blue-500" />
          </>
        ) : (
          <span className="w-4" />
        )}
        <FileText className="w-4 h-4 text-muted-foreground" />
        <span className="truncate">{node.name}</span>
        {node.hasSkill && <Sparkles className="w-3 h-3 text-yellow-500 ml-1" />}
      </div>
      {isExpanded && childrenNodes && (
        <div>
          {isLoading ? (
            <div className="text-xs text-muted-foreground pl-8 py-1">Loading...</div>
          ) : (
            childrenNodes.map((child) => (
              <FileTreeNode key={child.prefix} node={child} level={level + 1} onToggle={onToggle} onSelect={onSelect} onContextMenu={onContextMenu} onDrop={onDrop} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
