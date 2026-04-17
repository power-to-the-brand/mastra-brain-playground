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

// ── Quotation Data Types (1688-style) ────────────────────────────────

export interface SupplierRating {
  title: string;
  type: string;
  score: string;
}

export interface SupplierInfo {
  shop_ratings: SupplierRating[];
  company_id: string;
  is_super_factory: boolean;
  shop_url: string;
  shop_rating: number;
  logistics_rating: number;
  supplier_id: string;
  seller_id: string | null;
  tp_year: string;
  is_flagship_shop: boolean;
  shop_logo: string;
  is_manufacturer: boolean;
  is_industry_brand: boolean;
  shop_name: string;
  shop_name_translated: string;
  platform_login_id: string;
  member_id: string;
  certifications: string[];
  company_name_translated: string;
  company_name: string;
  is_tp: boolean;
  is_factory: boolean;
  years_in_business: number;
  location_translated: string;
  location_str: string;
  is_trader: boolean;
}

export interface AttributeSource {
  image_url: string | null;
  path: string;
  kind: string;
  image_index: number | null;
  confidence: number;
  model_name: string | null;
}

export interface ProductAttribute {
  name: string;
  value: string;
  name_translated: string;
  sources: AttributeSource[];
  normalized_value: string;
  value_translated: string;
  confidence: number;
  skuid_list: string[];
}

export interface ProductVariant {
  weight_defaulted: boolean;
  height_cm: string;
  dimensions_estimated: boolean;
  is_ghost_variant: boolean;
  props_names_translated: string;
  weight_per_unit_kg: string;
  dimensions_confidence: number;
  length_cm: string;
  images: string[];
  props_names: string;
  skuid: string;
  width_cm: string;
}

export interface SpecCoverage {
  total_specs: number;
  extracted_details: Record<string, unknown>;
  not_found: number;
  not_found_specs: string[];
  matched_to_existing: number;
  derived_from_related: number;
  newly_extracted: number;
  matched_details: Record<string, { value: string; attribute_name: string }>;
  derived_details: Record<string, unknown>;
  added_to_attributes: number;
}

export interface ProductPrice {
  price_max: string;
  price_min: string;
  currency: string;
}

export interface ProductInfo {
  supplier_name: string;
  title_translated: string;
  product_url: string;
  exchange_rate: number;
  supplier_rating: {
    average: number;
    details: SupplierRating[];
    count: number;
  };
  desc_images: string[];
  price: ProductPrice;
  moq_unit: string;
  source_currency: string;
  image_urls: string[];
  price_usd: ProductPrice;
  moq_unit_translated: string;
  taxonomy_id: number;
  title: string;
  product_category: string;
  title_summarized: string;
  moq: number;
}

export interface MetadataTimings {
  [key: string]: number;
}

export interface ProductMetadata {
  processing_time_seconds: number;
  timings: MetadataTimings;
  processed_at: string;
  platform: string;
}

export interface CleanupData {
  supplier: SupplierInfo;
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  _spec_coverage: SpecCoverage;
  product: ProductInfo;
  _metadata: ProductMetadata;
}

// ── Spec Matching Data Types ──────────────────────────────────────────

export interface VetoSpecMatch {
  product_value: string | null;
  spec_name: string;
  matched_attribute_name: string | null;
  source: string;
  reasoning: string;
  match_type: "match" | "not_match" | "unknown";
  spec_id: number;
  matching_rule: string;
  relevance_score: number;
  spec_type: string;
  spec_values: string[];
  veto_score: number;
}

export interface ReRankSpecMatch {
  product_value: string | null;
  spec_name: string;
  matched_attribute_name: string | null;
  source: string;
  reasoning: string;
  match_type: "match" | "not_match" | "unknown";
  spec_id: number;
  matching_rule: string;
  relevance_score: number;
  spec_type: string;
  spec_values: string[];
}

export interface SupplierScore {
  category_score: number;
  supplier_type_score: number;
  comprehensive_service_rating: number;
  reasoning: string;
  final_score: number;
  supplier_type: string;
  service_score: number;
}

export interface SpecMatchingData {
  created_at: string;
  cluster: string;
  rerank_specs: ReRankSpecMatch[];
  veto_specs: VetoSpecMatch[];
  metadata: {
    matching_mode: string;
    agentic_turns: number;
    agentic_duration_sec: number;
  };
  image_rerank_score: number;
  veto_score: number;
  run_id: string;
  rerank_match_score: number;
  verdict: "shortlisted" | "eliminated" | "needs_review";
  facet_tags: Record<string, string>;
  supplier_score: SupplierScore;
}

export interface QuotationData {
  product_id: string;
  product_url: string;
  search_source: string;
  stage: string;
  error: string | null;
  is_human_shortlisted: boolean;
  latest_cluster: string;
  feedback_source: string | null;
  created_at: string;
  updated_at: string;
  cleanup_data: CleanupData;
  spec_matching_data: SpecMatchingData;
}

export interface ScenarioOutput {
  name: string;
  conversationMessages: ChatMessage[];
  srData: SRData[];
  products: QuotationData[];
  pastSupplierConversation: ChatMessage[];
}

// Save scenario request interface
export interface SaveScenarioRequest {
  name: string;
  conversationMessages: ChatMessage[];
  srData: SRData[];
  products?: QuotationData[];
  pastSupplierConversation: ChatMessage[];
}

// Save scenario response interface
export interface SaveScenarioResponse {
  data: {
    id: string;
    name: string;
    conversationMessages: ChatMessage[];
    srData: SRData[];
    products?: QuotationData[];
    pastSupplierConversation: ChatMessage[];
    createdAt: string;
  };
}