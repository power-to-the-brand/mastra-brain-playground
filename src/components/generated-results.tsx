"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Copy, Check, Play, MessageSquare, Database, MessageCircle, Save, User, Bot, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage, QuotationData, SRData, SaveScenarioRequest, SaveScenarioResponse } from "@/types/scenario";
import {
  normalizeSupplierConversations,
  countSupplierMessages,
  type SupplierConversations,
} from "@/lib/supplier-conversations";
import { useToast } from "@/components/ui/toast-provider";

interface GeneratedResultsProps {
  name?: string;
  conversationMessages: ChatMessage[];
  srData: SRData[];
  products?: QuotationData[];
  pastSupplierConversation: SupplierConversations | ChatMessage[];
  onReset: () => void;
  onLoadIntoPlayground?: () => void;
  isLoading?: boolean;
}

interface SaveScenarioButtonProps {
  name?: string;
  conversationMessages: ChatMessage[];
  srData: SRData[];
  products?: QuotationData[];
  pastSupplierConversation: SupplierConversations | ChatMessage[];
  onSaveSuccess?: (scenario: SaveScenarioResponse["data"]) => void;
  isLoading?: boolean;
}

function SaveScenarioButton({
  name,
  conversationMessages,
  srData,
  products,
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
          ...(products && products.length > 0 ? { products } : {}),
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
  products = [],
  pastSupplierConversation,
  onReset,
  onLoadIntoPlayground,
  isLoading,
}: GeneratedResultsProps) {
  const [expandedSections, setExpandedSections] = React.useState<{
    conversation: boolean;
    srData: boolean;
    products: boolean;
    supplierChat: boolean;
  }>({
    conversation: true,
    srData: true,
    products: true,
    supplierChat: true,
  });

  const [copiedSection, setCopiedSection] = React.useState<string | null>(null);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const supplierConversations = normalizeSupplierConversations(pastSupplierConversation);
  const supplierNames = Object.keys(supplierConversations);
  const totalSupplierMessages = countSupplierMessages(supplierConversations);

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
            products={products}
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

      {/* Products / Quotation Data Section */}
      {products.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300">
          <button
            onClick={() => toggleSection("products")}
            aria-expanded={expandedSections.products}
            className="flex w-full items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Package size={18} />
              </div>
              <div className="text-left">
                <span className="block font-serif font-bold text-foreground">
                  Products / Quotation Data
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  {products.length} product{products.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            {expandedSections.products ? (
              <ChevronUp size={18} className="text-muted-foreground/60" />
            ) : (
              <ChevronDown size={18} className="text-muted-foreground/60" />
            )}
          </button>

          {expandedSections.products && (
            <div className="border-t border-border p-6 bg-muted/5">
              <div className="flex flex-col gap-6">
                {products.map((product, idx) => {
                  const verdict = product.spec_matching_data?.verdict;
                  const verdictColor =
                    verdict === "shortlisted"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : verdict === "eliminated"
                        ? "bg-red-100 text-red-800 border-red-200"
                        : "bg-amber-100 text-amber-800 border-amber-200";

                  return (
                    <div
                      key={product.product_id || idx}
                      className="rounded-xl border border-border bg-background p-5 space-y-4"
                    >
                      {/* Header: Title + Verdict */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-serif font-semibold text-foreground text-sm truncate">
                            {product.cleanup_data?.product?.title_translated || product.cleanup_data?.product?.title || `Product ${idx + 1}`}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {product.cleanup_data?.product?.supplier_name || "Unknown supplier"}
                          </p>
                        </div>
                        {verdict && (
                          <Badge className={cn("text-[10px] font-bold uppercase tracking-wider border shrink-0", verdictColor)}>
                            {verdict}
                          </Badge>
                        )}
                      </div>

                      {/* Key Info Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        {/* Price */}
                        <div className="space-y-0.5">
                          <span className="text-muted-foreground">Price (CNY)</span>
                          <p className="font-medium text-foreground">
                            {product.cleanup_data?.product?.price
                              ? `${product.cleanup_data.product.price.price_min} – ${product.cleanup_data.product.price.price_max}`
                              : "—"}
                          </p>
                        </div>
                        {/* Price USD */}
                        <div className="space-y-0.5">
                          <span className="text-muted-foreground">Price (USD)</span>
                          <p className="font-medium text-foreground">
                            {product.cleanup_data?.product?.price_usd
                              ? `${product.cleanup_data.product.price_usd.price_min} – ${product.cleanup_data.product.price_usd.price_max}`
                              : "—"}
                          </p>
                        </div>
                        {/* MOQ */}
                        <div className="space-y-0.5">
                          <span className="text-muted-foreground">MOQ</span>
                          <p className="font-medium text-foreground">
                            {product.cleanup_data?.product?.moq != null
                              ? `${product.cleanup_data.product.moq} ${product.cleanup_data.product.moq_unit_translated || "pcs"}`
                              : "—"}
                          </p>
                        </div>
                        {/* Supplier Score */}
                        <div className="space-y-0.5">
                          <span className="text-muted-foreground">Supplier Score</span>
                          <p className="font-medium text-foreground">
                            {product.spec_matching_data?.supplier_score?.final_score != null
                              ? product.spec_matching_data.supplier_score.final_score.toFixed(2)
                              : "—"}
                          </p>
                        </div>
                      </div>

                      {/* Supplier Details */}
                      {product.cleanup_data?.supplier && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Location: {product.cleanup_data.supplier.location_translated || product.cleanup_data.supplier.location_str}</span>
                          <span>Type: {product.cleanup_data.supplier.is_factory ? "Factory" : product.cleanup_data.supplier.is_trader ? "Trader" : "Unknown"}</span>
                          <span>Years: {product.cleanup_data.supplier.years_in_business}</span>
                          <span>Rating: {product.cleanup_data.supplier.shop_rating ?? "—"}</span>
                        </div>
                      )}

                      {/* Spec Matching Scores */}
                      {product.spec_matching_data && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-medium text-foreground">
                            Veto: {product.spec_matching_data.veto_score?.toFixed(2) ?? "—"}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-medium text-foreground">
                            Re-rank: {product.spec_matching_data.rerank_match_score?.toFixed(2) ?? "—"}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-medium text-foreground">
                            Image: {product.spec_matching_data.image_rerank_score?.toFixed(2) ?? "—"}
                          </span>
                        </div>
                      )}

                      {/* Key Attributes */}
                      {product.cleanup_data?.attributes && product.cleanup_data.attributes.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                            Attributes
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {product.cleanup_data.attributes.slice(0, 12).map((attr, attrIdx) => (
                              <span
                                key={attrIdx}
                                className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-foreground"
                              >
                                <span className="font-medium">{attr.name_translated || attr.name}</span>
                                <span className="text-muted-foreground mx-1">:</span>
                                <span>{attr.value_translated || attr.value}</span>
                              </span>
                            ))}
                            {product.cleanup_data.attributes.length > 12 && (
                              <span className="inline-flex items-center text-[11px] text-muted-foreground">
                                +{product.cleanup_data.attributes.length - 12} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Facet Tags */}
                      {product.spec_matching_data?.facet_tags && Object.keys(product.spec_matching_data.facet_tags).length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                            Facets
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(product.spec_matching_data.facet_tags).map(([key, value]) => (
                              <span
                                key={key}
                                className="inline-flex items-center rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] text-foreground"
                              >
                                <span className="font-medium">{key}</span>
                                <span className="text-muted-foreground mx-1">:</span>
                                <span>{value}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Raw JSON Toggle */}
                      <details className="group">
                        <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 hover:text-foreground transition-colors">
                          Raw JSON
                        </summary>
                        <div className="mt-2 max-h-[300px] overflow-y-auto rounded-xl border border-border bg-background p-4 font-mono text-xs text-foreground/80 leading-relaxed scrollbar-thin scrollbar-thumb-border">
                          <pre>{formatJson(product)}</pre>
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    copyToClipboard(formatJson(products), "products")
                  }
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  {copiedSection === "products" ? (
                    <>
                      <Check size={14} className="mr-1.5 text-success" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} className="mr-1.5" />
                      Copy All JSON
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

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
                Past Supplier Conversations
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {supplierNames.length} supplier{supplierNames.length !== 1 ? "s" : ""} · {totalSupplierMessages} messages
              </span>
            </div>
          </div>
          {expandedSections.supplierChat ? (
            <ChevronUp size={18} className="text-muted-foreground/60" />
          ) : (
            <ChevronDown size={18} className="text-muted-foreground/60" />
          )}
        </button>

        {expandedSections.supplierChat && totalSupplierMessages > 0 && (
          <div className="border-t border-border p-6 bg-muted/5">
            <div className="flex flex-col gap-6">
              {supplierNames.map((supplierName) => (
                <div key={supplierName} className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                    {supplierName}
                  </h4>
                  <div className="flex flex-col gap-5">
                    {supplierConversations[supplierName].map((msg, idx) => (
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
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  copyToClipboard(
                    supplierNames
                      .map((name) =>
                        [
                          `--- ${name} ---`,
                          ...supplierConversations[name].map((m) => `${m.role}: ${m.content}`),
                        ].join("\n"),
                      )
                      .join("\n"),
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
