"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Play } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { JudgeAssignment } from "@/components/runs/judge-assignment";
import { useRouter } from "next/navigation";

interface AssignedJudge {
  judgeId: string;
  judgeName: string;
  judgeMode: string;
  autoEvaluate: boolean;
}

interface RunSetupProps {
  onRunCreated?: () => void;
}

export function RunSetup({ onRunCreated }: RunSetupProps) {
  const [scenarios, setScenarios] = React.useState<any[]>([]);
  const [agents, setAgents] = React.useState<any[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = React.useState("");
  const [selectedAgentId, setSelectedAgentId] = React.useState("");
  const [openingMessage, setOpeningMessage] = React.useState("");
  const [judgeAssignments, setJudgeAssignments] = React.useState<AssignedJudge[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSearchingAgents, setIsSearchingAgents] = React.useState(false);
  const [isSearchingScenarios, setIsSearchingScenarios] = React.useState(false);
  const router = useRouter();

  const searchAgents = async (query: string) => {
    setIsSearchingAgents(true);
    try {
      const res = await fetch(`/api/agents/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setAgents(data);
    } catch (error) {
      console.error("Agent search failed:", error);
    } finally {
      setIsSearchingAgents(false);
    }
  };

  const searchScenarios = async (query: string) => {
    setIsSearchingScenarios(true);
    try {
      const res = await fetch(`/api/scenarios/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setScenarios(data);
    } catch (error) {
      console.error("Scenario search failed:", error);
    } finally {
      setIsSearchingScenarios(false);
    }
  };

  // Initial load
  React.useEffect(() => {
    searchAgents("");
    searchScenarios("");
  }, []);

  const handleLaunch = async () => {
    if (!selectedAgentId || !selectedScenarioId) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgentId,
          scenarioId: selectedScenarioId,
          openingMessageOverride: openingMessage,
          judgeAssignments: judgeAssignments.map((a) => ({
            judgeId: a.judgeId,
            autoEvaluate: a.autoEvaluate,
          })),
        }),
      });

      if (res.ok) {
        const newRun = await res.json();
        if (onRunCreated) {
          onRunCreated();
        }
        router.push(`/runs/${newRun.id}`);
      }
    } catch (error) {
      console.error("Failed to launch run:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div className="grid grid-cols-1 gap-6">
        <SearchableSelect
          label="Agent Under Test"
          placeholder="Select an agent..."
          options={agents.map((a) => ({ id: a.id, name: a.name, description: a.model }))}
          value={selectedAgentId}
          onValueChange={setSelectedAgentId}
          onSearch={searchAgents}
          isLoading={isSearchingAgents}
          helperText="The agent that will be executed in this run."
        />

        <SearchableSelect
          label="Scenario"
          placeholder="Select a scenario..."
          options={scenarios.map((s) => ({ id: s.id, name: s.name }))}
          value={selectedScenarioId}
          onValueChange={setSelectedScenarioId}
          onSearch={searchScenarios}
          isLoading={isSearchingScenarios}
          helperText="Scenario seeds the customer brief + supplier replies."
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
          Opening Message
        </label>
        <Textarea
          placeholder="Optional: override the opening message..."
          className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-sm h-24 resize-none focus:ring-amber-500"
          value={openingMessage}
          onChange={(e) => setOpeningMessage(e.target.value)}
        />
      </div>

      <JudgeAssignment onAssign={setJudgeAssignments} />

      <div className="flex justify-between items-center pt-4">
        <p className="text-[10px] text-stone-400 italic">⌘↵ to launch · esc to close</p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="border-stone-200 dark:border-stone-800 text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-900"
            onClick={() => onRunCreated?.()}
          >
            Cancel
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-lg shadow-amber-900/20"
            disabled={!selectedAgentId || !selectedScenarioId || isLoading}
            onClick={handleLaunch}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
            Launch run
          </Button>
        </div>
      </div>
    </div>
  );
}
