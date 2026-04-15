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
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-muted/30 p-8 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Bot size={24} className="text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          No messages to display
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card">
      {/* Header with title and message count */}
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-serif font-bold text-foreground">
            {title || "Conversation"}
          </h3>
          <Badge variant="secondary" className="h-6 px-2 text-[10px] font-bold uppercase tracking-wider">
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
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full shadow-sm transition-colors",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isUser ? <User size={14} strokeWidth={2.5} /> : <Bot size={14} strokeWidth={2.5} />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "flex max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-muted text-foreground border border-border/50",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
