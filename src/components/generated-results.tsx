"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Copy, Check, Play, MessageSquare, Database, MessageCircle, Save, User, Bot } from "lucide-react";
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
        className="text-muted-foreground hover:bg-muted hover:text-foreground border-border"
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
        className="flex h-11 w-64 rounded-md border border-border bg-background px-3 py-2 text-base placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
        autoFocus
      />
      <Button
        size="lg"
        onClick={handleSave}
        disabled={isLoading || isSaving || !scenarioName.trim()}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
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
        className="text-muted-foreground hover:text-foreground"
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

  const formatJson = (obj: unknown) => {
    return JSON.stringify(obj, null, 2);
  };

  const copyToClipboard = (content: string, sectionId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-2xl font-serif font-bold tracking-tight text-foreground">
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
            className="flex-1 sm:flex-none w-full sm:w-auto font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-[0.98]"
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
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Start Over
          </Button>
        </div>
      </div>

      {/* Customer-Bot Conversation Section */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300">
        <button
          onClick={() => toggleSection("conversation")}
          aria-expanded={expandedSections.conversation}
          className="flex w-full items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageSquare size={18} />
            </div>
            <div className="text-left">
              <span className="block font-serif font-bold text-foreground">
                Customer-Bot Conversation
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {conversationMessages.length} messages
              </span>
            </div>
          </div>
          {expandedSections.conversation ? (
            <ChevronUp size={18} className="text-muted-foreground/60" />
          ) : (
            <ChevronDown size={18} className="text-muted-foreground/60" />
          )}
        </button>

        {expandedSections.conversation && conversationMessages.length > 0 && (
          <div className="border-t border-border p-6 bg-muted/5">
            <div className="flex flex-col gap-5">
              {conversationMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-4",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full shadow-sm transition-colors",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {msg.role === "user" ? (
                      <User size={16} strokeWidth={2.5} />
                    ) : (
                      <Bot size={16} strokeWidth={2.5} />
                    )}
                  </div>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm transition-all duration-300",
                      msg.role === "user"
                        ? "rounded-tr-none bg-primary text-primary-foreground"
                        : "rounded-tl-none bg-card border border-border text-foreground",
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  copyToClipboard(
                    conversationMessages.map((m) => `${m.role}: ${m.content}`).join("\n"),
                    "conversation",
                  )
                }
                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                {copiedSection === "conversation" ? (
                  <>
                    <Check size={14} className="mr-1.5 text-success" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} className="mr-1.5" />
                    Copy Transcript
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* SR Data Section */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300">
        <button
          onClick={() => toggleSection("srData")}
          aria-expanded={expandedSections.srData}
          className="flex w-full items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Database size={18} />
            </div>
            <div className="text-left">
              <span className="block font-serif font-bold text-foreground">
                SR Data
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {srData.length} item{srData.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          {expandedSections.srData ? (
            <ChevronUp size={18} className="text-muted-foreground/60" />
          ) : (
            <ChevronDown size={18} className="text-muted-foreground/60" />
          )}
        </button>

        {expandedSections.srData && srData.length > 0 && (
          <div className="border-t border-border p-6 bg-muted/5">
            <div className="max-h-[400px] overflow-y-auto rounded-xl border border-border bg-background p-4 font-mono text-xs text-foreground/80 leading-relaxed scrollbar-thin scrollbar-thumb-border">
              <pre>{formatJson(srData)}</pre>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  copyToClipboard(formatJson(srData), "srData")
                }
                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                {copiedSection === "srData" ? (
                  <>
                    <Check size={14} className="mr-1.5 text-success" />
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
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300">
        <button
          onClick={() => toggleSection("supplierChat")}
          aria-expanded={expandedSections.supplierChat}
          className="flex w-full items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageCircle size={18} />
            </div>
            <div className="text-left">
              <span className="block font-serif font-bold text-foreground">
                Past Supplier Conversation
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {pastSupplierConversation.length} messages
              </span>
            </div>
          </div>
          {expandedSections.supplierChat ? (
            <ChevronUp size={18} className="text-muted-foreground/60" />
          ) : (
            <ChevronDown size={18} className="text-muted-foreground/60" />
          )}
        </button>

        {expandedSections.supplierChat && pastSupplierConversation.length > 0 && (
          <div className="border-t border-border p-6 bg-muted/5">
            <div className="flex flex-col gap-5">
              {pastSupplierConversation.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-4",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full shadow-sm transition-colors",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {msg.role === "user" ? (
                      <User size={16} strokeWidth={2.5} />
                    ) : (
                      <Bot size={16} strokeWidth={2.5} />
                    )}
                  </div>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm transition-all duration-300",
                      msg.role === "user"
                        ? "rounded-tr-none bg-primary text-primary-foreground"
                        : "rounded-tl-none bg-card border border-border text-foreground",
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  copyToClipboard(
                    pastSupplierConversation.map((m) => `${m.role}: ${m.content}`).join("\n"),
                    "supplierChat",
                  )
                }
                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                {copiedSection === "supplierChat" ? (
                  <>
                    <Check size={14} className="mr-1.5 text-success" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} className="mr-1.5" />
                    Copy Transcript
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
