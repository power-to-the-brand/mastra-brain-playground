"use client";

import * as React from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Plus, Search, Filter, Download, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RunSetup } from "@/components/runs/run-setup";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Link from "next/link";

export default function RunsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [runs, setRuns] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const fetchRuns = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/runs");
      const data = await response.json();
      setRuns(data);
    } catch (error) {
      console.error("Failed to fetch runs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRuns();
  }, []);

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        className={cn(
          "flex-1 transition-all duration-300 flex flex-col",
          sidebarCollapsed ? "ml-20" : "ml-64",
        )}
      >
        <div className="p-8 max-w-7xl mx-auto w-full">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold tracking-tight">Every run, across every agent.</h1>
              <p className="text-stone-500 dark:text-stone-400 mt-2">
                A run is one invocation of an agent under test — the Brain on a scenario, or a Customer / Supplier agent talking to a persona. Click a row to replay.
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger render={<Button className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-lg shadow-amber-900/20" />}>
                <Plus className="h-4 w-4" />
                New run
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-serif font-bold">Start a run</DialogTitle>
                </DialogHeader>
                <RunSetup onRunCreated={() => {
                  setIsDialogOpen(false);
                  fetchRuns();
                }} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-stone-100/80 dark:bg-stone-900/80">
                <TableRow className="border-stone-200 dark:border-stone-800 hover:bg-transparent">
                  <TableHead className="text-stone-500 dark:text-stone-400 uppercase text-[10px] font-bold tracking-widest">ID</TableHead>
                  <TableHead className="text-stone-500 dark:text-stone-400 uppercase text-[10px] font-bold tracking-widest">Target</TableHead>
                  <TableHead className="text-stone-500 dark:text-stone-400 uppercase text-[10px] font-bold tracking-widest">Scenario</TableHead>
                  <TableHead className="text-stone-500 dark:text-stone-400 uppercase text-[10px] font-bold tracking-widest">Tokens</TableHead>
                  <TableHead className="text-stone-500 dark:text-stone-400 uppercase text-[10px] font-bold tracking-widest">Duration</TableHead>
                  <TableHead className="text-stone-500 dark:text-stone-400 uppercase text-[10px] font-bold tracking-widest">Verdict</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-stone-400">
                      Loading runs...
                    </TableCell>
                  </TableRow>
                ) : runs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-stone-400">
                      No runs found. Start a new run to see it here.
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map((run) => (
                    <TableRow 
                      key={run.id} 
                      className="border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 cursor-pointer group transition-colors"
                    >
                      <TableCell className="font-mono text-stone-400 text-[10px]">
                        <Link href={`/runs/${run.id}`} className="block w-full h-full py-2">
                          {run.id.slice(0, 8)}...
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/runs/${run.id}`} className="block w-full h-full py-2">
                          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30 text-[10px] font-mono">
                            {run.agentId.slice(0, 8)}
                          </Badge>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        <Link href={`/runs/${run.id}`} className="block w-full h-full py-2">
                          {run.scenarioId.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-stone-400 text-xs font-mono">—</TableCell>
                      <TableCell className="text-stone-400 text-xs font-mono">—</TableCell>
                      <TableCell>
                        <Link href={`/runs/${run.id}`} className="block w-full h-full py-2">
                          <Badge className={cn(
                            "text-[10px] font-bold uppercase tracking-tighter",
                            run.status === 'completed' ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/30" : 
                            run.status === 'failed' ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30" :
                            "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700"
                          )}>
                            ● {run.status}
                          </Badge>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}
