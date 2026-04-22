import * as React from "react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStepId: string;
  className?: string;
}

export function StepIndicator({
  steps,
  currentStepId,
  className,
}: StepIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-between items-center px-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
          Step {currentIndex + 1} of {steps.length}: <span className="text-foreground">{steps[currentIndex].label}</span>
        </p>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
