"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Database,
  Package,
  MessageCircle,
  Save,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  normalizeSupplierConversations,
  type SupplierConversations,
} from "@/lib/supplier-conversations";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

interface ScenarioData {
  id: string;
  name: string;
  conversationMessages: ChatMessage[];
  srData: Array<Record<string, unknown>>;
  pastSupplierConversation: any;
  products?: unknown;
  createdAt?: Date | string;
}

interface NewScenarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  onUpdated?: () => void;
  scenario?: ScenarioData | null;
  mode?: "create" | "edit" | "duplicate";
}

interface SectionConfig {
  key: "conversation" | "srData" | "products" | "supplierChat";
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  stateKey: string;
}

export function NewScenarioDialog({
  open,
  onOpenChange,
  onCreated,
  onUpdated,
  scenario,
  mode = "create",
}: NewScenarioDialogProps) {
  const isEditMode = mode === "edit";
  const isDuplicateMode = mode === "duplicate";

  const [name, setName] = useState("");
  const [conversationMessages, setConversationMessages] = useState("");
  const [srData, setSrData] = useState("");
  const [products, setProducts] = useState("");
  const [pastSupplierConversation, setPastSupplierConversation] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    conversation: false,
    srData: false,
    products: false,
    supplierChat: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-populate form when editing
  useEffect(() => {
    if (scenario) {
      setName(isDuplicateMode ? `${scenario.name} (Copy)` : scenario.name);
      setConversationMessages(
        scenario.conversationMessages?.length
          ? JSON.stringify(scenario.conversationMessages, null, 2)
          : "",
      );
      setSrData(
        scenario.srData?.length ? JSON.stringify(scenario.srData, null, 2) : "",
      );
      setPastSupplierConversation(
        scenario.pastSupplierConversation
          ? JSON.stringify(scenario.pastSupplierConversation, null, 2)
          : "",
      );
      setProducts(
        Array.isArray(scenario.products) && scenario.products.length > 0
          ? JSON.stringify(scenario.products, null, 2)
          : "",
      );
    }
  }, [scenario, isDuplicateMode]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const resetForm = () => {
    setName("");
    setConversationMessages("");
    setSrData("");
    setProducts("");
    setPastSupplierConversation("");
    setExpandedSections({
      conversation: false,
      srData: false,
      products: false,
      supplierChat: false,
    });
    setErrors({});
  };

  const parseJsonField = (
    value: string,
    fieldName: string,
  ): unknown | null => {
    if (!value.trim()) return fieldName === "pastSupplierConversation" ? {} : [];
    try {
      const parsed = JSON.parse(value);
      if (fieldName === "pastSupplierConversation") {
        if (typeof parsed !== "object" || parsed === null) {
          setErrors((prev) => ({
            ...prev,
            [fieldName]: "Must be a JSON object (e.g., { 'Supplier A': [...] })",
          }));
          return null;
        }
      } else if (!Array.isArray(parsed)) {
        setErrors((prev) => ({
          ...prev,
          [fieldName]: "Must be a JSON array",
        }));
        return null;
      }
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
      return parsed;
    } catch {
      setErrors((prev) => ({ ...prev, [fieldName]: "Invalid JSON" }));
      return null;
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrors((prev) => ({ ...prev, name: "Name is required" }));
      return;
    }

    setErrors({});
    setIsSaving(true);

    const conversationMessagesParsed = parseJsonField(
      conversationMessages,
      "conversationMessages",
    );
    const srDataParsed = parseJsonField(srData, "srData");
    const productsParsed = parseJsonField(products, "products");
    const pastSupplierConversationParsed = parseJsonField(
      pastSupplierConversation,
      "pastSupplierConversation",
    );

    if (
      conversationMessagesParsed === null ||
      srDataParsed === null ||
      productsParsed === null ||
      pastSupplierConversationParsed === null
    ) {
      setIsSaving(false);
      return;
    }

    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        conversationMessages: conversationMessagesParsed,
        srData: srDataParsed,
        pastSupplierConversation: pastSupplierConversationParsed,
      };

      if (Array.isArray(productsParsed) && productsParsed.length > 0) {
        body.products = productsParsed;
      }

      if (isEditMode && scenario) {
        // Edit mode: PUT request
        const response = await fetch("/api/scenarios", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: scenario.id,
            ...body,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Request failed with status ${response.status}`,
          );
        }

        resetForm();
        onUpdated?.();
        onOpenChange(false);
      } else {
        // Create mode: POST request
        const response = await fetch("/api/scenarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Request failed with status ${response.status}`,
          );
        }

        resetForm();
        onCreated?.();
        onOpenChange(false);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save scenario";
      setErrors((prev) => ({ ...prev, general: message }));
    } finally {
      setIsSaving(false);
    }
  };

  const getLineCount = (value: string) => {
    if (!value.trim()) return 0;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.length : 1;
    } catch {
      return 0;
    }
  };

  const sections: SectionConfig[] = [
    {
      key: "conversation",
      label: "Conversation Messages",
      icon: <MessageSquare size={14} />,
      placeholder: `[
  {
    "role": "user",
    "content": "Hello, I need help with..."
  },
  {
    "role": "assistant",
    "content": "I'd be happy to help..."
  }
]`,
      stateKey: "conversationMessages",
    },
    {
      key: "srData",
      label: "SR Data",
      icon: <Database size={14} />,
      placeholder: `[
  {
    "id": "sr-001",
    "title": "Sample SR",
    "status": "open"
  }
]`,
      stateKey: "srData",
    },
    {
      key: "products",
      label: "Products (Shortlisted Products)",
      icon: <Package size={14} />,
      placeholder: `[
  {
    "id": "prod-001",
    "name": "Sample Product",
    "price": 99.99
  }
]`,
      stateKey: "products",
    },
    {
      key: "supplierChat",
      label: "Past Supplier Conversations",
      icon: <MessageCircle size={14} />,
      placeholder: `{
  "Guangzhou Playmat Factory": [
    { "role": "user", "content": "Can you share your catalog?" },
    { "role": "assistant", "content": "Sure, here it is." }
  ],
  "Shenzhen Baby Products Co.": [
    { "role": "user", "content": "What is your MOQ?" },
    { "role": "assistant", "content": "MOQ is 500 pcs." }
  ]
}`,
      stateKey: "pastSupplierConversation",
    },
  ];

  const getValueForSection = (key: string) => {
    switch (key) {
      case "conversation":
        return conversationMessages;
      case "srData":
        return srData;
      case "products":
        return products;
      case "supplierChat":
        return pastSupplierConversation;
      default:
        return "";
    }
  };

  const setValueForSection = (key: string, value: string) => {
    switch (key) {
      case "conversation":
        setConversationMessages(value);
        break;
      case "srData":
        setSrData(value);
        break;
      case "products":
        setProducts(value);
        break;
      case "supplierChat":
        setPastSupplierConversation(value);
        break;
    }
    // Clear error for this field when user types
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key === "supplierChat" ? "pastSupplierConversation" : key];
      return next;
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetForm();
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-border bg-card">
        <div className="px-6 pt-6 pb-2">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-bold tracking-tight text-foreground">
              {isEditMode
                ? "Edit Scenario"
                : isDuplicateMode
                  ? "Duplicate Scenario"
                  : "New Scenario"}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
              {isEditMode
                ? "Edit scenario by updating JSON data for each field"
                : isDuplicateMode
                  ? "Create a copy of an existing scenario"
                  : "Create a scenario by providing JSON data for each field"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
              Scenario Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.name;
                    return next;
                  });
                }
              }}
              placeholder="Enter scenario name..."
              className={cn(
                "w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                errors.name
                  ? "border-destructive ring-3 ring-destructive/20"
                  : "border-input",
              )}
            />
            {errors.name && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.name}
              </p>
            )}
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <AlertCircle size={14} />
                {errors.general}
              </p>
            </div>
          )}

          {/* JSON Fields */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
              Scenario Data (all optional)
            </p>

            {sections.map((section) => {
              const value = getValueForSection(section.key);
              const lineCount = getLineCount(value);
              const errorKey =
                section.key === "supplierChat"
                  ? "pastSupplierConversation"
                  : section.key === "conversation"
                    ? "conversationMessages"
                    : section.key;
              const hasError = !!errors[errorKey];

              return (
                <Collapsible
                  key={section.key}
                  open={expandedSections[section.key]}
                  onOpenChange={() => toggleSection(section.key)}
                >
                  <div
                    className={cn(
                      "overflow-hidden rounded-2xl border bg-muted/5",
                      hasError && "border-destructive/50",
                    )}
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {section.icon}
                        </div>
                        <span className="text-sm font-serif font-bold text-foreground">
                          {section.label}
                        </span>
                        {lineCount > 0 && (
                          <Badge
                            variant="secondary"
                            className="ml-1 text-[10px] font-bold uppercase tracking-wider"
                          >
                            {lineCount} item{lineCount !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {hasError && (
                          <AlertCircle
                            size={14}
                            className="text-destructive"
                          />
                        )}
                        {expandedSections[section.key] ? (
                          <ChevronUp
                            size={14}
                            className="text-muted-foreground/60"
                          />
                        ) : (
                          <ChevronDown
                            size={14}
                            className="text-muted-foreground/60"
                          />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-border p-4 bg-background/50 space-y-3">
                        <Textarea
                          value={value}
                          onChange={(e) =>
                            setValueForSection(section.key, e.target.value)
                          }
                          placeholder={section.placeholder}
                          className={cn(
                            "min-h-[180px] font-mono text-xs leading-relaxed resize-y placeholder:text-muted-foreground/30",
                            hasError &&
                              "border-destructive ring-3 ring-destructive/20",
                          )}
                          spellCheck={false}
                        />
                        {hasError && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle size={12} />
                            {errors[errorKey]}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/60">
                          {section.key === "supplierChat"
                            ? "Enter a JSON object. Leave empty to skip this field."
                            : "Enter a JSON array. Leave empty to skip this field."}
                        </p>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20 m-0 gap-2">
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={isSaving}
            className="flex-1 sm:flex-none border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="flex-1 sm:flex-none bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-sm gap-2"
          >
            <Save size={16} />
            {isSaving
              ? "Saving..."
              : isEditMode
                ? "Update Scenario"
                : isDuplicateMode
                  ? "Duplicate Scenario"
                  : "Save Scenario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}