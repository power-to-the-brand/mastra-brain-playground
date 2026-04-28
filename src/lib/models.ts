/**
 * Centralised model configurations used across the application.
 *
 * Add new models here — every consumer imports from this single source of truth.
 */

export interface ModelOption {
  label: string;
  value: string;
}

/** Gemini models available for mock-tool simulation and agent configuration */
export const GEMINI_MODELS: ModelOption[] = [
  {
    label: "Gemini 3.1 Flash Lite Preview",
    value: "google/gemini-3.1-flash-lite-preview",
  },
  { label: "Gemini 3 Flash Preview", value: "google/gemini-3-flash-preview" },
  { label: "Gemini 3.1 Pro Preview", value: "google/gemini-3.1-pro-preview" },
  { label: "Gemini 2.5 Flash", value: "google/gemini-2.5-flash" },
  { label: "Gemini 2.5 Flash Lite", value: "google/gemini-2.5-flash-lite" },
];

/** Judge models available for evaluation */
export const JUDGE_MODELS = GEMINI_MODELS;

/** Default model values */
export const DEFAULT_GEMINI_MODEL = GEMINI_MODELS[0].value;
export const DEFAULT_JUDGE_MODEL = JUDGE_MODELS[0].value;

/** Allowed model identifiers for server-side validation */
export const ALLOWED_MODELS = GEMINI_MODELS.map((m) => m.value);
