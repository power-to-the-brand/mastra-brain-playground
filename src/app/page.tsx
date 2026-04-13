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
import { Sidebar } from "@/components/ui/sidebar";
import {
  ConversationPreviewSidebar,
  type ConversationMessage,
} from "@/components/conversation-preview-sidebar";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, SRData } from "@/types/scenario";
import { ChatPreview } from "@/components/chat-preview";
import { ScenarioInput } from "@/components/scenario-input";
import { GeneratedResults } from "@/components/generated-results";

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [conversationMessages, setConversationMessages] = useState("");
  const [quotationData, setQuotationData] = useState("");
  const [pastSupplierConversation, setPastSupplierConversation] = useState("");

  // Load from sessionStorage on mount (one-time load behavior)
  useEffect(() => {
    const loadFromSessionStorage = () => {
      const conversation = sessionStorage.getItem("scenario_conversation");
      const srData = sessionStorage.getItem("scenario_sr_data");
      const supplierChat = sessionStorage.getItem("scenario_supplier_chat");

      if (conversation) {
        try {
          const messages: ChatMessage[] = JSON.parse(conversation);
          setConversationMessages(JSON.stringify(messages, null, 2));
        } catch (e) {
          console.error("Failed to parse scenario_conversation from sessionStorage");
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
          setPastSupplierConversation(JSON.stringify(messages, null, 2));
        } catch (e) {
          console.error("Failed to parse scenario_supplier_chat from sessionStorage");
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

  const handleProcessConversation = useCallback(async () => {
    if (!conversationMessages.trim()) return;

    setIsProcessing(true);
    setProcessingError(null);
    setPreviewOpen(true);
    setPreviewConversation(null);

    try {
      const response = await fetch("/api/conversation-transformer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: conversationMessages.trim() }),
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

  // Scenario generation state
  const [scenarioInput, setScenarioInput] = useState("");
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
  const [scenarioResults, setScenarioResults] = useState<{
    conversationMessages: ChatMessage[];
    srData: SRData[];
    pastSupplierConversation: ChatMessage[];
  } | null>(null);

  const handleGenerateScenario = useCallback(async () => {
    if (!scenarioInput.trim()) return;

    setIsGeneratingScenario(true);
    setScenarioResults(null);

    try {
      const response = await fetch("/api/scenario-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenarioInput.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Request failed with status ${response.status}`,
        );
      }

      const data = await response.json();
      setScenarioResults(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate scenario";
      setProcessingError(message);
    } finally {
      setIsGeneratingScenario(false);
    }
  }, [scenarioInput]);

  const handleLoadIntoPlayground = useCallback(() => {
    if (!scenarioResults) return;

    // Store results in sessionStorage for the main page to load
    sessionStorage.setItem(
      "scenario_conversation",
      JSON.stringify(scenarioResults.conversationMessages),
    );
    sessionStorage.setItem(
      "scenario_sr_data",
      JSON.stringify(scenarioResults.srData),
    );
    sessionStorage.setItem(
      "scenario_supplier_chat",
      JSON.stringify(scenarioResults.pastSupplierConversation),
    );

    // Reset and reload from sessionStorage
    setScenarioResults(null);
    setScenarioInput("");
  }, [scenarioResults]);

  return (
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
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label
                      htmlFor="conversation-messages"
                      className="text-sm font-medium text-stone-700 dark:text-stone-300"
                    >
                      Conversation Messages
                    </Label>
                    <Textarea
                      id="conversation-messages"
                      placeholder="Paste conversation messages or a scenario description here..."
                      rows={6}
                      value={conversationMessages}
                      onChange={(e) => setConversationMessages(e.target.value)}
                      className="border-stone-200 bg-stone-50/50 text-stone-800 placeholder:text-stone-400 focus:border-orange-300 focus:ring-orange-300/20 dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-200 dark:placeholder:text-stone-600"
                    />
                    {/* Process Conversation Button */}
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        disabled={!conversationMessages.trim() || isProcessing}
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

                  <div className="space-y-3">
                    <Label
                      htmlFor="quotation-data"
                      className="text-sm font-medium text-stone-700 dark:text-stone-300"
                    >
                      Quotation Data
                    </Label>
                    <Textarea
                      id="quotation-data"
                      placeholder="Paste quotation data here..."
                      rows={6}
                      value={quotationData}
                      onChange={(e) => setQuotationData(e.target.value)}
                      className="border-stone-200 bg-stone-50/50 text-stone-800 placeholder:text-stone-400 focus:border-orange-300 focus:ring-orange-300/20 dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-200 dark:placeholder:text-stone-600"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label
                      htmlFor="past-supplier-conversation"
                      className="text-sm font-medium text-stone-700 dark:text-stone-300"
                    >
                      Past Supplier Conversation
                    </Label>
                    <Textarea
                      id="past-supplier-conversation"
                      placeholder="Paste past supplier conversation here..."
                      rows={6}
                      value={pastSupplierConversation}
                      onChange={(e) =>
                        setPastSupplierConversation(e.target.value)
                      }
                      className="border-stone-200 bg-stone-50/50 text-stone-800 placeholder:text-stone-400 focus:border-orange-300 focus:ring-orange-300/20 dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-200 dark:placeholder:text-stone-600"
                    />
                  </div>

                  <div className="pt-4">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-md shadow-orange-600/20 transition-all duration-300 hover:shadow-lg hover:shadow-orange-600/30 focus:ring-orange-500/50"
                      onClick={() => {
                        console.log("Running brain with:", {
                          conversationMessages,
                          quotationData,
                          pastSupplierConversation,
                        });
                      }}
                    >
                      Run Brain
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scenario Generator Section */}
          <div className="mt-12 animate-fade-in-up">
            <h2 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-100 mb-6">
              Scenario Generator
            </h2>

            {scenarioResults ? (
              <Card className="border-stone-200 bg-white/70 shadow-sm shadow-stone-200/50 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-900/60 dark:shadow-none">
                <CardContent className="pt-6">
                  <GeneratedResults
                    conversationMessages={scenarioResults.conversationMessages}
                    srData={scenarioResults.srData}
                    pastSupplierConversation={scenarioResults.pastSupplierConversation}
                    onReset={() => {
                      setScenarioResults(null);
                      setScenarioInput("");
                    }}
                    isLoading={isGeneratingScenario}
                    onLoadIntoPlayground={handleLoadIntoPlayground}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card className="border-stone-200 bg-white/70 shadow-sm shadow-stone-200/50 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-900/60 dark:shadow-none">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-stone-900 dark:text-stone-100">
                      Generate Scenario
                    </CardTitle>
                    <CardDescription className="text-stone-500 dark:text-stone-400">
                      Create a complete scenario with customer-bot conversation, SR data, and past supplier conversation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScenarioInput
                      value={scenarioInput}
                      onChange={setScenarioInput}
                      onGenerate={handleGenerateScenario}
                      isLoading={isGeneratingScenario}
                      disabled={isGeneratingScenario}
                    />
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
            prev ? prev.map((msg, i) => (i === index ? { ...msg, content: newContent } : msg)) : prev,
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
  );
}
