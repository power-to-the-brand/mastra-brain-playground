"use client";

import * as React from "react";
import { X, User, Bot, Pencil, Check, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/scenario";

// Type alias for backwards compatibility - ConversationMessage = ChatMessage
export type ConversationMessage = ChatMessage;

interface ConversationPreviewSidebarProps {
  open: boolean;
  onClose: () => void;
  conversation: ConversationMessage[] | null;
  isLoading: boolean;
  onMessageEdit?: (index: number, newContent: string) => void;
  onMessageAdd?: (role: "user" | "assistant", content: string) => void;
  onMessageDelete?: (index: number) => void;
}

function SkeletonBubble({ align }: { align: "left" | "right" }) {
  return (
    <div
      className={cn(
        "flex gap-2.5",
        align === "right" ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "h-8 w-8 flex-shrink-0 animate-pulse rounded-full",
          align === "right"
            ? "bg-primary/20"
            : "bg-muted",
        )}
      />
      <div
        className={cn(
          "flex flex-col gap-2",
          align === "right" ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "h-4 animate-pulse rounded-lg",
            align === "right"
              ? "bg-primary/10"
              : "bg-muted/60",
            "w-48",
          )}
        />
        <div
          className={cn(
            "h-4 animate-pulse rounded-lg",
            align === "right"
              ? "bg-primary/10"
              : "bg-muted/60",
            "w-32",
          )}
        />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <SkeletonBubble align="left" />
      <SkeletonBubble align="right" />
      <SkeletonBubble align="left" />
      <SkeletonBubble align="right" />
      <SkeletonBubble align="left" />
      <SkeletonBubble align="right" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Bot
          size={24}
          strokeWidth={1.5}
          className="text-muted-foreground"
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">
          No conversation yet
        </p>
        <p className="text-xs text-muted-foreground">
          Process a conversation to preview it here
        </p>
      </div>
    </div>
  );
}

function ChatMessage({
  message,
  index,
  onEdit,
  onDelete,
}: {
  message: ChatMessage;
  index: number;
  onEdit?: (index: number, newContent: string) => void;
  onDelete?: (index: number) => void;
}) {
  const isUser = message.role === "user";
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(message.content);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit?.(index, trimmed);
    } else {
      setDraft(message.content);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(message.content);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div
      className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar + delete */}
      <div className="flex flex-shrink-0 flex-col items-center gap-1">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-colors",
            isUser
              ? "bg-primary text-primary-foreground shadow-primary/20"
              : "bg-muted text-muted-foreground shadow-sm",
          )}
        >
          {isUser ? (
            <User size={14} strokeWidth={2.5} />
          ) : (
            <Bot size={14} strokeWidth={2.5} />
          )}
        </div>
        {onDelete && (
          confirmingDelete ? (
            <div className="flex flex-col items-center gap-0.5">
              <button
                onClick={() => {
                  onDelete(index);
                  setConfirmingDelete(false);
                }}
                className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="rounded-md p-0.5 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 size={12} strokeWidth={2} />
            </button>
          )
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-1.5",
          isUser ? "items-end" : "items-start",
        )}
      >
        {editing ? (
          <div
            className={cn(
              "flex w-full flex-col gap-2 rounded-2xl px-3.5 py-2.5",
              isUser
                ? "rounded-tr-sm bg-primary/5 ring-1 ring-primary/20"
                : "rounded-tl-sm bg-muted ring-1 ring-border",
            )}
          >
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className={cn(
                "w-full resize-none bg-transparent text-sm leading-relaxed outline-none",
                "text-foreground placeholder:text-muted-foreground/50",
              )}
              placeholder="Edit message..."
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={handleCancel}
                className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Check size={12} strokeWidth={2.5} />
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "group relative rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed transition-all duration-200",
                isUser
                  ? "rounded-tr-sm bg-primary text-primary-foreground shadow-sm"
                  : "rounded-tl-sm bg-muted text-foreground",
                onEdit && "pr-10",
              )}
            >
              {message.content}
              {onEdit && (
                <button
                  onClick={() => setEditing(true)}
                  className="absolute -right-1 -top-1 rounded-full p-1 shadow-sm transition-all bg-background text-muted-foreground ring-1 ring-border hover:text-primary hover:scale-110 active:scale-95"
                >
                  <Pencil size={10} strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* Optional image */}
            {message.image && (
              <img
                src={message.image}
                alt="Attached"
                className="max-w-full rounded-lg border border-border shadow-sm"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function ConversationPreviewSidebar({
  open,
  onClose,
  conversation,
  isLoading,
  onMessageEdit,
  onMessageAdd,
  onMessageDelete,
}: ConversationPreviewSidebarProps) {
  const messageCount = conversation?.length ?? 0;
  const [addingRole, setAddingRole] = React.useState<"user" | "assistant" | null>(null);
  const [newContent, setNewContent] = React.useState("");
  const addInputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (addingRole && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [addingRole]);

  const handleAddSubmit = () => {
    const trimmed = newContent.trim();
    if (trimmed && addingRole) {
      onMessageAdd?.(addingRole, trimmed);
    }
    setNewContent("");
    setAddingRole(null);
  };

  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddSubmit();
    }
    if (e.key === "Escape") {
      setNewContent("");
      setAddingRole(null);
    }
  };

  const canAdd = onMessageAdd && !isLoading;

  return (
    <>
      {/* Backdrop for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/40 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-border bg-card transition-transform duration-300 ease-in-out",
          "lg:w-96 shadow-xl",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Bot size={14} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-serif font-semibold text-foreground">
                Conversation Preview
              </h3>
              {isLoading && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary animate-pulse">
                  Processing...
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {isLoading ? (
            <LoadingSkeleton />
          ) : conversation && conversation.length > 0 ? (
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col gap-4 p-4">
                {conversation.map((msg, i) => (
                  <ChatMessage key={i} message={msg} index={i} onEdit={onMessageEdit} onDelete={onMessageDelete} />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Add message area */}
        {canAdd && (
          <div className="border-t border-border bg-muted/30">
            {addingRole ? (
              <div className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
                      addingRole === "user"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground ring-1 ring-border",
                    )}
                  >
                    {addingRole === "user" ? (
                      <User size={10} strokeWidth={2.5} />
                    ) : (
                      <Bot size={10} strokeWidth={2.5} />
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {addingRole === "user" ? "Customer" : "Bot"} message
                  </span>
                </div>
                <textarea
                  ref={addInputRef}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  onKeyDown={handleAddKeyDown}
                  rows={2}
                  placeholder="Type message..."
                  className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => {
                      setNewContent("");
                      setAddingRole(null);
                    }}
                    className="rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSubmit}
                    disabled={!newContent.trim()}
                    className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={12} strokeWidth={2.5} />
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5">
                <button
                  onClick={() => setAddingRole("user")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-[0.98]"
                >
                  <User size={12} strokeWidth={2} />
                  Customer
                </button>
                <button
                  onClick={() => setAddingRole("assistant")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-[0.98]"
                >
                  <Bot size={12} strokeWidth={2} />
                  Bot
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border px-4 py-3 bg-card">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
              {isLoading
                ? "Generating..."
                : messageCount > 0
                  ? `${messageCount} message${messageCount !== 1 ? "s" : ""}`
                  : "No messages"}
            </p>
            {conversation && conversation.length > 0 && (
              <button
                onClick={onClose}
                className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary transition-colors hover:text-primary/80"
              >
                Close Panel
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
