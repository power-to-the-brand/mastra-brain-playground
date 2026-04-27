"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { MockTool } from "@/db";

interface MockToolEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mockTool: MockTool | null;
  onSave: (data: Partial<MockTool>) => Promise<void>;
  isSaving: boolean;
}

export function MockToolEditorDialog({
  open,
  onOpenChange,
  mockTool,
  onSave,
  isSaving,
}: MockToolEditorDialogProps) {
  const [formData, setFormData] = useState<Partial<MockTool>>({});
  const [jsonErrors, setJsonErrors] = useState<{
    inputSchema?: string;
    mockFixedResponse?: string;
  }>({});

  useEffect(() => {
    if (open) {
      setFormData(
        mockTool
          ? {
              id: mockTool.id,
              toolId: mockTool.toolId,
              name: mockTool.name,
              description: mockTool.description,
              inputSchema: mockTool.inputSchema
                ? JSON.stringify(mockTool.inputSchema, null, 2)
                : "[]",
              mockMode: mockTool.mockMode,
              mockFixedResponse: mockTool.mockFixedResponse
                ? JSON.stringify(mockTool.mockFixedResponse, null, 2)
                : "{}",
              mockSimulationPrompt: mockTool.mockSimulationPrompt,
              mockSimulationModel: mockTool.mockSimulationModel,
            }
          : {
              toolId: "",
              name: "",
              description: "",
              inputSchema: "[]",
              mockMode: "fixed",
              mockFixedResponse: "{}",
              mockSimulationPrompt: "",
              mockSimulationModel: "",
            },
      );
      setJsonErrors({});
    }
  }, [open, mockTool]);

  const validateJson = (value: string, field: "inputSchema" | "mockFixedResponse"): boolean => {
    if (!value.trim()) {
      setJsonErrors((prev) => ({ ...prev, [field]: undefined }));
      return true;
    }
    try {
      JSON.parse(value);
      setJsonErrors((prev) => ({ ...prev, [field]: undefined }));
      return true;
    } catch {
      setJsonErrors((prev) => ({ ...prev, [field]: "Invalid JSON" }));
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.toolId || !formData.name || !formData.mockMode) {
      return;
    }

    const inputSchemaValid = validateJson(
      (formData.inputSchema as string) ?? "[]",
      "inputSchema",
    );
    const fixedResponseValid =
      formData.mockMode !== "fixed" ||
      validateJson(
        (formData.mockFixedResponse as string) ?? "{}",
        "mockFixedResponse",
      );

    if (!inputSchemaValid || !fixedResponseValid) return;

    const payload = { ...formData };
    if (typeof payload.inputSchema === "string") {
      try {
        payload.inputSchema = JSON.parse(payload.inputSchema || "[]");
      } catch {
        /* already validated */
      }
    }
    if (typeof payload.mockFixedResponse === "string") {
      try {
        payload.mockFixedResponse = JSON.parse(payload.mockFixedResponse);
      } catch {
        /* already validated */
      }
    }
    await onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mockTool ? "Edit Mock Tool" : "Create Mock Tool"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="toolId">Tool ID *</Label>
            <Input
              id="toolId"
              type="text"
              required
              value={formData.toolId ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, toolId: e.target.value }))
              }
              disabled={!!mockTool}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              type="text"
              required
              value={formData.name ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inputSchema">Input Schema (JSON)</Label>
            <Textarea
              id="inputSchema"
              rows={4}
              value={(formData.inputSchema as string) ?? "[]"}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  inputSchema: e.target.value,
                }));
                validateJson(e.target.value, "inputSchema");
              }}
              className="font-mono"
            />
            {jsonErrors.inputSchema && (
              <p className="text-xs text-destructive">
                {jsonErrors.inputSchema}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Mock Mode *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mockMode"
                  value="fixed"
                  checked={formData.mockMode === "fixed"}
                  onChange={() =>
                    setFormData((prev) => ({ ...prev, mockMode: "fixed" }))
                  }
                />
                Fixed Response
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mockMode"
                  value="llm_simulated"
                  checked={formData.mockMode === "llm_simulated"}
                  onChange={() =>
                    setFormData((prev) => ({
                      ...prev,
                      mockMode: "llm_simulated",
                    }))
                  }
                />
                LLM Simulated
              </label>
            </div>
          </div>

          {formData.mockMode === "fixed" && (
            <div className="space-y-2">
              <Label htmlFor="mockFixedResponse">Mock Fixed Response (JSON)</Label>
              <Textarea
                id="mockFixedResponse"
                rows={4}
                value={(formData.mockFixedResponse as string) ?? ""}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    mockFixedResponse: e.target.value,
                  }));
                  validateJson(e.target.value, "mockFixedResponse");
                }}
                className="font-mono"
              />
              {jsonErrors.mockFixedResponse && (
                <p className="text-xs text-destructive">
                  {jsonErrors.mockFixedResponse}
                </p>
              )}
            </div>
          )}

          {formData.mockMode === "llm_simulated" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="mockSimulationPrompt">
                  Simulation Prompt
                </Label>
                <Textarea
                  id="mockSimulationPrompt"
                  rows={4}
                  value={formData.mockSimulationPrompt ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      mockSimulationPrompt: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mockSimulationModel">Simulation Model</Label>
                <Input
                  id="mockSimulationModel"
                  type="text"
                  value={formData.mockSimulationModel ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      mockSimulationModel: e.target.value,
                    }))
                  }
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mockTool ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
