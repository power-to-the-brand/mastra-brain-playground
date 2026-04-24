"use client";

import { useAui, useAuiState } from "@assistant-ui/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageSquare, ClipboardList, Package, History } from "lucide-react";

export interface ContextData {
  conversationMessages?: unknown[] | null;
  srData?: unknown[] | null;
  products?: unknown[] | null;
  supplierHistory?: unknown[] | null;
}

interface ContextInjectorProps {
  contextData: ContextData;
}

interface ContextItem {
  key: keyof ContextData;
  label: string;
  icon: React.ReactNode;
  data: unknown[] | null | undefined;
}

export const PLACEHOLDERS: Record<keyof ContextData, string> = {
  conversationMessages: "${CONVERSATION_MESSAGES}",
  srData: "${SR_DATA}",
  products: "${PRODUCTS}",
  supplierHistory: "${SUPPLIER_HISTORY}",
};

export function replacePlaceholders(
  text: string,
  contextData: ContextData
): string {
  let result = text;

  for (const [key, placeholder] of Object.entries(PLACEHOLDERS)) {
    if (!result.includes(placeholder)) continue;

    const data = contextData[key as keyof ContextData];
    if (!Array.isArray(data) || data.length === 0) {
      result = result.replaceAll(placeholder, "");
      continue;
    }

    const labelMap: Record<keyof ContextData, string> = {
      conversationMessages: "Messages",
      srData: "SR Data",
      products: "Products",
      supplierHistory: "Supplier History",
    };
    const formatted = formatContext(labelMap[key as keyof ContextData], data);
    result = result.replaceAll(placeholder, formatted);
  }

  return result.replace(/\n{3,}/g, "\n\n").trim();
}

function formatContext(name: string, data: unknown): string {
  if (Array.isArray(data) && data.length > 0) {
    const firstItem = data[0];
    if (
      typeof firstItem === "object" &&
      firstItem !== null &&
      ("role" in firstItem || "content" in firstItem || "message" in firstItem)
    ) {
      const lines = data.map((m: any) => {
        const role = m.role || m.sender || "unknown";
        const content = m.content || m.message || m.text || JSON.stringify(m);
        return `[${role}]: ${content}`;
      });
      return `\n--- ${name} ---\n${lines.join("\n\n")}\n---\n`;
    }
  }

  return `\n--- ${name} ---\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n---\n`;
}

export function ContextInjector({ contextData }: ContextInjectorProps) {
  const aui = useAui();
  const composerText = useAuiState((s) => s.composer.text);

  const items: ContextItem[] = [
    {
      key: "conversationMessages",
      label: "Messages",
      icon: <MessageSquare className="h-3 w-3" />,
      data: contextData.conversationMessages,
    },
    {
      key: "srData",
      label: "SR Data",
      icon: <ClipboardList className="h-3 w-3" />,
      data: contextData.srData,
    },
    {
      key: "products",
      label: "Products",
      icon: <Package className="h-3 w-3" />,
      data: contextData.products,
    },
    {
      key: "supplierHistory",
      label: "Supplier History",
      icon: <History className="h-3 w-3" />,
      data: contextData.supplierHistory,
    },
  ];

  const availableItems = items.filter(
    (item) => Array.isArray(item.data) && item.data.length > 0
  );

  if (availableItems.length === 0) return null;

  const handleInject = (item: ContextItem) => {
    if (!item.data) return;

    const placeholder = PLACEHOLDERS[item.key];
    const currentText = composerText ?? "";

    if (currentText.includes(placeholder)) return;

    const newText = currentText
      ? `${currentText}\n${placeholder}`
      : placeholder;

    aui.composer().setText(newText);

    setTimeout(() => {
      const textarea = document.querySelector(
        "[data-slot='aui_composer-shell'] textarea"
      ) as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.focus();
        textarea.scrollTop = textarea.scrollHeight;
      }
    }, 0);
  };

  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 self-center mr-1">
        Inject:
      </span>
      {availableItems.map((item) => (
        <button
          type="button"
          key={item.key}
          onClick={() => handleInject(item)}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
            "border transition-all duration-150 hover:scale-105 active:scale-95",
            "bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700",
            "text-stone-500 dark:text-stone-400 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400",
            "hover:bg-amber-50 dark:hover:bg-amber-950/20"
          )}
          title={`Inject ${item.label} into message`}
        >
          {item.icon}
          {item.label}
          <Badge
            variant="secondary"
            className="h-3.5 min-w-3.5 px-1 text-[9px] bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
          >
            {item.data!.length}
          </Badge>
        </button>
      ))}
    </div>
  );
}
