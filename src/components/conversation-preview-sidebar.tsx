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
            ? "bg-orange-200/60 dark:bg-orange-800/30"
            : "bg-stone-200/60 dark:bg-stone-700/40",
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
              ? "bg-orange-200/40 dark:bg-orange-800/20"
              : "bg-stone-200/40 dark:bg-stone-700/30",
            "w-48",
          )}
        />
        <div
          className={cn(
            "h-4 animate-pulse rounded-lg",
            align === "right"
              ? "bg-orange-200/40 dark:bg-orange-800/20"
              : "bg-stone-200/40 dark:bg-stone-700/30",
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
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100/80 dark:bg-stone-800/50">
        <Bot
          size={24}
          strokeWidth={1.5}
          className="text-stone-400 dark:text-stone-500"
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
          No conversation yet
        </p>
        <p className="text-xs text-stone-400 dark:text-stone-500">
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
  message: ConversationMessage;
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
            "flex h-8 w-8 items-center justify-center rounded-full shadow-sm",
            isUser
              ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-orange-500/20 dark:from-orange-600 dark:to-amber-600"
              : "bg-stone-200/80 text-stone-600 shadow-stone-300/20 dark:bg-stone-700/60 dark:text-stone-300",
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
                className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="rounded-md px-1.5 py-0.5 text-[10px] text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="rounded-md p-0.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
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
                ? "rounded-tr-sm bg-gradient-to-br from-orange-500/10 to-amber-500/10 ring-1 ring-orange-400/40 dark:from-orange-600/10 dark:to-amber-600/10 dark:ring-orange-500/30"
                : "rounded-tl-sm bg-stone-100/90 ring-1 ring-stone-300/60 dark:bg-stone-800/60 dark:ring-stone-600/40",
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
                isUser
                  ? "text-stone-900 placeholder-stone-400 dark:text-stone-100 dark:placeholder-stone-500"
                  : "text-stone-700 placeholder-stone-400 dark:text-stone-300 dark:placeholder-stone-500",
              )}
              placeholder="Edit message..."
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={handleCancel}
                className="rounded-md px-2 py-1 text-xs text-stone-500 transition-colors hover:bg-stone-200/60 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-700/50 dark:hover:text-stone-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 rounded-md bg-orange-500 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500"
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
                "group relative rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                isUser
                  ? "rounded-tr-sm bg-gradient-to-br from-orange-500 to-amber-500 text-white dark:from-orange-600 dark:to-amber-600"
                  : "rounded-tl-sm bg-stone-100/90 text-stone-700 dark:bg-stone-800/60 dark:text-stone-300",
                onEdit && "pr-10",
              )}
            >
              {message.content}
              {onEdit && (
                <button
                  onClick={() => setEditing(true)}
                  className="absolute -right-1 -top-1 rounded-full p-1 shadow-sm transition-colors bg-white text-stone-500 ring-1 ring-stone-200/80 hover:text-orange-600 dark:bg-stone-800 dark:text-stone-400 dark:ring-stone-700 dark:hover:text-orange-400"
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
                className="max-w-full rounded-lg border border-stone-200/60 dark:border-stone-700/40"
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
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-stone-200/60 bg-white/95 backdrop-blur-xl transition-transform duration-300 ease-in-out dark:border-stone-800 dark:bg-stone-950/95",
          "lg:w-96",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200/60 px-4 py-3 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/20">
              <Bot size={14} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">
                Conversation Preview
              </h3>
              {isLoading && (
                <p className="text-[10px] text-orange-600 dark:text-orange-400">
                  Processing...
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100/80 hover:text-stone-600 dark:hover:bg-stone-800/50 dark:hover:text-stone-300"
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
          <div className="border-t border-stone-200/60 dark:border-stone-800">
            {addingRole ? (
              <div className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full",
                      addingRole === "user"
                        ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white dark:from-orange-600 dark:to-amber-600"
                        : "bg-stone-200/80 text-stone-600 dark:bg-stone-700/60 dark:text-stone-300",
                    )}
                  >
                    {addingRole === "user" ? (
                      <User size={10} strokeWidth={2.5} />
                    ) : (
                      <Bot size={10} strokeWidth={2.5} />
                    )}
                  </div>
                  <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
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
                  className="w-full resize-none rounded-xl border border-stone-200/80 bg-white/80 px-3 py-2 text-sm leading-relaxed text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-orange-400/60 focus:ring-1 focus:ring-orange-400/30 dark:border-stone-700/60 dark:bg-stone-900/80 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-orange-500/40 dark:focus:ring-orange-500/20"
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => {
                      setNewContent("");
                      setAddingRole(null);
                    }}
                    className="rounded-md px-2.5 py-1 text-xs text-stone-500 transition-colors hover:bg-stone-100/80 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800/50 dark:hover:text-stone-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSubmit}
                    disabled={!newContent.trim()}
                    className="flex items-center gap-1 rounded-md bg-orange-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-orange-600 dark:hover:bg-orange-500"
                  >
                    <Plus size={12} strokeWidth={2.5} />
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-4 py-2.5">
                <button
                  onClick={() => setAddingRole("user")}
                  className="flex items-center gap-1.5 rounded-lg border border-stone-200/80 px-2.5 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-orange-300/60 hover:bg-orange-50/60 hover:text-orange-700 dark:border-stone-700/60 dark:text-stone-400 dark:hover:border-orange-500/30 dark:hover:bg-orange-950/30 dark:hover:text-orange-300"
                >
                  <User size={12} strokeWidth={2} />
                  Customer
                </button>
                <button
                  onClick={() => setAddingRole("assistant")}
                  className="flex items-center gap-1.5 rounded-lg border border-stone-200/80 px-2.5 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-stone-400/60 hover:bg-stone-100/80 hover:text-stone-800 dark:border-stone-700/60 dark:text-stone-400 dark:hover:border-stone-500/40 dark:hover:bg-stone-800/50 dark:hover:text-stone-200"
                >
                  <Bot size={12} strokeWidth={2} />
                  Bot
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-stone-200/60 px-4 py-2.5 dark:border-stone-800">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-400 dark:text-stone-500">
              {isLoading
                ? "Generating conversation..."
                : messageCount > 0
                  ? `${messageCount} message${messageCount !== 1 ? "s" : ""}`
                  : "No messages"}
            </p>
            {conversation && conversation.length > 0 && (
              <button
                onClick={onClose}
                className="text-xs font-medium text-orange-600 transition-colors hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
