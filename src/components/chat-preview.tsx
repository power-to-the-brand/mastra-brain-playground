"use client";

import * as React from "react";
import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "@/types/scenario";

interface ChatPreviewProps {
  messages: ChatMessage[];
  title?: string;
}

export function ChatPreview({ messages, title }: ChatPreviewProps) {
  const messageCount = messages.length;

  if (messageCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-stone-50/50 p-8 text-center dark:border-stone-700 dark:bg-stone-900/30">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-stone-200 dark:bg-stone-700">
          <Bot size={24} className="text-stone-500 dark:text-stone-400" />
        </div>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          No messages to display
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
      {/* Header with title and message count */}
      <div className="border-b border-stone-200 bg-stone-50/80 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">
            {title || "Conversation"}
          </h3>
          <Badge variant="secondary" className="h-6 px-2 text-xs">
            {messageCount} message{messageCount !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Messages container */}
      <div className="flex flex-col gap-4 p-4">
        {messages.map((message, index) => (
          <ChatBubble
            key={index}
            message={message}
            isUser={message.role === "user"}
          />
        ))}
      </div>
    </div>
  );
}

interface ChatBubbleProps {
  message: ChatMessage;
  isUser: boolean;
}

function ChatBubble({ message, isUser }: ChatBubbleProps) {
  return (
    <div
      className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white",
          isUser
            ? "bg-gradient-to-br from-orange-500 to-amber-500"
            : "bg-stone-500 dark:bg-stone-600",
        )}
      >
        {isUser ? <User size={14} strokeWidth={2.5} /> : <Bot size={14} strokeWidth={2.5} />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "flex max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-gradient-to-br from-orange-500 to-amber-500 text-white dark:from-orange-600 dark:to-amber-600"
            : "rounded-tl-sm bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
