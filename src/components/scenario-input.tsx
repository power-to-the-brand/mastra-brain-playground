"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ScenarioInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ScenarioInput({
  value,
  onChange,
  onGenerate,
  isLoading,
  disabled,
}: ScenarioInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (!isLoading && value.trim()) {
        onGenerate();
      }
    }
  };

  const isEmpty = !value.trim();
  const canGenerate = !isEmpty && !isLoading && !disabled;

  return (
    <div className="space-y-3">
      <Label
        htmlFor="scenario-description"
        className="text-sm font-medium text-stone-700 dark:text-stone-300"
      >
        Scenario Description
      </Label>
      <Textarea
        id="scenario-description"
        placeholder="Describe your scenario... (e.g., A customer wants to source custom branded stainless steel water bottles for a corporate gift, with budget of $5-7 per unit for 500 pieces)"
        rows={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={cn(
          "border-stone-200 bg-stone-50/50 text-stone-800 placeholder:text-stone-400 focus:border-orange-300 focus:ring-orange-300/20 dark:border-stone-700 dark:bg-stone-900/30 dark:text-stone-200 dark:placeholder:text-stone-600",
          disabled && "opacity-60",
        )}
        disabled={disabled}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Press Enter to generate (Shift+Enter for new line)
        </p>
        <Button
          size="sm"
          onClick={onGenerate}
          disabled={!canGenerate}
          className={cn(
            "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-sm shadow-orange-600/20 transition-all hover:shadow-md hover:shadow-orange-600/30 focus:ring-orange-500/50",
            isLoading && "opacity-70",
          )}
        >
          {isLoading ? (
            <>
              <Sparkles size={14} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Generate Scenario
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
