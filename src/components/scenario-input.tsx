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
          "min-h-[200px] border-border bg-muted/20 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-primary/10 transition-all duration-300 rounded-xl",
          disabled && "opacity-60",
        )}
        disabled={disabled}
      />
      <div className="flex items-center justify-between pt-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          Press <kbd className="rounded-md bg-muted px-1.5 py-0.5 text-foreground ring-1 ring-border">Enter</kbd> to generate
        </p>
        <Button
          size="lg"
          onClick={onGenerate}
          disabled={!canGenerate}
          className={cn(
            "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-[0.98] font-semibold",
            isLoading && "opacity-70",
          )}
        >
          {isLoading ? (
            <>
              <Sparkles size={18} className="mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={18} className="mr-2" />
              Generate Scenario
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
