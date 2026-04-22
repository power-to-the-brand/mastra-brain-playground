"use client";

import { AssistantRuntimeProvider, type AssistantRuntime } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef } from "react";

const MASTRA_SERVER_URL = process.env.NEXT_PUBLIC_MASTRA_SERVER_URL || "http://localhost:4111";

interface ChatViewProps {
  agentId: string;
  scenarioId: string;
  runId: string;
  initialMessages?: UIMessage[];
}

function MessageSaver({ runId, runtime }: { runId: string; runtime: AssistantRuntime }) {
  const savedLastMessageId = useRef<string | null>(null);

  useEffect(() => {
    const saveIfComplete = () => {
      const messages = runtime.thread.getState().messages;
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage) return;

      // Only save assistant messages that are complete (not still streaming)
      if (lastMessage.role !== "assistant") return;
      if (lastMessage.status?.type !== "complete") return;

      const messageId = lastMessage.id;
      if (savedLastMessageId.current === messageId) return;
      savedLastMessageId.current = messageId;

      // Build a UIMessage-compatible payload from the assistant-ui message
      const parts = lastMessage.content
        .map((part) => {
          if (part.type === "text") {
            return { type: "text" as const, text: part.text };
          }
          if (part.type === "reasoning") {
            return { type: "reasoning" as const, text: part.text };
          }
          if (part.type === "tool-call") {
            const hasResult = part.result !== undefined;
            return {
              type: `tool-${part.toolName}` as const,
              toolName: part.toolName,
              toolCallId: part.toolCallId,
              state: hasResult ? ("result" as const) : ("call" as const),
              input: part.args,
              output: hasResult ? part.result : undefined,
            };
          }
          return null;
        })
        .filter(Boolean);

      const uiMessage = {
        id: lastMessage.id,
        role: "assistant" as const,
        parts,
        timestamp: new Date().toISOString(),
      };

      // Fire-and-forget save to the Next.js API
      fetch(`/api/runs/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [uiMessage] }),
      }).catch((err) => {
        console.error("Failed to save assistant message:", err);
      });
    };

    const unsubscribe = runtime.thread.subscribe(saveIfComplete);
    // Check initial state in case messages are already complete
    saveIfComplete();
    return unsubscribe;
  }, [runtime, runId]);

  return null;
}

export function ChatView({ agentId, scenarioId, runId, initialMessages = [] }: ChatViewProps) {
  const runtime = useChatRuntime({
    transport: new DefaultChatTransport({
      api: `${MASTRA_SERVER_URL}/chat/dynamic`,
      body: {
        agentId,
        scenarioId,
        runId,
      },
    }),
    messages: initialMessages,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <MessageSaver runId={runId} runtime={runtime} />
      <div className="flex-1 flex flex-col h-full bg-stone-50 dark:bg-stone-950">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
