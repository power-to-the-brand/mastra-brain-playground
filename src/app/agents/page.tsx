"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, Bot, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentForm } from "@/components/agents/agent-form";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Agent {
  id: string;
  name: string;
  description?: string;
  model: string;
  instruction: string;
  createdAt: string;
  subagents: { agentId: string; subagentId: string }[];
  skills: { agentId: string; skillId: string }[];
  tools: { agentId: string; toolId: string; toolType: string }[];
}

export default function AgentsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [availableSkills, setAvailableSkills] = useState<{ id: string; name: string }[]>([]);
  const [availableTools, setAvailableTools] = useState<{ id: string; name: string; description: string }[]>([]);
  const [availableMockTools, setAvailableMockTools] = useState<
    { id: string; name: string; description: string; toolId: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingTools, setIsRefreshingTools] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    console.log("Fetching agents, skills, and tools...");
    try {
      const [agentsRes, skillsRes, toolsRes, mockToolsRes] = await Promise.all([
        fetch("/api/agents"),
        fetch("/api/skills"),
        fetch("/api/tools"),
        fetch("/api/mock-tools"),
      ]);

      const agentsRaw = await agentsRes.json();
      const skillsRaw = await skillsRes.json();
      const toolsRaw = await toolsRes.json();
      const mockToolsRaw = await mockToolsRes.json();

      console.log("Raw tools response:", toolsRaw);

      // Robust data extraction
      const extractArray = (raw: any) => {
        if (Array.isArray(raw)) return raw;
        if (!raw || typeof raw !== 'object') return [];

        // Case 1: { data: [...] }
        if (Array.isArray(raw.data)) return raw.data;
        
        // Case 2: { tools: [...] } or { agents: [...] } etc.
        if (Array.isArray(raw.tools)) return raw.tools;
        if (Array.isArray(raw.skills)) return raw.skills;
        if (Array.isArray(raw.agents)) return raw.agents;

        // Case 3: { data: { tools: [...] } }
        if (raw.data && typeof raw.data === 'object') {
          if (Array.isArray(raw.data.tools)) return raw.data.tools;
          if (Array.isArray(raw.data.skills)) return raw.data.skills;
          if (Array.isArray(raw.data.agents)) return raw.data.agents;
          
          // Case 4: { data: { tool1: {}, tool2: {} } } (Map of objects)
          const values = Object.values(raw.data);
          if (values.length > 0 && typeof values[0] === 'object') {
            return Object.entries(raw.data).map(([key, val]: [string, any]) => ({
              id: val.id || key,
              name: val.name || val.id || key,
              description: val.description || "",
              ...val
            }));
          }
        }
        
        // Case 5: { tool1: {}, tool2: {} } (Direct map of objects)
        const values = Object.values(raw);
        if (values.length > 0 && typeof values[0] === 'object') {
           return Object.entries(raw).map(([key, val]: [string, any]) => ({
              id: val.id || key,
              name: val.name || val.id || key,
              description: val.description || "",
              ...val
            }));
        }

        return [];
      };

      const agentsData = extractArray(agentsRaw);
      const skillsData = extractArray(skillsRaw);
      const toolsData = extractArray(toolsRaw);
      const mockToolsData = Array.isArray(mockToolsRaw?.data)
        ? mockToolsRaw.data
        : [];

      setAgents(agentsData);
      setAvailableSkills(skillsData);
      setAvailableTools(toolsData);
      setAvailableMockTools(mockToolsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTools = async () => {
    setIsRefreshingTools(true);
    try {
      const toolsRes = await fetch("/api/tools");
      const toolsRaw = await toolsRes.json();

      const extractArray = (raw: any) => {
        if (Array.isArray(raw)) return raw;
        if (!raw || typeof raw !== 'object') return [];
        if (Array.isArray(raw.data)) return raw.data;
        if (Array.isArray(raw.tools)) return raw.tools;
        if (raw.data && typeof raw.data === 'object') {
          if (Array.isArray(raw.data.tools)) return raw.data.tools;
          const values = Object.values(raw.data);
          if (values.length > 0 && typeof values[0] === 'object') {
            return Object.entries(raw.data).map(([key, val]: [string, any]) => ({
              id: val.id || key,
              name: val.name || val.id || key,
              description: val.description || "",
              ...val
            }));
          }
        }
        const values = Object.values(raw);
        if (values.length > 0 && typeof values[0] === 'object') {
          return Object.entries(raw).map(([key, val]: [string, any]) => ({
            id: val.id || key,
            name: val.name || val.id || key,
            description: val.description || "",
            ...val
          }));
        }
        return [];
      };

      const toolsData = extractArray(toolsRaw);
      setAvailableTools(toolsData);
    } catch (error) {
      console.error("Error refreshing tools:", error);
    } finally {
      setIsRefreshingTools(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this agent?")) return;
    try {
      await fetch(`/api/agents/${id}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      console.error("Error deleting agent:", error);
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingAgent(null);
    fetchData();
  };

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-950">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        className={cn(
          "flex-1 transition-all duration-300",
          sidebarCollapsed ? "ml-20" : "ml-64",
        )}
      >
        <div className="container mx-auto py-10 px-8 space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100">Mastra Agents</h1>
              <p className="text-stone-500 dark:text-stone-400 mt-2">Manage your autonomous agents and their capabilities.</p>
            </div>
            <Dialog open={isFormOpen} onOpenChange={(open) => {
              setIsFormOpen(open);
              if (!open) setEditingAgent(null);
            }}>
              <DialogTrigger render={<Button className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/20" />}>
                <Plus className="mr-2 h-4 w-4" /> Create Agent
              </DialogTrigger>
              <DialogContent className="sm:max-w-160 max-h-[92vh] overflow-y-auto bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 scrollbar-thin scrollbar-thumb-stone-300 dark:scrollbar-thumb-stone-700">
                <DialogHeader className="pb-4">
                  <DialogTitle className="font-serif text-2xl">
                    {editingAgent ? "Edit Agent" : "Create New Agent"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure your agent&apos;s personality, model, and capabilities.
                  </DialogDescription>
                </DialogHeader>
                <div className="px-1">
                  <AgentForm
                    agent={editingAgent}
                    availableAgents={agents.filter((a) => a.id !== editingAgent?.id)}
                    availableSkills={availableSkills}
                    availableTools={availableTools}
                    availableMockTools={availableMockTools}
                    onSuccess={handleFormSuccess}
                    onCancel={() => setIsFormOpen(false)}
                    onRefreshTools={refreshTools}
                    isRefreshingTools={isRefreshingTools}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : agents.length === 0 ? (
            <Card className="border-dashed border-2 bg-stone-50/50 dark:bg-stone-900/50">
              <CardContent className="flex flex-col items-center justify-center py-20 space-y-4">
                <Bot className="h-12 w-12 text-stone-300 dark:text-stone-700" />
                <div className="text-center">
                  <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100">No agents found</h3>
                  <p className="text-stone-500 dark:text-stone-400">Get started by creating your first Mastra agent.</p>
                </div>
                <Button variant="outline" onClick={() => setIsFormOpen(true)}>
                  Create Agent
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent) => (
                <Card key={agent.id} className="group hover:shadow-xl transition-all duration-300 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <Bot className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                      </div>
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(agent)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(agent.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="mt-4 font-serif text-xl">{agent.name}</CardTitle>
                    <CardDescription className="font-mono text-xs uppercase tracking-wider text-amber-600 dark:text-amber-500">
                      {agent.model}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-stone-600 dark:text-stone-400 line-clamp-3 italic">
                      {agent.description || agent.instruction}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {agent.skills?.length > 0 && (
                        <Badge variant="secondary" className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-none">
                          {agent.skills.length} Skills
                        </Badge>
                      )}
                      {agent.tools?.filter((t) => t.toolType === "mastra").length > 0 && (
                        <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-none">
                          {agent.tools.filter((t) => t.toolType === "mastra").length} Tools
                        </Badge>
                      )}
                      {agent.tools?.filter((t) => t.toolType === "mock").length > 0 && (
                        <Badge variant="secondary" className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-none">
                          {agent.tools.filter((t) => t.toolType === "mock").length} Mock Tools
                        </Badge>
                      )}
                      {agent.subagents?.length > 0 && (
                        <Badge variant="secondary" className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-none">
                          {agent.subagents.length} Subagents
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
