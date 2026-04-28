"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2 } from "lucide-react";
import type { MockTool } from "@/db";
import { GEMINI_MODELS, DEFAULT_GEMINI_MODEL } from "@/lib/models";

const PARAM_TYPES = ["string", "number", "boolean", "array", "object"] as const;
type ParamType = (typeof PARAM_TYPES)[number];

interface InputParam {
  id: string;
  name: string;
  type: ParamType;
  description: string;
  required: boolean;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function normalizeToolId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-+/g, "-");
}

interface MockToolEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mockTool: MockTool | null;
  onSave: (data: Partial<MockTool>) => Promise<void>;
  isSaving: boolean;
}

function buildInitialState(mockTool: MockTool | null): {
  name: string;
  description: string;
  inputSchema: InputParam[];
  mockMode: "fixed_response" | "llm_simulated";
  mockFixedResponse: string;
  mockSimulationPrompt: string;
  mockSimulationModel: string;
} {
  if (!mockTool) {
    return {
      name: "",
      description: "",
      inputSchema: [],
      mockMode: "fixed_response",
      mockFixedResponse: "",
      mockSimulationPrompt: "",
      mockSimulationModel: DEFAULT_GEMINI_MODEL,
    };
  }
  const schema = Array.isArray(mockTool.inputSchema)
    ? mockTool.inputSchema.map((p: any) => ({
        id: generateId(),
        name: p.name ?? "",
        type: (p.type as ParamType) ?? "string",
        description: p.description ?? "",
        required: p.required ?? true,
      }))
    : [];
  return {
    name: mockTool.name,
    description: mockTool.description ?? "",
    inputSchema: schema,
    mockMode: mockTool.mockMode === "llm_simulated" ? "llm_simulated" : "fixed_response",
    mockFixedResponse: mockTool.mockFixedResponse
      ? JSON.stringify(mockTool.mockFixedResponse, null, 2)
      : "",
    mockSimulationPrompt: mockTool.mockSimulationPrompt ?? "",
    mockSimulationModel: mockTool.mockSimulationModel ?? DEFAULT_GEMINI_MODEL,
  };
}

function InnerForm({
  mockTool,
  onSave,
  isSaving,
  onCancel,
}: {
  mockTool: MockTool | null;
  onSave: (data: Partial<MockTool>) => Promise<void>;
  isSaving: boolean;
  onCancel: () => void;
}) {
  const initial = buildInitialState(mockTool);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [inputSchema, setInputSchema] = useState<InputParam[]>(initial.inputSchema);
  const [mockMode, setMockMode] = useState<"fixed_response" | "llm_simulated">(initial.mockMode);
  const [mockFixedResponse, setMockFixedResponse] = useState(initial.mockFixedResponse);
  const [mockSimulationPrompt, setMockSimulationPrompt] = useState(initial.mockSimulationPrompt);
  const [mockSimulationModel, setMockSimulationModel] = useState(initial.mockSimulationModel);
  const [fixedResponseError, setFixedResponseError] = useState<string | undefined>();

  const addParam = () => {
    setInputSchema((prev) => [
      ...prev,
      { id: generateId(), name: "", type: "string", description: "", required: true },
    ]);
  };

  const updateParam = (index: number, updates: Partial<InputParam>) => {
    setInputSchema((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...updates } : p))
    );
  };

  const removeParam = (index: number) => {
    setInputSchema((prev) => prev.filter((_, i) => i !== index));
  };

  const validateFixedResponse = (value: string): boolean => {
    if (!value.trim()) {
      setFixedResponseError(undefined);
      return true;
    }
    try {
      JSON.parse(value);
      setFixedResponseError(undefined);
      return true;
    } catch {
      setFixedResponseError("Invalid JSON");
      return false;
    }
  };

  const toolId = mockTool ? mockTool.toolId : normalizeToolId(name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!toolId.trim() || !name.trim()) return;

    if (mockMode === "fixed_response" && !validateFixedResponse(mockFixedResponse)) {
      return;
    }

    const payload: Partial<MockTool> = {
      id: mockTool?.id,
      toolId,
      name,
      description: description || null,
      inputSchema: inputSchema.map((p) => ({
        name: p.name,
        type: p.type,
        description: p.description,
        required: p.required,
      })),
      mockMode,
      mockFixedResponse:
        mockMode === "fixed_response" && mockFixedResponse.trim()
          ? JSON.parse(mockFixedResponse)
          : null,
      mockSimulationPrompt: mockMode === "llm_simulated" ? mockSimulationPrompt || null : null,
      mockSimulationModel: mockMode === "llm_simulated" ? mockSimulationModel || null : null,
    };

    await onSave(payload);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-stone-900 dark:text-stone-100">
          {mockTool ? "Edit Mock Tool" : "Create Mock Tool"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-stone-700 dark:text-stone-300">
              Name *
            </Label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              placeholder="e.g. Get Quotation"
            />
          </div>

          {/* Tool ID */}
          <div className="space-y-2">
            <Label htmlFor="toolId" className="text-stone-700 dark:text-stone-300">
              Tool ID
            </Label>
            <input
              id="toolId"
              type="text"
              value={toolId}
              readOnly
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-md text-sm text-stone-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-stone-700 dark:text-stone-300">
              Description
            </Label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              placeholder="What does this tool do?"
            />
          </div>

          {/* Parameters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-stone-700 dark:text-stone-300">Parameters</Label>
              <Button type="button" variant="outline" size="sm" onClick={addParam}>
                + Add
              </Button>
            </div>
            {inputSchema.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No parameters defined.</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_120px_1fr_60px_40px] gap-2 text-xs text-stone-500 uppercase tracking-wider px-2">
                  <span>Name</span>
                  <span>Type</span>
                  <span>Description</span>
                  <span className="text-center">Req.</span>
                  <span />
                </div>
                {inputSchema.map((param, index) => (
                  <div
                    key={param.id}
                    className="grid grid-cols-[1fr_120px_1fr_60px_40px] gap-2 items-center"
                  >
                    <input
                      value={param.name}
                      onChange={(e) => updateParam(index, { name: e.target.value })}
                      className="px-2 py-1.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md text-sm focus:outline-none focus:border-amber-500"
                      placeholder="paramName"
                    />
                    <select
                      value={param.type}
                      onChange={(e) =>
                        updateParam(index, { type: e.target.value as ParamType })
                      }
                      className="px-2 py-1.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md text-sm focus:outline-none focus:border-amber-500"
                    >
                      {PARAM_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <input
                      value={param.description}
                      onChange={(e) =>
                        updateParam(index, { description: e.target.value })
                      }
                      className="px-2 py-1.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md text-sm focus:outline-none focus:border-amber-500"
                      placeholder="Optional description"
                    />
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={param.required}
                        onChange={(e) =>
                          updateParam(index, { required: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeParam(index)}
                      className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-stone-400 hover:text-red-500 transition-colors flex justify-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mock Mode */}
          <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            <Label htmlFor="mockMode" className="text-stone-700 dark:text-stone-300">
              Mock Mode *
            </Label>
            <select
              id="mockMode"
              value={mockMode}
              onChange={(e) =>
                setMockMode(e.target.value as "fixed_response" | "llm_simulated")
              }
              className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
            >
              <option value="fixed_response">Fixed Response</option>
              <option value="llm_simulated">LLM Simulated</option>
            </select>
          </div>

          {/* Fixed Response */}
          {mockMode === "fixed_response" && (
            <div className="space-y-2">
              <Label
                htmlFor="mockFixedResponse"
                className="text-stone-700 dark:text-stone-300"
              >
                Fixed Response (JSON)
              </Label>
              <textarea
                id="mockFixedResponse"
                rows={4}
                value={mockFixedResponse}
                onChange={(e) => {
                  setMockFixedResponse(e.target.value);
                  validateFixedResponse(e.target.value);
                }}
                className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm font-mono resize-y"
                placeholder='{"price": 100, "currency": "USD"}'
              />
              {fixedResponseError && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {fixedResponseError}
                </p>
              )}
            </div>
          )}

          {/* LLM Simulated */}
          {mockMode === "llm_simulated" && (
            <>
              <div className="space-y-2">
                <Label
                  htmlFor="mockSimulationPrompt"
                  className="text-stone-700 dark:text-stone-300"
                >
                  Simulation Prompt
                </Label>
                <textarea
                  id="mockSimulationPrompt"
                  rows={4}
                  value={mockSimulationPrompt}
                  onChange={(e) => setMockSimulationPrompt(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm resize-y"
                  placeholder="You are a tool that returns realistic pricing data..."
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="mockSimulationModel"
                  className="text-stone-700 dark:text-stone-300"
                >
                  Model
                </Label>
                <select
                  id="mockSimulationModel"
                  value={mockSimulationModel}
                  onChange={(e) => setMockSimulationModel(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                >
                  {GEMINI_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
              className="border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mockTool ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
    </>
  );
}

export function MockToolEditorDialog({
  open,
  onOpenChange,
  mockTool,
  onSave,
  isSaving,
}: MockToolEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800">
        <InnerForm
          key={mockTool?.id ?? "new"}
          mockTool={mockTool}
          onSave={onSave}
          isSaving={isSaving}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
