"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import type { Judge, Rubric } from "@/db";
import { JUDGE_MODELS, DEFAULT_JUDGE_MODEL } from "@/lib/models";

interface JudgeFormProps {
  judge?: Judge | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const MODES = [
  { label: "Run Level", value: "run_level" },
  { label: "Turn Level", value: "turn_level" },
  { label: "Both", value: "both" },
];

export function JudgeForm({ judge, onSuccess, onCancel }: JudgeFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [isLoadingRubrics, setIsLoadingRubrics] = useState(true);

  const [name, setName] = useState(judge?.name || "");
  const [description, setDescription] = useState(judge?.description || "");
  const [model, setModel] = useState(judge?.model || DEFAULT_JUDGE_MODEL);
  const [rubricId, setRubricId] = useState(judge?.rubricId || "");
  const [mode, setMode] = useState(judge?.mode || "run_level");
  const [systemPrompt, setSystemPrompt] = useState(judge?.systemPrompt || "");
  const [temperature, setTemperature] = useState(
    judge?.temperature ? parseFloat(judge.temperature as string) : 0.7
  );

  useEffect(() => {
    const fetchRubrics = async () => {
      try {
        const res = await fetch("/api/rubrics");
        const result = await res.json();
        setRubrics(result.data || []);
      } catch (error) {
        console.error("Failed to fetch rubrics:", error);
        addToast("Failed to load rubrics", "error");
      } finally {
        setIsLoadingRubrics(false);
      }
    };

    fetchRubrics();
  }, [addToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rubricId) {
      addToast("Please select a rubric", "error");
      return;
    }

    setIsLoading(true);

    const payload = {
      name,
      description,
      model,
      rubricId,
      mode,
      systemPrompt,
      temperature: temperature.toString(),
    };

    try {
      const url = judge ? `/api/judges/${judge.id}` : "/api/judges";
      const method = judge ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        addToast(`Judge ${judge ? "updated" : "created"} successfully`, "success");
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/judges");
          router.refresh();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save judge");
      }
    } catch (error: any) {
      console.error("Error saving judge:", error);
      addToast(error.message || "Failed to save judge", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Quality Judge"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-3 py-1 text-sm transition-colors outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          >
            {JUDGE_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rubric">Rubric</Label>
          <select
            id="rubric"
            value={rubricId}
            onChange={(e) => setRubricId(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-3 py-1 text-sm transition-colors outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-50"
            required
            disabled={isLoadingRubrics}
          >
            <option value="" disabled>
              {isLoadingRubrics ? "Loading rubrics..." : "Select a rubric"}
            </option>
            {rubrics.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mode">Judge Mode</Label>
          <select
            id="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="flex h-9 w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-3 py-1 text-sm transition-colors outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          >
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Briefly describe what this judge evaluates..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="systemPrompt">System Prompt</Label>
        <Textarea
          id="systemPrompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="min-h-[150px] bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
          placeholder="Detailed instructions for the judge..."
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label htmlFor="temperature">Temperature</Label>
          <Input
            type="number"
            id="temperature-input"
            value={temperature}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) setTemperature(val);
            }}
            step={0.01}
            min={0}
            max={1}
            className="w-20 h-8 text-right"
          />
        </div>
        <Slider
          id="temperature"
          min={0}
          max={1}
          step={0.01}
          value={[temperature]}
          onValueChange={(vals) => setTemperature(vals[0])}
          className="py-4"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (onCancel) {
              onCancel();
            } else {
              router.push("/judges");
            }
          }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-amber-600 hover:bg-amber-700 text-white min-w-[120px]"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : judge ? (
            "Update Judge"
          ) : (
            "Create Judge"
          )}
        </Button>
      </div>
    </form>
  );
}
