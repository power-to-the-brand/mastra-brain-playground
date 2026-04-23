"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, ChevronDown, ChevronUp, GripVertical } from "lucide-react";

const PARAM_TYPES = ["string", "number", "boolean", "array", "object"] as const;
type ParamType = (typeof PARAM_TYPES)[number];

interface InputParam {
  id: string;
  name: string;
  type: ParamType;
  description: string;
  required: boolean;
}

export interface MockToolData {
  id?: string;
  toolId: string;
  name: string;
  description: string;
  inputSchema: InputParam[];
  mockMode: "fixed_response" | "llm_simulated";
  mockFixedResponse: string;
  mockSimulationPrompt: string;
  mockSimulationModel: string;
}

interface MockToolBuilderProps {
  tools: MockToolData[];
  onChange: (tools: MockToolData[]) => void;
  availableModels: { label: string; value: string }[];
}

function normalizeToolId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-+/g, "-");
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function MockToolBuilder({
  tools,
  onChange,
  availableModels,
}: MockToolBuilderProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addTool = () => {
    const newTool: MockToolData = {
      toolId: "",
      name: "",
      description: "",
      inputSchema: [],
      mockMode: "fixed_response",
      mockFixedResponse: "",
      mockSimulationPrompt: "",
      mockSimulationModel: availableModels[0]?.value ?? "",
    };
    onChange([...tools, newTool]);
    setExpandedId(newTool.toolId);
  };

  const updateTool = (index: number, updates: Partial<MockToolData>) => {
    const updated = [...tools];
    updated[index] = { ...updated[index], ...updates };
    if (updates.name !== undefined) {
      updated[index].toolId = normalizeToolId(updates.name);
    }
    onChange(updated);
  };

  const removeTool = (index: number) => {
    onChange(tools.filter((_, i) => i !== index));
  };

  const addParam = (toolIndex: number) => {
    const updated = [...tools];
    updated[toolIndex].inputSchema.push({
      id: generateId(),
      name: "",
      type: "string",
      description: "",
      required: true,
    });
    onChange(updated);
  };

  const updateParam = (
    toolIndex: number,
    paramIndex: number,
    updates: Partial<InputParam>,
  ) => {
    const updated = [...tools];
    updated[toolIndex].inputSchema[paramIndex] = {
      ...updated[toolIndex].inputSchema[paramIndex],
      ...updates,
    };
    onChange(updated);
  };

  const removeParam = (toolIndex: number, paramIndex: number) => {
    const updated = [...tools];
    updated[toolIndex].inputSchema.splice(paramIndex, 1);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {tools.map((tool, toolIndex) => {
          const isExpanded = expandedId === tool.toolId;
          const paramCount = tool.inputSchema.length;
          return (
            <div
              key={tool.toolId + toolIndex}
              className="border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-950 overflow-hidden"
            >
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : tool.toolId)}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-stone-400" />
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {tool.name || "Unnamed Tool"}
                  </span>
                  <Badge variant="secondary" className="text-xs bg-stone-100 dark:bg-stone-800">
                    {paramCount} param{paramCount !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-stone-500" /> : <ChevronDown className="h-4 w-4 text-stone-500" />}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeTool(toolIndex); }}
                    className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-stone-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-2 space-y-4 border-t border-stone-100 dark:border-stone-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-stone-700 dark:text-stone-300 text-sm">Tool Name</Label>
                      <input
                        value={tool.name}
                        onChange={(e) => updateTool(toolIndex, { name: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                        placeholder="e.g. Get Quotation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-stone-700 dark:text-stone-300 text-sm">Tool ID</Label>
                      <input value={tool.toolId} readOnly
                        className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-md text-sm text-stone-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-stone-700 dark:text-stone-300 text-sm">Description</Label>
                    <input
                      value={tool.description}
                      onChange={(e) => updateTool(toolIndex, { description: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                      placeholder="What does this tool do?"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-stone-700 dark:text-stone-300 text-sm">Parameters</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => addParam(toolIndex)}>+ Add</Button>
                    </div>
                    {tool.inputSchema.length === 0 ? (
                      <p className="text-xs text-stone-400 italic">No parameters defined.</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_120px_1fr_60px_40px] gap-2 text-xs text-stone-500 uppercase tracking-wider px-2">
                          <span>Name</span><span>Type</span><span>Description</span>
                          <span className="text-center">Req.</span><span />
                        </div>
                        {tool.inputSchema.map((param, paramIndex) => (
                          <div key={param.id} className="grid grid-cols-[1fr_120px_1fr_60px_40px] gap-2 items-center">
                            <input value={param.name}
                              onChange={(e) => updateParam(toolIndex, paramIndex, { name: e.target.value })}
                              className="px-2 py-1.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md text-sm focus:outline-none focus:border-amber-500"
                              placeholder="paramName"
                            />
                            <select value={param.type}
                              onChange={(e) => updateParam(toolIndex, paramIndex, { type: e.target.value as ParamType })}
                              className="px-2 py-1.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md text-sm focus:outline-none focus:border-amber-500"
                            >
                              {PARAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <input value={param.description}
                              onChange={(e) => updateParam(toolIndex, paramIndex, { description: e.target.value })}
                              className="px-2 py-1.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md text-sm focus:outline-none focus:border-amber-500"
                              placeholder="Optional description"
                            />
                            <div className="flex justify-center">
                              <input type="checkbox" checked={param.required}
                                onChange={(e) => updateParam(toolIndex, paramIndex, { required: e.target.checked })}
                                className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                              />
                            </div>
                            <button type="button" onClick={() => removeParam(toolIndex, paramIndex)}
                              className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-stone-400 hover:text-red-500 transition-colors flex justify-center"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <Label className="text-stone-700 dark:text-stone-300 text-sm">Mock Mode</Label>
                    <select value={tool.mockMode}
                      onChange={(e) => updateTool(toolIndex, { mockMode: e.target.value as MockToolData["mockMode"] })}
                      className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                    >
                      <option value="fixed_response">Fixed Response</option>
                      <option value="llm_simulated">LLM Simulated</option>
                    </select>

                    {tool.mockMode === "fixed_response" ? (
                      <div className="space-y-2">
                        <Label className="text-stone-700 dark:text-stone-300 text-sm">Fixed Response (JSON)</Label>
                        <textarea value={tool.mockFixedResponse}
                          onChange={(e) => updateTool(toolIndex, { mockFixedResponse: e.target.value })}
                          className="w-full min-h-[80px] px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm font-mono"
                          placeholder='{"price": 100, "currency": "USD"}'
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-stone-700 dark:text-stone-300 text-sm">Simulation Prompt</Label>
                          <textarea value={tool.mockSimulationPrompt}
                            onChange={(e) => updateTool(toolIndex, { mockSimulationPrompt: e.target.value })}
                            className="w-full min-h-[80px] px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                            placeholder="You are a tool that returns realistic pricing data..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-stone-700 dark:text-stone-300 text-sm">Model</Label>
                          <select value={tool.mockSimulationModel}
                            onChange={(e) => updateTool(toolIndex, { mockSimulationModel: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                          >
                            {availableModels.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" onClick={addTool} className="w-full">
        + Add Mock Tool
      </Button>
    </div>
  );
}
