"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, User, Bot, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const MASTRA_SERVER_URL = process.env.NEXT_PUBLIC_MASTRA_SERVER_URL || "http://localhost:4111";

interface ChatInterfaceProps {
  agentId: string;
  scenarioId: string | null;
}

export function ChatInterface({ agentId, scenarioId }: ChatInterfaceProps) {
  const chat = useChat({
    api: `${MASTRA_SERVER_URL}/chat/dynamic`,
    body: {
      agentId,
      scenarioId,
    },
    initialInput: "",
  } as any) as any;

  const { messages = [], input, handleInputChange, handleSubmit, isLoading, error } = chat;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <Bot className="h-12 w-12 text-stone-300" />
            <p className="text-sm text-stone-500 font-serif italic">
              The agent is ready. Send a message to start the conversation.
            </p>
          </div>
        ) : (
          messages.map((m: any) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-4 max-w-3xl mx-auto",
                m.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                m.role === "user" 
                  ? "bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400" 
                  : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500"
              )}>
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              
              <div className={cn(
                "flex flex-col space-y-1",
                m.role === "user" ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                  m.role === "user"
                    ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-tr-none"
                    : "bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 rounded-tl-none"
                )}>
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-stone-100 dark:prose-pre:bg-stone-900 prose-pre:border prose-pre:border-stone-200 dark:prose-pre:border-stone-800">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content || (m as any).parts?.[0]?.text || ""}
                    </ReactMarkdown>
                  </div>
                </div>
                <span className="text-[10px] text-stone-400 px-1">
                  {m.role === "user" ? "You" : "Agent"}
                </span>
              </div>
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-4 max-w-3xl mx-auto">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 mt-1">
              <Bot className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
            </div>
          </div>
        )}
        {error && (
          <div className="max-w-3xl mx-auto p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs">
            Error: {error.message}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto relative flex items-end gap-2"
        >
          <div className="flex-1 relative">
            <Textarea
              value={input || ""}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="min-h-15 max-h-50 w-full pr-12 py-4 bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 focus:ring-amber-500/20 focus:border-amber-500 resize-none rounded-2xl transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                }
              }}
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading || !input?.trim()}
            className={cn(
              "h-15 w-15 rounded-2xl transition-all shadow-lg",
              !input?.trim() || isLoading
                ? "bg-stone-100 dark:bg-stone-800 text-stone-400"
                : "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-900/20"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
        <p className="text-[10px] text-center text-stone-400 mt-3">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
