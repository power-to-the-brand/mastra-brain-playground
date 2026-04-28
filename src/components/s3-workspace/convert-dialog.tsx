"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { GEMINI_MODELS, DEFAULT_GEMINI_MODEL } from "@/lib/models";

interface ConvertDialogProps {
  open: boolean;
  fileKeys: string[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (model: string) => void;
  isLoading: boolean;
}

export function ConvertDialog({
  open,
  fileKeys,
  onOpenChange,
  onConfirm,
  isLoading,
}: ConvertDialogProps) {
  const [model, setModel] = useState(DEFAULT_GEMINI_MODEL);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convert to Mock Tools</DialogTitle>
          <DialogDescription>
            {fileKeys.length} file{fileKeys.length !== 1 ? "s" : ""} selected for conversion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="max-h-40 overflow-y-auto rounded-md border border-stone-200 dark:border-stone-800 p-2 space-y-1">
            {fileKeys.map((key) => (
              <p
                key={key}
                className="text-sm text-stone-700 dark:text-stone-300 truncate"
                title={key}
              >
                {key}
              </p>
            ))}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="convert-model"
              className="text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Model
            </label>
            <select
              id="convert-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all disabled:opacity-50"
            >
              {GEMINI_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(model)}
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Convert"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
