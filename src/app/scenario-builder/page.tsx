"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { ChatMessage, SRData } from "@/types/scenario";
import { ScenarioInput } from "@/components/scenario-input";
import { GeneratedResults } from "@/components/generated-results";
import { ToastProvider } from "@/components/ui/toast-provider";

export default function ScenarioBuilderPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [scenarioInput, setScenarioInput] = useState("");
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
  const [scenarioResults, setScenarioResults] = useState<{
    name?: string;
    conversationMessages: ChatMessage[];
    srData: SRData[];
    pastSupplierConversation: ChatMessage[];
  } | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Load from sessionStorage on mount (one-time load behavior)
  useEffect(() => {
    const loadFromSessionStorage = () => {
      const conversation = sessionStorage.getItem("scenario_conversation");
      const srData = sessionStorage.getItem("scenario_sr_data");
      const supplierChat = sessionStorage.getItem("scenario_supplier_chat");

      if (conversation || srData || supplierChat) {
        // Data was loaded from sessionStorage - now clear it and load into playground
        // This is the "one-time load" behavior
        setScenarioResults({
          conversationMessages: conversation ? JSON.parse(conversation) : [],
          srData: srData ? JSON.parse(srData) : [],
          pastSupplierConversation: supplierChat ? JSON.parse(supplierChat) : [],
        });
        sessionStorage.removeItem("scenario_conversation");
        sessionStorage.removeItem("scenario_sr_data");
        sessionStorage.removeItem("scenario_supplier_chat");
      }
    };

    loadFromSessionStorage();
  }, []);

  const handleGenerateScenario = useCallback(async () => {
    if (!scenarioInput.trim()) return;

    setIsGeneratingScenario(true);
    setProcessingError(null);
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

    // Redirect to main page
    window.location.href = "/";
  }, [scenarioResults]);

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
        )}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-4 sm:px-6 py-4 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-4xl flex items-center justify-between px-4 sm:px-6">
            <div>
              <h1 className="text-2xl font-serif font-bold tracking-tight text-foreground">
                Scenario Builder
              </h1>
              <p className="text-sm text-muted-foreground">
                Generate complete testing scenarios with AI
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary ring-1 ring-primary/20">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Ready
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
          <div className="animate-fade-in-up">
            {scenarioResults ? (
              <Card className="border-none bg-transparent shadow-none">
                <CardContent className="pt-6">
                  <GeneratedResults
                    name={scenarioResults?.name}
                    conversationMessages={scenarioResults.conversationMessages}
                    srData={scenarioResults.srData}
                    pastSupplierConversation={scenarioResults.pastSupplierConversation}
                    onReset={() => {
                      setScenarioResults(null);
                      setScenarioInput("");
                    }}
                    onLoadIntoPlayground={handleLoadIntoPlayground}
                    isLoading={isGeneratingScenario}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none bg-transparent shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg font-serif font-semibold text-foreground">
                    Input Scenario
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Describe your scenario to generate a complete conversation, SR data, and supplier chat history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <ScenarioInput
                        value={scenarioInput}
                        onChange={setScenarioInput}
                        onGenerate={handleGenerateScenario}
                        isLoading={isGeneratingScenario}
                        disabled={isGeneratingScenario}
                      />
                      {processingError && (
                        <p className="text-xs text-destructive">
                          {processingError}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      </div>
    </ToastProvider>
  );
}
