import type { ChatMessage } from "@/types/scenario";

export type SupplierConversations = Record<string, ChatMessage[]>;

export function normalizeSupplierConversations(
  data: unknown,
): SupplierConversations {
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    return data as SupplierConversations;
  }
  if (Array.isArray(data) && data.length > 0) {
    return { Supplier: data as ChatMessage[] };
  }
  return {};
}

export function flattenSupplierConversations(
  data: SupplierConversations,
): ChatMessage[] {
  return Object.values(data).flat();
}

export function countSupplierMessages(
  data: SupplierConversations,
): number {
  return Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
}
