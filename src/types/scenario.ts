// Type definitions for Scenario Builder

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

export interface VetoSpec {
  spec_id: number;
  spec_name: string;
  mandatory_values: string[];
  unacceptable_values: string[];
  spec_type: string;
  source: string;
  text_confirmation: boolean;
  classification: string;
  matching_rule: string;
  reasoning: string;
  veto_score: number;
  priority_signal: string;
}

export interface ReRankSpec {
  spec_id: number;
  spec_name: string;
  value: string;
  score: number;
  reason: string;
}

export interface OriginalRequirement {
  title: string;
  description: string;
  reference_images: string[];
  target_price: number | null;
  target_price_currency: string;
  target_quantity: number;
  target_quantity_unit: string;
  needs_customization: boolean;
  num_options: number;
  customization_reference_url: string[];
  customization_type: string | null;
  customization_description: string | null;
}

export interface SRData {
  runId: string;
  original_requirement: OriginalRequirement;
  specs: {
    veto_specs: VetoSpec[];
    re_rank_specs: ReRankSpec[];
  };
  reference_images: string[];
  sourcing_type: string;
}

export interface ScenarioOutput {
  conversationMessages: ChatMessage[];
  srData: SRData[];
  pastSupplierConversation: ChatMessage[];
}
