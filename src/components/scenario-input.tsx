"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
      <Textarea
        id="scenario-description"
        aria-label="Scenario description"
        placeholder="Describe your scenario... (e.g., A customer wants to source custom branded stainless steel water bottles for a corporate gift, with budget of $5-7 per unit for 500 pieces)"
        rows={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={cn(
          "min-h-[200px] border-stone-200/60 bg-white/40 backdrop-blur-sm text-stone-800 placeholder:text-stone-400 focus:border-orange-300 focus:ring-orange-300/20 dark:border-stone-700/50 dark:bg-stone-900/40 dark:text-stone-200 dark:placeholder:text-stone-600 transition-all duration-300",
          disabled && "opacity-60",
        )}
        disabled={disabled}
      />
      <div className="flex items-center justify-between pt-2">
        <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
          Press <kbd className="rounded bg-stone-100 px-1 dark:bg-stone-800">Enter</kbd> to generate
        </p>
        <Button
          size="sm"
          onClick={onGenerate}
          disabled={!canGenerate}
          className={cn(
            "relative overflow-hidden bg-gradient-to-r from-orange-600 to-amber-600 px-6 font-medium text-white shadow-lg shadow-orange-600/20 transition-all hover:scale-[1.02] hover:shadow-orange-600/30 active:scale-[0.98]",
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
