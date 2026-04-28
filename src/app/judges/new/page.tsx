"use client";

import { useState } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JudgeForm } from "@/components/judges/judge-form";
import { ToastProvider } from "@/components/ui/toast-provider";
import Link from "next/link";

function NewJudgePageContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        className={cn(
          "flex-1 transition-all duration-300 flex flex-col",
          sidebarCollapsed ? "ml-20" : "ml-64"
        )}
      >
        <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
          <div className="flex items-center gap-4">
            <Link href="/judges">
              <Button variant="ghost" size="icon" className="text-stone-500 hover:text-stone-900 dark:hover:text-stone-100">
                <ChevronLeft className="h-6 w-6" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-serif font-bold tracking-tight">Create New Judge</h1>
              <p className="text-stone-500 dark:text-stone-400 mt-1">
                Configure a new LLM judge to evaluate your agent runs.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900/50 p-8 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <JudgeForm />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function NewJudgePage() {
  return (
    <ToastProvider>
      <NewJudgePageContent />
    </ToastProvider>
  );
}
