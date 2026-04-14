"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Copy, Check, Play, MessageSquare, Database, MessageCircle, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage, SRData, SaveScenarioRequest, SaveScenarioResponse } from "@/types/scenario";
import { useToast } from "@/components/ui/toast-provider";

interface GeneratedResultsProps {
  name?: string;
  conversationMessages: ChatMessage[];
  srData: SRData[];
  pastSupplierConversation: ChatMessage[];
  onReset: () => void;
  onLoadIntoPlayground?: () => void;
  isLoading?: boolean;
}

interface SaveScenarioButtonProps {
  name?: string;
  conversationMessages: ChatMessage[];
  srData: SRData[];
  pastSupplierConversation: ChatMessage[];
  onSaveSuccess?: (scenario: SaveScenarioResponse["data"]) => void;
  isLoading?: boolean;
}

function SaveScenarioButton({
  name,
  conversationMessages,
  srData,
  pastSupplierConversation,
  onSaveSuccess,
  isLoading,
}: SaveScenarioButtonProps) {
  const { addToast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [scenarioName, setScenarioName] = React.useState(name || "");
  const [showNameInput, setShowNameInput] = React.useState(false);

  const handleSave = async () => {
    if (!scenarioName.trim()) {
      addToast("Please enter a scenario name", "error");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: scenarioName,
          conversationMessages,
          srData,
          pastSupplierConversation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Request failed with status ${response.status}`,
        );
      }

      const data = await response.json();
      addToast(`Scenario "${scenarioName}" saved successfully!`, "success");
      onSaveSuccess?.(data.data);

      // Reset after successful save
      setScenarioName("");
      setShowNameInput(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save scenario";
      addToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!showNameInput) {
    return (
      <Button
        size="lg"
        variant="outline"
        onClick={() => setShowNameInput(true)}
        disabled={isLoading || isSaving}
        className="border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
      >
        <Save size={18} className="mr-2" />
        Save Scenario
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <input
        type="text"
        value={scenarioName}
        onChange={(e) => setScenarioName(e.target.value)}
        placeholder="Enter scenario name..."
        className="flex h-11 w-64 rounded-md border border-stone-300 bg-stone-50 px-3 py-2 text-base placeholder:text-stone-400 focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-300/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:placeholder:text-stone-600"
        autoFocus
      />
      <Button
        size="lg"
        onClick={handleSave}
        disabled={isLoading || isSaving || !scenarioName.trim()}
        className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white"
      >
        {isSaving ? (
          <>
            <Save size={18} className="mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save size={18} className="mr-2" />
            Save
          </>
        )}
      </Button>
      <Button
        size="lg"
        variant="ghost"
        onClick={() => {
          setShowNameInput(false);
          setScenarioName("");
        }}
        disabled={isLoading || isSaving}
      >
        Cancel
      </Button>
    </div>
  );
}

export function GeneratedResults({
  name,
  conversationMessages,
  srData,
  pastSupplierConversation,
  onReset,
  onLoadIntoPlayground,
  isLoading,
}: GeneratedResultsProps) {
  const [expandedSections, setExpandedSections] = React.useState<{
    conversation: boolean;
    srData: boolean;
    supplierChat: boolean;
  }>({
    conversation: true,
    srData: true,
    supplierChat: true,
  });

  const [copiedSection, setCopiedSection] = React.useState<string | null>(null);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const copyToClipboard = (content: string, sectionId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const formatJson = (obj: unknown) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-100">
          Generated Results
        </h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <SaveScenarioButton
            name={name}
            conversationMessages={conversationMessages}
            srData={srData}
            pastSupplierConversation={pastSupplierConversation}
            isLoading={isLoading}
            onSaveSuccess={() => {
              // Optional: show success message or update state
              console.log("Scenario saved successfully");
            }}
          />
          <Button
            size="lg"
            className="flex-1 sm:flex-none w-full sm:w-auto font-medium bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-md shadow-orange-600/20 transition-all hover:shadow-lg hover:shadow-orange-600/30 focus:ring-orange-500/50"
            onClick={onLoadIntoPlayground || onReset}
            disabled={isLoading}
          >
            <Play size={18} className="mr-2" />
            Start Simulation
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onReset}
            disabled={isLoading}
            className="border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            Start Over
          </Button>
        </div>
      </div>

      {/* Customer-Bot Conversation Section */}
      <div className="overflow-hidden rounded-3xl border border-stone-200/60 bg-white/70 shadow-xl shadow-stone-200/40 backdrop-blur-sm dark:border-stone-800/50 dark:bg-stone-900/70 dark:shadow-none">
        <button
          onClick={() => toggleSection("conversation")}
          aria-expanded={expandedSections.conversation}
          className="flex w-full items-center justify-between px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
              <MessageSquare size={16} />
            </div>
            <span className="font-medium text-stone-900 dark:text-stone-100">
              Customer-Bot Conversation
            </span>
            <Badge variant="secondary" className="ml-2">
              {conversationMessages.length} messages
            </Badge>
          </div>
          {expandedSections.conversation ? (
            <ChevronUp size={16} className="text-stone-500" />
          ) : (
            <ChevronDown size={16} className="text-stone-500" />
          )}
        </button>

        {expandedSections.conversation && conversationMessages.length > 0 && (
          <div className="border-t border-stone-200 p-4 dark:border-stone-700">
            <div className="flex flex-col gap-4">
              {conversationMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white",
                      msg.role === "user"
                        ? "bg-gradient-to-br from-orange-500 to-amber-500"
                        : "bg-stone-500 dark:bg-stone-600",
                    )}
                  >
                    {msg.role === "user" ? (
                      <Play size={14} className="rotate-90" />
                    ) : (
                      <Play size={14} className="-rotate-90" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                      msg.role === "user"
                        ? "rounded-tr-none bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900"
                        : "rounded-tl-none bg-stone-50 border border-stone-100 text-stone-700 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300",
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  copyToClipboard(
                    conversationMessages.map((m) => `${m.role}: ${m.content}`).join("\n"),
                    "conversation",
                  )
                }
                className="text-xs text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
              >
                {copiedSection === "conversation" ? (
                  <>
                    <Check size={14} className="mr-1.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} className="mr-1.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* SR Data Section */}
      <div className="overflow-hidden rounded-3xl border border-stone-200/60 bg-white/70 shadow-xl shadow-stone-200/40 backdrop-blur-sm dark:border-stone-800/50 dark:bg-stone-900/70 dark:shadow-none">
        <button
          onClick={() => toggleSection("srData")}
          aria-expanded={expandedSections.srData}
          className="flex w-full items-center justify-between px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Database size={16} />
            </div>
            <span className="font-medium text-stone-900 dark:text-stone-100">
              SR Data
            </span>
            <Badge variant="secondary" className="ml-2">
              {srData.length} item{srData.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          {expandedSections.srData ? (
            <ChevronUp size={16} className="text-stone-500" />
          ) : (
            <ChevronDown size={16} className="text-stone-500" />
          )}
        </button>

        {expandedSections.srData && srData.length > 0 && (
          <div className="border-t border-stone-200 p-4 dark:border-stone-700">
            <div className="max-h-[400px] overflow-y-auto rounded-lg bg-stone-50 p-3 font-mono text-xs text-stone-700 dark:bg-stone-950 dark:text-stone-300">
              <pre>{formatJson(srData)}</pre>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  copyToClipboard(formatJson(srData), "srData")
                }
                className="text-xs text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
              >
                {copiedSection === "srData" ? (
                  <>
                    <Check size={14} className="mr-1.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} className="mr-1.5" />
                    Copy JSON
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Past Supplier Conversation Section */}
      <div className="overflow-hidden rounded-3xl border border-stone-200/60 bg-white/70 shadow-xl shadow-stone-200/40 backdrop-blur-sm dark:border-stone-800/50 dark:bg-stone-900/70 dark:shadow-none">
        <button
          onClick={() => toggleSection("supplierChat")}
          aria-expanded={expandedSections.supplierChat}
          className="flex w-full items-center justify-between px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <MessageCircle size={16} />
            </div>
            <span className="font-medium text-stone-900 dark:text-stone-100">
              Past Supplier Conversation
            </span>
            <Badge variant="secondary" className="ml-2">
              {pastSupplierConversation.length} messages
            </Badge>
          </div>
          {expandedSections.supplierChat ? (
            <ChevronUp size={16} className="text-stone-500" />
          ) : (
            <ChevronDown size={16} className="text-stone-500" />
          )}
        </button>

        {expandedSections.supplierChat && pastSupplierConversation.length > 0 && (
          <div className="border-t border-stone-200 p-4 dark:border-stone-700">
            <div className="flex flex-col gap-4">
              {pastSupplierConversation.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white",
                      msg.role === "user"
                        ? "bg-gradient-to-br from-orange-500 to-amber-500"
                        : "bg-stone-500 dark:bg-stone-600",
                    )}
                  >
                    {msg.role === "user" ? (
                      <Play size={14} className="rotate-90" />
                    ) : (
                      <Play size={14} className="-rotate-90" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                      msg.role === "user"
                        ? "rounded-tr-none bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900"
                        : "rounded-tl-none bg-stone-50 border border-stone-100 text-stone-700 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300",
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  copyToClipboard(
                    pastSupplierConversation.map((m) => `${m.role}: ${m.content}`).join("\n"),
                    "supplierChat",
                  )
                }
                className="text-xs text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
              >
                {copiedSection === "supplierChat" ? (
                  <>
                    <Check size={14} className="mr-1.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} className="mr-1.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
