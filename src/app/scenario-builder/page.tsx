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
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, SRData } from "@/types/scenario";
import { ScenarioInput } from "@/components/scenario-input";
import { GeneratedResults } from "@/components/generated-results";

export default function ScenarioBuilderPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [scenarioInput, setScenarioInput] = useState("");
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
  const [scenarioResults, setScenarioResults] = useState<{
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
    <div className="min-h-screen bg-stone-50/50 text-stone-800 dark:bg-stone-950 dark:text-stone-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main
        className={cn(
          "ml-0 transition-all duration-300 w-full",
          sidebarCollapsed ? "sm:ml-20" : "sm:ml-64",
        )}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-stone-50/80 px-4 sm:px-6 py-3 sm:py-4 backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/80">
          <div className="w-full max-w-7xl flex items-center justify-between px-4 sm:px-6">
            <div>
              <h1 className="text-xl font-serif font-bold tracking-tight text-stone-900 dark:text-stone-100">
                Scenario Builder
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Generate and preview complete scenarios
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
          <div className="animate-fade-in-up max-w-3xl sm:mx-0">
            <h2 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-100 mb-6">
              Generate Scenario
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
                    onLoadIntoPlayground={handleLoadIntoPlayground}
                    isLoading={isGeneratingScenario}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="border-stone-200 bg-white/70 shadow-sm shadow-stone-200/50 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-900/60 dark:shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-stone-900 dark:text-stone-100">
                    Input Scenario
                  </CardTitle>
                  <CardDescription className="text-stone-500 dark:text-stone-400">
                    Describe your scenario to generate a complete conversation, SR data, and supplier chat history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label
                        htmlFor="scenario-input"
                        className="text-sm font-medium text-stone-700 dark:text-stone-300"
                      >
                        Scenario Description
                      </Label>
                      <ScenarioInput
                        value={scenarioInput}
                        onChange={setScenarioInput}
                        onGenerate={handleGenerateScenario}
                        isLoading={isGeneratingScenario}
                        disabled={isGeneratingScenario}
                      />
                      {processingError && (
                        <p className="text-xs text-red-600 dark:text-red-400">
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
  );
}
