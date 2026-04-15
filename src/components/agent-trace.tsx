"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Loader2, Bot, Sparkles, Ticket, CheckCircle2, AlertCircle } from "lucide-react";

// Types for message parts
interface TextPart {
  type: "text";
  text: string;
}

interface ToolPart {
  type: string;
  toolName?: string;
  toolCallId?: string;
}

type MessagePart = TextPart | ToolPart | Record<string, unknown>;

interface UIMessage {
  id: string;
  role: "system" | "user" | "assistant";
  parts?: MessagePart[];
}

interface AgentTraceProps {
  messages: UIMessage[];
  isStreaming: boolean;
}

interface TraceEvent {
  id: string;
  type: "agent" | "skill" | "tool" | "text";
  icon: React.ReactNode;
  title: string;
  description?: string;
  status: "pending" | "active" | "done" | "error";
  timestamp: Date;
}

export function AgentTrace({ messages, isStreaming }: AgentTraceProps) {
  const [events, setEvents] = React.useState<TraceEvent[]>([]);

  // Process messages to extract agent/skill/tool calls
  React.useEffect(() => {
    const newEvents: TraceEvent[] = [];

    for (const message of messages) {
      if (message.role !== "assistant" || !message.parts) continue;

      for (const part of message.parts) {
        if (!part || typeof part !== "object") continue;

        // Check for tool calls
        if ("type" in part && typeof part.type === "string") {
          if (part.type === "tool-summarizeConversationAgent") {
            newEvents.push({
              id: `${message.id}-summarize`,
              type: "agent",
              icon: <Bot size={14} />,
              title: "Summarize Agent",
              description: "Summarizing conversation...",
              status: "done",
              timestamp: new Date(),
            });
          } else if (part.type === "tool-goalActionAgent") {
            newEvents.push({
              id: `${message.id}-goal-action`,
              type: "agent",
              icon: <Sparkles size={14} />,
              title: "Goal-Action Agent",
              description: "Executing goal actions...",
              status: "done",
              timestamp: new Date(),
            });
          } else if (part.type === "tool-createTicket" || part.type === "dynamic-tool") {
            const toolName = "toolName" in part ? (part.toolName as string) : part.type.replace("tool-", "");
            newEvents.push({
              id: `${message.id}-${toolName}`,
              type: "tool",
              icon: <Ticket size={14} />,
              title: `Create Ticket: ${toolName}`,
              description: "Creating ticket...",
              status: "done",
              timestamp: new Date(),
            });
          } else if (part.type.startsWith("tool-")) {
            const toolName = part.type.replace("tool-", "");
            // Check if it's a skill call (goal-action loads skills)
            if (["lookupProductSpecs", "lookupSupplierInfo", "lookupPricing", "lookupMOQ", "lookupCertifications", "lookupLeadTime"].includes(toolName)) {
              newEvents.push({
                id: `${message.id}-${toolName}`,
                type: "skill",
                icon: <Sparkles size={14} />,
                title: `Skill: ${toolName.replace(/([A-Z])/g, ' $1').trim()}`,
                status: "done",
                timestamp: new Date(),
              });
            }
          }
        }
      }
    }

    // Only update if we have new events
    if (newEvents.length > events.length) {
      setEvents(newEvents);
    }
  }, [messages, events.length]);

  // If no events yet and streaming, show a waiting state
  const showWaiting = isStreaming && events.length === 0;

  if (!isStreaming && events.length === 0) {
    return null;
  }

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-sm font-serif font-semibold text-foreground">
            Agent Trace
          </h3>
          {isStreaming && (
            <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] font-bold uppercase tracking-wider">
              <Loader2 size={10} className="animate-spin" />
              Running
            </Badge>
          )}
        </div>

        {/* Waiting state */}
        {showWaiting && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            <span>Starting agent...</span>
          </div>
        )}

        {/* Event list */}
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-sm transition-all",
                event.status === "done" &&
                  "border-success/20 bg-success/5",
                event.status === "active" &&
                  "border-primary/30 bg-primary/5",
                event.status === "pending" &&
                  "border-border bg-muted/30",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full",
                  event.type === "agent" && "bg-primary/10 text-primary",
                  event.type === "skill" && "bg-primary/10 text-primary",
                  event.type === "tool" && "bg-primary/10 text-primary",
                  event.status === "done" && "bg-success/10 text-success",
                )}
              >
                {event.status === "done" ? (
                  <CheckCircle2 size={14} />
                ) : (
                  event.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {event.title}
                </div>
                {event.description && (
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {event.description}
                  </div>
                )}
              </div>
              <Badge
                variant="secondary"
                className="h-5 text-[10px] font-bold uppercase tracking-wider px-1.5"
              >
                {event.type}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
