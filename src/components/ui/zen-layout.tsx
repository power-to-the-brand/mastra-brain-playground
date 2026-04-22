import * as React from "react";
import { cn } from "@/lib/utils";

interface ZenLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  className?: string;
}

export function ZenLayout({
  title,
  subtitle,
  children,
  headerAction,
  className,
}: ZenLayoutProps) {
  return (
    <div className={cn("max-w-4xl mx-auto px-6 py-12", className)}>
      <header className="mb-12 flex items-end justify-between">
        <div>
          <h1 className="text-5xl font-display italic mb-2 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest">
              {subtitle}
            </p>
          )}
        </div>
        {headerAction && <div>{headerAction}</div>}
      </header>

      <main className="space-y-12 animate-fade-in-up">
        {children}
      </main>
    </div>
  );
}
