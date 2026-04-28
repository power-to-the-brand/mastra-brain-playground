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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Loader2, Trash2, Plus, GripVertical, X } from "lucide-react";
import type { Rubric } from "@/db";

interface Dimension {
  id: string;
  name: string;
  description: string;
  weight: number;
  scoringCriteria: string;
  scaleMin: number;
  scaleMax: number;
}

interface RubricEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rubric: Rubric | null;
  onSave: (data: Partial<Rubric>) => Promise<void>;
  isSaving?: boolean;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function parseDimensions(rubric: Rubric | null): Dimension[] {
  if (!rubric?.dimensions || !Array.isArray(rubric.dimensions)) return [];
  return rubric.dimensions.map((d) => ({
    id: generateId(),
    name: d.name ?? "",
    description: d.description ?? "",
    weight: typeof d.weight === "number" ? d.weight : 1,
    scoringCriteria: d.scoringCriteria ?? "",
    scaleMin: typeof d.scale?.min === "number" ? d.scale.min : 1,
    scaleMax: typeof d.scale?.max === "number" ? d.scale.max : 5,
  }));
}

function buildInitialState(rubric: Rubric | null): {
  name: string;
  description: string;
  passingThreshold: number | null;
  dimensions: Dimension[];
} {
  if (!rubric) {
    return {
      name: "",
      description: "",
      passingThreshold: null,
      dimensions: [],
    };
  }
  return {
    name: rubric.name,
    description: rubric.description ?? "",
    passingThreshold:
      rubric.passingThreshold != null ? Number(rubric.passingThreshold) : null,
    dimensions: parseDimensions(rubric),
  };
}

function InnerForm({
  rubric,
  onSave,
  isSaving,
  onCancel,
}: {
  rubric: Rubric | null;
  onSave: (data: Partial<Rubric>) => Promise<void>;
  isSaving: boolean;
  onCancel: () => void;
}) {
  const initial = buildInitialState(rubric);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [passingThreshold, setPassingThreshold] = useState(
    initial.passingThreshold,
  );
  const [dimensions, setDimensions] = useState<Dimension[]>(initial.dimensions);

  useEffect(() => {
    const fresh = buildInitialState(rubric);
    setName(fresh.name);
    setDescription(fresh.description);
    setPassingThreshold(fresh.passingThreshold);
    setDimensions(fresh.dimensions);
  }, [rubric]);

  const addDimension = () => {
    setDimensions((prev) => [
      ...prev,
      {
        id: generateId(),
        name: "",
        description: "",
        weight: 1,
        scoringCriteria: "",
        scaleMin: 1,
        scaleMax: 5,
      },
    ]);
  };

  const updateDimension = (index: number, updates: Partial<Dimension>) => {
    setDimensions((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...updates } : d)),
    );
  };

  const removeDimension = (index: number) => {
    setDimensions((prev) => prev.filter((_, i) => i !== index));
  };

  const moveDimension = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= dimensions.length) return;
    setDimensions((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(newIndex, 0, moved);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (dimensions.length === 0) return;

    const payload: Partial<Rubric> = {
      id: rubric?.id,
      name: name.trim(),
      description: description.trim() || null,
      passingThreshold,
      dimensions: dimensions.map((d) => ({
        name: d.name.trim(),
        description: d.description.trim(),
        weight: Number(d.weight),
        scoringCriteria: d.scoringCriteria.trim(),
        scale: {
          min: Number(d.scaleMin),
          max: Number(d.scaleMax),
        },
      })),
    };

    await onSave(payload);
  };

  const isValid =
    name.trim().length > 0 &&
    dimensions.length > 0 &&
    dimensions.every(
      (d) =>
        d.name.trim().length > 0 &&
        d.description.trim().length > 0 &&
        d.scoringCriteria.trim().length > 0 &&
        Number(d.scaleMax) > Number(d.scaleMin),
    );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-serif text-xl tracking-tight">
          {rubric?.id ? "Edit Rubric" : "Create Rubric"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="rubric-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="rubric-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Customer Support Evaluation"
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="rubric-description">Description</Label>
          <Textarea
            id="rubric-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this rubric evaluates..."
            className="min-h-[80px]"
          />
        </div>

        {/* Passing Threshold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Passing Threshold</Label>
            <div className="flex items-center gap-1.5">
              {passingThreshold != null && (
                <>
                  <span className="text-sm font-mono font-medium tabular-nums">
                    {passingThreshold}%
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full hover:bg-muted"
                    onClick={() => setPassingThreshold(null)}
                  >
                    <X size={10} />
                  </Button>
                </>
              )}
            </div>
          </div>
          <Slider
            value={passingThreshold != null ? [passingThreshold] : [60]}
            onValueChange={([v]) => setPassingThreshold(v)}
            min={0}
            max={100}
            step={5}
            className={passingThreshold == null ? "opacity-40" : ""}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0%</span>
            <span>100%</span>
          </div>
          {passingThreshold == null && (
            <p className="text-xs text-muted-foreground italic">
              Slide to set a threshold, or leave unset for no minimum.
            </p>
          )}
        </div>

        {/* Dimensions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>
              Dimensions <span className="text-destructive">*</span>
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDimension}
            >
              <Plus size={14} className="mr-1" />
              Add Dimension
            </Button>
          </div>

          {dimensions.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No dimensions defined. Add at least one dimension.
            </p>
          )}

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
            {dimensions.map((dim, index) => (
              <div
                key={dim.id}
                className="rounded-lg border bg-card p-4 space-y-4"
              >
                {/* Dimension Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical
                      size={16}
                      className="text-muted-foreground cursor-grab"
                    />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Dimension {index + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={index === 0}
                      onClick={() => moveDimension(index, -1)}
                    >
                      <span className="text-xs">&#8593;</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={index === dimensions.length - 1}
                      onClick={() => moveDimension(index, 1)}
                    >
                      <span className="text-xs">&#8595;</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeDimension(index)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {/* Dimension Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Name *</Label>
                    <Input
                      value={dim.name}
                      onChange={(e) =>
                        updateDimension(index, { name: e.target.value })
                      }
                      placeholder="e.g. Instruction Adherence"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Description *</Label>
                    <Input
                      value={dim.description}
                      onChange={(e) =>
                        updateDimension(index, {
                          description: e.target.value,
                        })
                      }
                      placeholder="What this dimension measures"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Weight *</Label>
                    <Input
                      type="number"
                      step="any"
                      value={dim.weight}
                      onChange={(e) =>
                        updateDimension(index, {
                          weight: Number(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Scale Min *</Label>
                    <Input
                      type="number"
                      value={dim.scaleMin}
                      onChange={(e) =>
                        updateDimension(index, {
                          scaleMin: Number(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Scale Max *</Label>
                    <Input
                      type="number"
                      value={dim.scaleMax}
                      onChange={(e) =>
                        updateDimension(index, {
                          scaleMax: Number(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Scoring Criteria *</Label>
                  <Textarea
                    value={dim.scoringCriteria}
                    onChange={(e) =>
                      updateDimension(index, {
                        scoringCriteria: e.target.value,
                      })
                    }
                    placeholder="5: Perfect adherence. 3: Partial adherence. 1: Ignored."
                    className="min-h-[60px] text-sm"
                    required
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving || !isValid}>
            {isSaving && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {rubric?.id ? "Update Rubric" : "Create Rubric"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function RubricEditorDialog({
  open,
  onOpenChange,
  rubric,
  onSave,
  isSaving,
}: RubricEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <InnerForm
          key={rubric?.id ?? "new"}
          rubric={rubric}
          onSave={onSave}
          isSaving={isSaving ?? false}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
