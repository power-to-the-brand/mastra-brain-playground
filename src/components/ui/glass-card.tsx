import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass rounded-3xl p-8 shadow-xl shadow-stone-200/50 border-stone-200/60 transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
