"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, RefreshCw } from "lucide-react";
import { MockToolBuilder, MockToolData } from "@/components/agents/mock-tool-builder";

interface AgentData {
  id: string;
  name: string;
  description?: string;
  model: string;
  instruction: string;
  subagents?: { subagentId: string }[];
  skills?: { skillId: string }[];
  tools?: { toolId: string; toolType: string }[];
}

interface AgentFormProps {
  agent?: AgentData | null;
  availableAgents: AgentData[];
  availableSkills: { id: string; name: string }[];
  availableTools: { id: string; name: string; description: string }[];
  availableMockTools: { id: string; name: string; description: string; toolId: string }[];
  onSuccess: () => void;
  onCancel: () => void;
  onRefreshTools?: () => void;
  isRefreshingTools?: boolean;
}

const MODELS = [
  { label: "Gemini 3.1 Flash Lite Preview", value: "google/gemini-3.1-flash-lite-preview" },
  { label: "Gemini 3 Flash Preview", value: "google/gemini-3-flash-preview" },
  { label: "Gemini 2.0 Flash", value: "google/gemini-2.0-flash" },
];

export function AgentForm({
  agent,
  availableAgents,
  availableSkills,
  availableTools,
  availableMockTools,
  onSuccess,
  onCancel,
  onRefreshTools,
  isRefreshingTools,
}: AgentFormProps) {
  const [name, setName] = useState(agent?.name || "");
  const [description, setDescription] = useState(agent?.description || "");
  const [model, setModel] = useState(agent?.model || MODELS[0].value);
  const [instruction, setInstruction] = useState(agent?.instruction || "");
  const [selectedSubagentIds, setSelectedSubagentIds] = useState<string[]>(
    Array.isArray(agent?.subagents) ? agent.subagents.map((s) => s.subagentId) : []
  );
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(
    Array.isArray(agent?.skills) ? agent.skills.map((s) => s.skillId) : []
  );
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>(
    Array.isArray(agent?.tools)
      ? agent.tools.filter((t) => t.toolType !== "mock").map((t) => t.toolId)
      : []
  );
  const [selectedMockToolIds, setSelectedMockToolIds] = useState<string[]>(
    Array.isArray(agent?.tools)
      ? agent.tools.filter((t) => t.toolType === "mock").map((t) => t.toolId)
      : []
  );
  const [builderTools, setBuilderTools] = useState<MockToolData[]>([]);
  const [isSavingMockTools, setIsSavingMockTools] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (agent) {
      setName(agent.name || "");
      setDescription(agent.description || "");
      setModel(agent.model || MODELS[0].value);
      setInstruction(agent.instruction || "");
      setSelectedSubagentIds(
        Array.isArray(agent.subagents) ? agent.subagents.map((s) => s.subagentId) : []
      );
      setSelectedSkillIds(
        Array.isArray(agent.skills) ? agent.skills.map((s) => s.skillId) : []
      );
      setSelectedToolIds(
        Array.isArray(agent.tools)
          ? agent.tools.filter((t) => t.toolType !== "mock").map((t) => t.toolId)
          : []
      );
      setSelectedMockToolIds(
        Array.isArray(agent.tools)
          ? agent.tools.filter((t) => t.toolType === "mock").map((t) => t.toolId)
          : []
      );
    }
  }, [agent]);

  const saveMockTools = async (): Promise<string[]> => {
    setIsSavingMockTools(true);
    const savedIds: string[] = [...selectedMockToolIds];

    try {
      for (const tool of builderTools) {
        if (!tool.name.trim()) continue;

        const payload = {
          toolId: tool.toolId,
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema.map((p) => ({
            name: p.name,
            type: p.type,
            description: p.description,
            required: p.required,
          })),
          mockMode: tool.mockMode,
          mockFixedResponse:
            tool.mockMode === "fixed_response" && tool.mockFixedResponse
              ? JSON.parse(tool.mockFixedResponse)
              : null,
          mockSimulationPrompt:
            tool.mockMode === "llm_simulated" ? tool.mockSimulationPrompt : null,
          mockSimulationModel:
            tool.mockMode === "llm_simulated" ? tool.mockSimulationModel : null,
        };

        if (tool.id) {
          const res = await fetch(`/api/mock-tools/${tool.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const data = await res.json();
            savedIds.push(data.data.toolId);
          }
        } else {
          const res = await fetch("/api/mock-tools", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const data = await res.json();
            savedIds.push(data.data.toolId);
          }
        }
      }
    } catch (error) {
      console.error("Error saving mock tools:", error);
    } finally {
      setIsSavingMockTools(false);
    }

    return savedIds;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const mockToolIds = await saveMockTools();

    const payload = {
      name,
      description,
      model,
      instruction,
      subagentIds: selectedSubagentIds,
      skillIds: selectedSkillIds,
      toolIds: selectedToolIds,
      mockToolIds,
    };

    console.log("Saving agent with payload:", payload);

    try {
      const url = agent ? `/api/agents/${agent.id}` : "/api/agents";
      const method = agent ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error saving agent:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSubagent = (id: string) => {
    setSelectedSubagentIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSkill = (id: string) => {
    setSelectedSkillIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleTool = (id: string) => {
    setSelectedToolIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleMockTool = (id: string) => {
    setSelectedMockToolIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-stone-700 dark:text-stone-300">Agent Name</Label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          placeholder="e.g. Weather Researcher"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-stone-700 dark:text-stone-300">Description</Label>
        <input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          placeholder="Briefly describe what this agent does..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="model" className="text-stone-700 dark:text-stone-300">Model</Label>
        <select
          id="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
        >
          {MODELS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instruction" className="text-stone-700 dark:text-stone-300">System Instruction</Label>
        <Textarea
          id="instruction"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          className="min-h-30 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 focus:ring-amber-500/20 focus:border-amber-500"
          placeholder="Describe how the agent should behave..."
          required
        />
      </div>

      <div className="space-y-3">
        <Label className="text-stone-700 dark:text-stone-300">Subagents</Label>
        <div className="flex flex-wrap gap-2">
          {availableAgents.length === 0 ? (
            <p className="text-xs text-stone-500 italic">No other agents available to add as subagents.</p>
          ) : (
            availableAgents.map((a) => (
              <Badge
                key={a.id}
                variant={selectedSubagentIds.includes(a.id) ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  selectedSubagentIds.includes(a.id) 
                    ? "bg-amber-600 hover:bg-amber-700 text-white border-none" 
                    : "hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
                onClick={() => toggleSubagent(a.id)}
              >
                {a.name}
                {selectedSubagentIds.includes(a.id) && <Check className="ml-1 h-3 w-3" />}
              </Badge>
            ))
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-stone-700 dark:text-stone-300">Skills</Label>
        <div className="flex flex-wrap gap-2">
          {availableSkills.length === 0 ? (
            <p className="text-xs text-stone-500 italic">No skills available to add.</p>
          ) : (
            availableSkills.map((s) => (
              <Badge
                key={s.id}
                variant={selectedSkillIds.includes(s.id) ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  selectedSkillIds.includes(s.id) 
                    ? "bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 border-none" 
                    : "hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
                onClick={() => toggleSkill(s.id)}
              >
                {s.name}
                {selectedSkillIds.includes(s.id) && <Check className="ml-1 h-3 w-3" />}
              </Badge>
            ))
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-stone-700 dark:text-stone-300">Tools</Label>
          {onRefreshTools && (
            <button
              type="button"
              onClick={onRefreshTools}
              disabled={isRefreshingTools}
              className="p-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-50"
              title="Refresh tools"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-stone-500 ${isRefreshingTools ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {availableTools.length === 0 ? (
            <p className="text-xs text-stone-500 italic">No tools available to add.</p>
          ) : (
            availableTools.map((t) => (
              <Badge
                key={t.id}
                variant={selectedToolIds.includes(t.id) ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  selectedToolIds.includes(t.id) 
                    ? "bg-blue-600 hover:bg-blue-700 text-white border-none" 
                    : "hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
                onClick={() => toggleTool(t.id)}
                title={t.description}
              >
                {t.name}
                {selectedToolIds.includes(t.id) && <Check className="ml-1 h-3 w-3" />}
              </Badge>
            ))
          )}
        </div>
      </div>

      {/* Mock Tools Builder */}
      <div className="space-y-3 pt-2 border-t border-stone-200 dark:border-stone-800">
        <Label className="text-stone-700 dark:text-stone-300 font-medium">Mock Tools</Label>
        <MockToolBuilder
          tools={builderTools}
          onChange={setBuilderTools}
          availableModels={MODELS}
        />
      </div>

      {/* Mock Tool Selector */}
      <div className="space-y-3">
        <Label className="text-stone-700 dark:text-stone-300">Available Mock Tools</Label>
        <div className="flex flex-wrap gap-2">
          {availableMockTools.length === 0 ? (
            <p className="text-xs text-stone-500 italic">No mock tools available. Create one above.</p>
          ) : (
            availableMockTools.map((t) => (
              <Badge
                key={t.id}
                variant={selectedMockToolIds.includes(t.toolId) ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  selectedMockToolIds.includes(t.toolId)
                    ? "bg-purple-600 hover:bg-purple-700 text-white border-none"
                    : "hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
                onClick={() => toggleMockTool(t.toolId)}
              >
                {t.name}
                {selectedMockToolIds.includes(t.toolId) && <Check className="ml-1 h-3 w-3" />}
              </Badge>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-amber-600 hover:bg-amber-700 text-white min-w-25"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : agent ? "Update Agent" : "Create Agent"}
        </Button>
      </div>
    </form>
  );
}
