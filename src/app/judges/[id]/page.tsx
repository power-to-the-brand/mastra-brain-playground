"use client";

import { useState, useEffect, use } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JudgeForm } from "@/components/judges/judge-form";
import { ToastProvider, useToast } from "@/components/ui/toast-provider";
import Link from "next/link";
import type { Judge } from "@/db";

function EditJudgePageContent({ id }: { id: string }) {
  const { addToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [judge, setJudge] = useState<Judge | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchJudge = async () => {
      try {
        const response = await fetch(`/api/judges/${id}`);
        if (!response.ok) throw new Error("Judge not found");
        const result = await response.json();
        setJudge(result.data);
      } catch (error) {
        console.error("Error fetching judge:", error);
        addToast("Failed to load judge", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchJudge();
  }, [id, addToast]);

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
              <h1 className="text-3xl font-serif font-bold tracking-tight">
                {isLoading ? "Loading..." : `Edit ${judge?.name}`}
              </h1>
              <p className="text-stone-500 dark:text-stone-400 mt-1">
                Modify judge configuration and evaluation parameters.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900/50 p-8 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              </div>
            ) : judge ? (
              <JudgeForm judge={judge} />
            ) : (
              <div className="text-center py-12 text-stone-500">
                Judge not found.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function EditJudgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ToastProvider>
      <EditJudgePageContent id={id} />
    </ToastProvider>
  );
}
