"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Sidebar } from "@/components/ui/sidebar";
import {
  ConversationPreviewSidebar,
  type ConversationMessage,
} from "@/components/conversation-preview-sidebar";
import { Sparkles, Loader2, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, SRData } from "@/types/scenario";
import { ToastProvider } from "@/components/ui/toast-provider";
import { AgentTrace } from "@/components/agent-trace";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Streaming state types
interface StreamResult {
  result?: {
    summary?: string;
    currentAsk?: string;
    tickets?: Array<{
      assignee: string;
      srId: string;
      payload: {
        action: string;
        details: string;
        context?: string;
      };
    }>;
  };
  error?: string;
}

// Helper to extract JSON from text that might contain markdown or other characters
const extractJSON = (text: string) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;

  const jsonStr = text.substring(start, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse extracted JSON", e);
    return null;
  }
};

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [conversationMessages, setConversationMessages] = useState("");
  const [quotationData, setQuotationData] = useState("");
  const [pastSupplierConversation, setPastSupplierConversation] = useState("");
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("supervisor-v3");

  // Helper to convert messages to line-by-line format
  const messagesToLineFormat = useCallback(
    (
      messages: ChatMessage[],
      {
        userRolePrefix,
        botRolePrefix,
      }: { userRolePrefix?: string; botRolePrefix?: string } = {},
    ): string => {
      return messages
        .map((msg) => {
          // Use provided role prefix if available, otherwise infer from role
          const roleLabel =
            msg.role === "user"
              ? (userRolePrefix ?? `Customer`)
              : (botRolePrefix ?? `Sourcy Bot`);
          return `[${roleLabel}]: ${msg.content}`;
        })
        .join("\n");
    },
    [],
  );

  // Helper to parse line-by-line format back to messages
  const lineFormatToMessages = useCallback(
    (text: string, rolePrefix?: string): ChatMessage[] => {
      const lines = text.split("\n");
      const messages: ChatMessage[] = [];
      for (const line of lines) {
        const match = line.match(/^\[(Customer|Bot|Supplier)\]: (.*)$/);
        if (match) {
          const roleType = match[1];
          // Use rolePrefix if provided (for supplier conversation: "Supplier" means Sourcy=user)
          // Otherwise infer from role: Customer= user, Bot/other = assistant
          let role: "user" | "assistant";
          if (rolePrefix === "Supplier") {
            // When parsing supplier conversation, Supplier = Sourcy (user), Bot = assistant
            role = roleType === "Supplier" ? "user" : "assistant";
          } else {
            // Default: Customer = user, Bot = assistant
            role = roleType === "Customer" ? "user" : "assistant";
          }
          messages.push({
            role,
            content: match[2],
          });
        }
      }
      return messages;
    },
    [],
  );

  // Load from sessionStorage on mount (one-time load behavior)
  useEffect(() => {
    const loadFromSessionStorage = () => {
      const conversation = sessionStorage.getItem("scenario_conversation");
      const srData = sessionStorage.getItem("scenario_sr_data");
      const supplierChat = sessionStorage.getItem("scenario_supplier_chat");
      const id = sessionStorage.getItem("scenario_id");

      if (id) {
        setScenarioId(id);
      }

      if (conversation) {
        try {
          const messages: ChatMessage[] = JSON.parse(conversation);
          setConversationMessages(messagesToLineFormat(messages));
        } catch {
          console.error(
            "Failed to parse scenario_conversation from sessionStorage",
          );
        }
      }

      if (srData) {
        try {
          const data: SRData[] = JSON.parse(srData);
          setQuotationData(JSON.stringify(data, null, 2));
        } catch {
          console.error("Failed to parse scenario_sr_data from sessionStorage");
        }
      }

      if (supplierChat) {
        try {
          const messages: ChatMessage[] = JSON.parse(supplierChat);
          setPastSupplierConversation(
            messagesToLineFormat(messages, {
              userRolePrefix: "Sourcy Team",
              botRolePrefix: "Supplier",
            }),
          );
        } catch {
          console.error(
            "Failed to parse scenario_supplier_chat from sessionStorage",
          );
        }
      }

      // Clear sessionStorage keys after reading (one-time load)
      sessionStorage.removeItem("scenario_conversation");
      sessionStorage.removeItem("scenario_sr_data");
      sessionStorage.removeItem("scenario_supplier_chat");
      sessionStorage.removeItem("scenario_id");
    };

    loadFromSessionStorage();
  }, [messagesToLineFormat]);

  // Conversation transformer state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewConversation, setPreviewConversation] = useState<
    ConversationMessage[] | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Supervisor agent state - use useChat for streaming
  const MASTRA_SERVER_URL =
    process.env.NEXT_PUBLIC_MASTRA_SERVER_URL || "http://localhost:4111";

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${MASTRA_SERVER_URL}/${selectedAgent}`,
      }),
    [MASTRA_SERVER_URL, selectedAgent],
  );

  const onFinish = useCallback(
    ({ message }: { message: UIMessage }) => {
      console.log("Stream finished", message);
      if (message.role === "assistant") {
        // Use message.content if available, otherwise join text parts
        let content = "";

        if (!content && message.parts) {
          const textParts = message.parts.filter(
            (part) => part.type === "text",
          ) as Array<{ type: "text"; text: string }>;
          // Take only the last part as it contains the final structured outcome
          content = textParts[textParts.length - 1]?.text || "";
        }

        console.log(
          "Final content for saving:",
          content.substring(0, 100) + "...",
        );

        if (content) {
          const result = extractJSON(content);
          if (result && (result.summary || result.tickets)) {
            setAgentResult(result);
          }

          // Save result to local API
          fetch(`/api/scenario-results`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scenarioId: scenarioId || undefined,
              finalOutput: content,
              agentName: selectedAgent,
            }),
          })
            .then((res) => {
              if (!res.ok) {
                console.error("Failed to save result, status:", res.status);
              } else {
                console.log("Scenario result saved successfully");
              }
            })
            .catch((err) => {
              console.error("Failed to save scenario result:", err);
            });
        }
      }
    },
    [scenarioId, selectedAgent],
  );

  const { messages, sendMessage, status } = useChat({
    id: "supervisor-v3-chat",
    transport,
    onFinish,
  });

  // Derived state from useChat
  const isRunningAgent = status === "streaming" || status === "submitted";

  // Get the latest assistant message content (streaming text)
  const streamingText = (() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant") {
      // Extract text from parts array - find text parts and join them
      const textParts = lastMessage.parts?.filter(
        (part) => part.type === "text",
      ) as Array<{ type: "text"; text: string }>;
      return textParts?.map((p) => p.text).join("") || "";
    }
    return "";
  })();

  // Parse the final result when streaming completes
  const [agentResult, setAgentResult] = useState<StreamResult["result"] | null>(
    null,
  );
  const [agentError, setAgentError] = useState<string | null>(null);

  // Handler to run the supervisor agent with streaming
  const handleRunAgent = useCallback(() => {
    const conversationData = lineFormatToMessages(conversationMessages);
    const supplierData = lineFormatToMessages(
      pastSupplierConversation,
      "Supplier",
    );

    let quotationParsed: unknown;
    try {
      quotationParsed = quotationData ? JSON.parse(quotationData) : null;
    } catch {
      quotationParsed = null;
    }

    // Reset state
    setHasStarted(true);
    setAgentResult(null);
    setAgentError(null);

    // Format conversation messages as line-by-line for the agent
    const formatConversation = (msgs: ChatMessage[]) => {
      return msgs
        .map(
          (msg) =>
            `[${msg.role === "user" ? "Customer" : "Bot"}]: ${msg.content}`,
        )
        .join("\n");
    };

    const customerConversationText = formatConversation(conversationData);
    const supplierConversationText =
      supplierData.length > 0
        ? formatConversation(supplierData)
        : "No past supplier conversation available.";

    // Extract SR ID from quotation data if available
    const q = quotationParsed as { runId?: string; srId?: string } | null;
    const srId = q?.runId || q?.srId || new Date().toISOString();

    // Build the prompt with all required context
    const prompt = `SR ID: ${srId}

== PAST SUPPLIER CONVERSATION ==
${supplierConversationText}

== CUSTOMER CONVERSATION ==
${customerConversationText}

== QUOTATION DATA ==
${JSON.stringify(quotationParsed, null, 2)}

Please analyze this context and determine the appropriate actions to take.
Follow the supervisor-agent-v3 workflow:
1. Summarize the conversation to understand what has happened and the current ask
2. Determine the right actions based on the customer's current request
3. Create tickets for each action with appropriate assignees

Return your analysis and recommended actions in JSON format.`;

    // Send the message to trigger streaming
    sendMessage({ text: prompt });
  }, [
    conversationMessages,
    quotationData,
    pastSupplierConversation,
    lineFormatToMessages,
    sendMessage,
  ]);

  const handleProcessConversation = useCallback(async () => {
    if (!conversationMessages.trim()) return;

    // Convert line-by-line format to JSON for the API
    const conversationJson = JSON.stringify(
      lineFormatToMessages(conversationMessages),
    );

    setIsProcessing(true);
    setProcessingError(null);
    setPreviewOpen(true);
    setPreviewConversation(null);

    try {
      const response = await fetch("/api/conversation-transformer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: conversationJson }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Request failed with status ${response.status}`,
        );
      }

      const data = await response.json();
      setPreviewConversation(data.conversation);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to process conversation";
      setProcessingError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [conversationMessages, lineFormatToMessages]);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-foreground">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main
          className={cn(
            "ml-0 transition-all duration-300",
            sidebarCollapsed ? "sm:ml-20" : "sm:ml-64",
            previewOpen && "lg:pr-96",
          )}
        >
          {/* Top Bar */}
          <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
            <div className="mx-auto w-full max-w-7xl flex h-16 items-center justify-between px-6">
              <div>
                <h1 className="font-serif text-xl font-bold tracking-tight text-foreground">
                  Mastra Brain
                </h1>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  Playground
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-[11px] font-bold text-success uppercase tracking-wider border border-success/20">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  Ready
                </span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
            {/* Hero Section */}
            <div className="mb-8 sm:mb-10 text-center sm:text-left animate-fade-in-up">
              <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-foreground mb-2 sm:mb-3">
                Welcome to your workspace
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto sm:mx-0">
                Provide the inputs below and run the brain to process your data.
                Your warm, cozy workspace awaits.
              </p>
            </div>

            <div className="animate-fade-in-up animation-delay-200">
              <Card className="border-border bg-card shadow-sm ring-1 ring-border/5">
                <CardHeader className="border-b border-border/50 pb-6">
                  <CardTitle className="font-serif text-xl font-bold">
                    Input Data
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Configure your scenario inputs to run the Mastra Brain
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Accordion type="multiple" className="space-y-4">
                    <AccordionItem
                      value="conversation-messages"
                      className="border-none"
                    >
                      <AccordionTrigger className="hover:no-underline py-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary border border-primary/20">
                            01
                          </div>
                          <span className="text-sm font-bold uppercase tracking-wider text-foreground/90">
                            Conversation History
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <div className="space-y-3">
                          <Label
                            htmlFor="conversation-messages"
                            className="text-sm font-medium text-foreground/80"
                          >
                            Paste your conversation messages here
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Format: Each message on a new line as [Customer]:
                            message or [Bot]: message
                          </p>
                          <Textarea
                            id="conversation-messages"
                            placeholder="[Customer]: I need a quote for 500 units
[Bot]: Sure, I can help. What product are you looking for?
[Customer]: I need a stainless steel vacuum tumbler..."
                            rows={6}
                            value={conversationMessages}
                            onChange={(e) =>
                              setConversationMessages(e.target.value)
                            }
                            className="border-border bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20"
                          />
                          {/* Process Conversation Button */}
                          <div className="flex items-center gap-3">
                            <Button
                              size="sm"
                              disabled={
                                !conversationMessages.trim() || isProcessing
                              }
                              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all duration-300 hover:shadow-md focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={handleProcessConversation}
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Sparkles size={14} />
                                  Process Conversation
                                </>
                              )}
                            </Button>
                            {processingError && (
                              <p className="text-xs text-destructive">
                                {processingError}
                              </p>
                            )}
                            {previewConversation && !processingError && (
                              <button
                                onClick={() => setPreviewOpen(true)}
                                className="text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:text-primary/80"
                              >
                                View in sidebar →
                              </button>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem
                      value="quotation-data"
                      className="border-none"
                    >
                      <AccordionTrigger className="hover:no-underline py-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary border border-primary/20">
                            02
                          </div>
                          <span className="text-sm font-bold uppercase tracking-wider text-foreground/90">
                            Quotation Context
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <div className="space-y-3">
                          <Label
                            htmlFor="quotation-data"
                            className="text-sm font-medium text-foreground/80"
                          >
                            Paste your quotation data here
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Format: JSON with SR data (runId,
                            original_requirement, specs, etc.)
                          </p>
                          <Textarea
                            id="quotation-data"
                            placeholder={`{
  "runId": "SR-EDAMAMA-001",
  "original_requirement": {
    "title\": \"Stainless Steel Vacuum Tumbler\",
    ...
  }
}`}
                            rows={6}
                            value={quotationData}
                            onChange={(e) => setQuotationData(e.target.value)}
                            className="border-border bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20"
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem
                      value="past-supplier-conversation"
                      className="border-none"
                    >
                      <AccordionTrigger className="hover:no-underline py-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary border border-primary/20">
                            03
                          </div>
                          <span className="text-sm font-bold uppercase tracking-wider text-foreground/90">
                            Supplier Dialogue
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <div className="space-y-3">
                          <Label
                            htmlFor="past-supplier-conversation"
                            className="text-sm font-medium text-foreground/80"
                          >
                            Paste past supplier conversation here
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Format: Each message on a new line as [Supplier]:
                            message or [Bot]: message
                          </p>
                          <Textarea
                            id="past-supplier-conversation"
                            placeholder="[Supplier]: Yes, we have ISO certification
[Bot]: Great. Can you provide pricing for MOQ 500?"
                            rows={6}
                            value={pastSupplierConversation}
                            onChange={(e) =>
                              setPastSupplierConversation(e.target.value)
                            }
                            className="border-border bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20"
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <div className="mt-6 pt-4 border-t border-border">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-300 hover:shadow-lg focus:ring-primary/50"
                      disabled={isRunningAgent}
                      onClick={handleRunAgent}
                    >
                      {isRunningAgent ? (
                        <>
                          <Loader2 size={18} className="mr-2 animate-spin" />
                          Running Brain...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} />
                          Run Brain
                        </>
                      )}
                    </Button>
                    {agentError && (
                      <p className="mt-2 text-xs text-destructive">
                        {agentError}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Streaming Progress with Agent Trace - show when running OR when complete with results */}
              {hasStarted && (
                <div className="mt-6 animate-fade-in-up space-y-4">
                  {/* Agent Trace - shows what agents/skills are being called */}
                  {/* <AgentTrace
                    messages={messages}
                    isStreaming={isRunningAgent}
                  /> */}

                  {/* Live text output */}
                  <Card className="border-primary/20 bg-primary/5 shadow-inner ring-1 ring-primary/5">
                    <CardHeader className="pb-3 border-b border-primary/10">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-sm">
                          <Brain
                            className={cn(
                              "h-5 w-5 text-primary",
                              isRunningAgent && "animate-pulse",
                            )}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-base font-serif font-bold text-primary/90">
                            {isRunningAgent
                              ? "Neural Processing..."
                              : "Brain Output"}
                          </CardTitle>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                            {isRunningAgent
                              ? "Analyzing data streams"
                              : "Process execution log"}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="font-mono text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              isRunningAgent
                                ? "animate-pulse bg-success"
                                : "bg-success",
                            )}
                          />
                          <span className="text-xs text-muted-foreground font-sans">
                            {isRunningAgent ? "Live output" : "Final output"}
                          </span>
                        </div>
                        <div className="prose prose-stone dark:prose-invert max-w-none overflow-y-auto max-h-[600px] min-h-[200px] pr-4">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {streamingText ||
                              (isRunningAgent
                                ? "Connecting to brain..."
                                : "Final result received")}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Supervisor Agent Result */}
              {agentResult && !isRunningAgent && (
                <div className="mt-8 animate-fade-in-up">
                  <Card className="border-border bg-card shadow-md ring-1 ring-border/5">
                    <CardHeader className="border-b border-border/50 pb-6">
                      <CardTitle className="font-serif text-xl font-bold">
                        Supervisor Analysis
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Executive summary and structured actionable tickets
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-8">
                        {/* Summary */}
                        {agentResult.summary && (
                          <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              Conversation Summary
                            </Label>
                            <div className="rounded-xl border border-border/60 bg-muted/20 p-5 text-[15px] leading-relaxed text-foreground/90 font-serif italic">
                              &ldquo;{agentResult.summary}&rdquo;
                            </div>
                          </div>
                        )}

                        {/* Current Ask */}
                        {agentResult.currentAsk && (
                          <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              Primary Request
                            </Label>
                            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 shadow-sm ring-1 ring-primary/10">
                              <p className="text-base font-serif font-bold text-foreground leading-relaxed">
                                {agentResult.currentAsk}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Tickets */}
                        {agentResult.tickets &&
                          agentResult.tickets.length > 0 && (
                            <div className="space-y-4">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                Actionable Tickets ({agentResult.tickets.length}
                                )
                              </Label>
                              <div className="grid gap-4 sm:grid-cols-2">
                                {agentResult.tickets.map((ticket, idx) => (
                                  <div
                                    key={idx}
                                    className="group rounded-xl border border-border bg-background/50 p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-300"
                                  >
                                    <div className="flex items-center justify-between mb-4">
                                      <span className="inline-flex items-center rounded-lg bg-secondary/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground border border-border/50">
                                        {ticket.assignee}
                                      </span>
                                      <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-tighter">
                                        {ticket.srId}
                                      </span>
                                    </div>
                                    <div className="space-y-3">
                                      <div>
                                        <span className="inline-flex items-center rounded bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary border border-primary/10">
                                          {ticket.payload.action.replace(
                                            /_/g,
                                            " ",
                                          )}
                                        </span>
                                      </div>
                                      <p className="text-[14px] text-foreground/90 leading-snug font-medium">
                                        {ticket.payload.details}
                                      </p>
                                      {ticket.payload.context && (
                                        <div className="border-t border-border/40 mt-3 pt-3">
                                          <p className="text-[12px] text-muted-foreground leading-relaxed italic line-clamp-2 group-hover:line-clamp-none transition-all">
                                            {ticket.payload.context}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right Sidebar - Conversation Preview */}
        <ConversationPreviewSidebar
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          conversation={previewConversation}
          isLoading={isProcessing}
          onMessageEdit={(index, newContent) => {
            setPreviewConversation((prev) =>
              prev
                ? prev.map((msg, i) =>
                    i === index ? { ...msg, content: newContent } : msg,
                  )
                : prev,
            );
          }}
          onMessageAdd={(role, content) => {
            setPreviewConversation((prev) => [
              ...(prev ?? []),
              { role, content },
            ]);
          }}
          onMessageDelete={(index) => {
            setPreviewConversation((prev) =>
              prev ? prev.filter((_, i) => i !== index) : prev,
            );
          }}
        />
      </div>
    </ToastProvider>
  );
}
