"use client";

import { useState, useCallback, useEffect } from "react";
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
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, SRData } from "@/types/scenario";
import { ChatPreview } from "@/components/chat-preview";
import { ToastProvider } from "@/components/ui/toast-provider";

// Result from supervisor-agent-v3
interface SupervisorAgentResult {
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
  [key: string]: any;
}

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [conversationMessages, setConversationMessages] = useState("");
  const [quotationData, setQuotationData] = useState("");
  const [pastSupplierConversation, setPastSupplierConversation] = useState("");

  // Helper to convert messages to line-by-line format
  const messagesToLineFormat = (
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
  };

  // Helper to parse line-by-line format back to messages
  const lineFormatToMessages = (
    text: string,
    rolePrefix?: string,
  ): ChatMessage[] => {
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
  };

  // Load from sessionStorage on mount (one-time load behavior)
  useEffect(() => {
    const loadFromSessionStorage = () => {
      const conversation = sessionStorage.getItem("scenario_conversation");
      const srData = sessionStorage.getItem("scenario_sr_data");
      const supplierChat = sessionStorage.getItem("scenario_supplier_chat");

      if (conversation) {
        try {
          const messages: ChatMessage[] = JSON.parse(conversation);
          setConversationMessages(messagesToLineFormat(messages));
        } catch (e) {
          console.error(
            "Failed to parse scenario_conversation from sessionStorage",
          );
        }
      }

      if (srData) {
        try {
          const data: SRData[] = JSON.parse(srData);
          setQuotationData(JSON.stringify(data, null, 2));
        } catch (e) {
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
        } catch (e) {
          console.error(
            "Failed to parse scenario_supplier_chat from sessionStorage",
          );
        }
      }

      // Clear sessionStorage keys after reading (one-time load)
      sessionStorage.removeItem("scenario_conversation");
      sessionStorage.removeItem("scenario_sr_data");
      sessionStorage.removeItem("scenario_supplier_chat");
    };

    loadFromSessionStorage();
  }, []);

  // Conversation transformer state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewConversation, setPreviewConversation] = useState<
    ConversationMessage[] | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Supervisor agent state
  const [agentResult, setAgentResult] = useState<SupervisorAgentResult | null>(
    null,
  );
  const [isRunningAgent, setIsRunningAgent] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);

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
  }, [conversationMessages]);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-stone-50/50 text-stone-800 dark:bg-stone-950 dark:text-stone-100">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main
          className={cn(
            "ml-0 transition-all duration-300 w-full",
            sidebarCollapsed ? "sm:ml-20" : "sm:ml-64",
            previewOpen && "lg:pr-96",
          )}
        >
          {/* Top Bar */}
          <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-stone-50/80 px-4 sm:px-6 py-3 sm:py-4 backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/80">
            <div className="w-full max-w-7xl flex items-center justify-between px-4 sm:px-6">
              <div>
                <h1 className="text-xl font-serif font-bold tracking-tight text-stone-900 dark:text-stone-100">
                  Mastra Brain
                </h1>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Playground
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-700/20 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-400/20">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Ready
                </span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="w-full max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
            {/* Hero Section */}
            <div className="mb-8 sm:mb-10 text-center sm:text-left animate-fade-in-up">
              <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-stone-900 dark:text-stone-100 mb-2 sm:mb-3">
                Welcome to your workspace
              </h2>
              <p className="text-sm sm:text-base text-stone-600 dark:text-stone-400 max-w-2xl mx-auto sm:mx-0">
                Provide the inputs below and run the brain to process your data.
                Your warm, cozy workspace awaits.
              </p>
            </div>

            <div className="animate-fade-in-up animation-delay-200 max-w-3xl sm:mx-0">
              <Card className="border-stone-200 bg-white/70 shadow-sm shadow-stone-200/50 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-900/60 dark:shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-stone-900 dark:text-stone-100">
                    Input Data
                  </CardTitle>
                  <CardDescription className="text-stone-500 dark:text-stone-400">
                    Paste your data below and click &ldquo;Run Brain&rdquo; to
                    process
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="space-y-4">
                    <AccordionItem value="conversation-messages">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-medium text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                            1
                          </div>
                          <span className="font-medium text-stone-900 dark:text-stone-100">
                            Conversation Messages
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <div className="space-y-3">
                          <Label
                            htmlFor="conversation-messages"
                            className="text-sm font-medium text-stone-700 dark:text-stone-300"
                          >
                            Paste your conversation messages here
                          </Label>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
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
                            className="border-stone-200 bg-stone-50/50 text-stone-800 placeholder:text-stone-400 focus:border-orange-300 focus:ring-orange-300/20 dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-200 dark:placeholder:text-stone-600"
                          />
                          {/* Process Conversation Button */}
                          <div className="flex items-center gap-3">
                            <Button
                              size="sm"
                              disabled={
                                !conversationMessages.trim() || isProcessing
                              }
                              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-sm shadow-orange-600/20 transition-all duration-300 hover:shadow-md hover:shadow-orange-600/30 focus:ring-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                              <p className="text-xs text-red-600 dark:text-red-400">
                                {processingError}
                              </p>
                            )}
                            {previewConversation && !processingError && (
                              <button
                                onClick={() => setPreviewOpen(true)}
                                className="text-xs font-medium text-orange-600 transition-colors hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                              >
                                View in sidebar →
                              </button>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="quotation-data">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            2
                          </div>
                          <span className="font-medium text-stone-900 dark:text-stone-100">
                            Quotation Data
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <div className="space-y-3">
                          <Label
                            htmlFor="quotation-data"
                            className="text-sm font-medium text-stone-700 dark:text-stone-300"
                          >
                            Paste your quotation data here
                          </Label>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
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
                            className="border-stone-200 bg-stone-50/50 text-stone-800 placeholder:text-stone-400 focus:border-orange-300 focus:ring-orange-300/20 dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-200 dark:placeholder:text-stone-600"
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="past-supplier-conversation">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                            3
                          </div>
                          <span className="font-medium text-stone-900 dark:text-stone-100">
                            Past Supplier Conversation
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <div className="space-y-3">
                          <Label
                            htmlFor="past-supplier-conversation"
                            className="text-sm font-medium text-stone-700 dark:text-stone-300"
                          >
                            Paste past supplier conversation here
                          </Label>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
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
                            className="border-stone-200 bg-stone-50/50 text-stone-800 placeholder:text-stone-400 focus:border-orange-300 focus:ring-orange-300/20 dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-200 dark:placeholder:text-stone-600"
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <div className="mt-6 pt-4 border-t border-stone-200 dark:border-stone-700">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-md shadow-orange-600/20 transition-all duration-300 hover:shadow-lg hover:shadow-orange-600/30 focus:ring-orange-500/50"
                      disabled={isRunningAgent}
                      onClick={() =>
                        handleRunSupervisorAgent(
                          conversationMessages,
                          quotationData,
                          pastSupplierConversation,
                          lineFormatToMessages,
                          setAgentResult,
                          setIsRunningAgent,
                          setAgentError,
                        )
                      }
                    >
                      {isRunningAgent ? (
                        <>
                          <Loader2 size={18} className="mr-2 animate-spin" />
                          Running Supervisor Agent...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} />
                          Run Brain
                        </>
                      )}
                    </Button>
                    {agentError && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        {agentError}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Supervisor Agent Result */}
              {agentResult && !isRunningAgent && (
                <div className="mt-6 animate-fade-in-up">
                  <Card className="border-stone-200 bg-white/70 shadow-sm shadow-stone-200/50 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-900/60 dark:shadow-none">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-stone-900 dark:text-stone-100">
                        Supervisor Agent V3 Result
                      </CardTitle>
                      <CardDescription className="text-stone-500 dark:text-stone-400">
                        Analysis and recommended actions from the supervisor
                        agent
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Summary */}
                        {agentResult.summary && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-stone-700 dark:text-stone-300">
                              Conversation Summary
                            </Label>
                            <div className="rounded-lg border border-stone-200 bg-stone-50/50 p-4 text-sm text-stone-800 dark:border-stone-700 dark:bg-stone-900/30 dark:text-stone-300">
                              {agentResult.summary}
                            </div>
                          </div>
                        )}

                        {/* Current Ask */}
                        {agentResult.currentAsk && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-stone-700 dark:text-stone-300">
                              Current Ask
                            </Label>
                            <div className="rounded-lg border border-stone-200 bg-orange-50/50 p-4 text-sm text-stone-800 dark:border-stone-700 dark:bg-orange-900/20 dark:text-stone-300">
                              {agentResult.currentAsk}
                            </div>
                          </div>
                        )}

                        {/* Tickets */}
                        {agentResult.tickets && agentResult.tickets.length > 0 && (
                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-stone-700 dark:text-stone-300">
                              Created Tickets ({agentResult.tickets.length})
                            </Label>
                            {agentResult.tickets.map((ticket, idx) => (
                              <div
                                key={idx}
                                className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900/50"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                    {ticket.assignee}
                                  </span>
                                  <span className="text-xs text-stone-500 dark:text-stone-400">
                                    {ticket.srId}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  <div>
                                    <span className="inline-flex items-center rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                      {ticket.payload.action.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                  <p className="text-sm text-stone-700 dark:text-stone-300">
                                    {ticket.payload.details}
                                  </p>
                                  {ticket.payload.context && (
                                    <p className="text-xs text-stone-500 dark:text-stone-500">
                                      <span className="font-medium">Context:</span>{" "}
                                      {ticket.payload.context}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
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

// Run supervisor agent handler - must be inside the component to access state
function handleRunSupervisorAgent(
  conversationMessages: string,
  quotationData: string,
  pastSupplierConversation: string,
  lineFormatToMessages: (text: string, rolePrefix?: string) => ChatMessage[],
  setAgentResult: (result: SupervisorAgentResult | null) => void,
  setIsRunningAgent: (running: boolean) => void,
  setAgentError: (error: string | null) => void,
) {
  const conversationData = lineFormatToMessages(conversationMessages);
  // For supplier conversation: Sourcy is user, supplier is assistant
  const supplierData = lineFormatToMessages(
    pastSupplierConversation,
    "Supplier",
  );

  let quotationParsed: any;
  try {
    quotationParsed = quotationData ? JSON.parse(quotationData) : null;
  } catch {
    quotationParsed = null;
  }

  setIsRunningAgent(true);
  setAgentError(null);
  setAgentResult(null);

  fetch("/api/supervisor-agent-v3", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationMessages: conversationData,
      quotationData: quotationParsed,
      pastSupplierConversation: supplierData,
    }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Request failed with status ${response.status}`,
        );
      }
      return response.json();
    })
    .then((data) => {
      setAgentResult(data.result);
    })
    .catch((err) => {
      const message =
        err instanceof Error ? err.message : "Failed to run supervisor agent";
      setAgentError(message);
    })
    .finally(() => {
      setIsRunningAgent(false);
    });
}
