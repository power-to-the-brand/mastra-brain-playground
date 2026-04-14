"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between overflow-hidden rounded-md border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 shadow-lg transition-all hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50",
  {
    variants: {
      variant: {
        default: "border-stone-200 bg-stone-50 text-stone-900 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50",
        success: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100",
        error: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface ToastProps extends React.ComponentProps<"div">, VariantProps<typeof toastVariants> {
  id: string;
  onDismiss: (id: string) => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, id, onDismiss, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        role="alert"
        {...props}
      >
        <div className="flex items-center gap-2">
          {variant === "success" && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          )}
          {variant === "error" && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
          )}
          <div className="flex-1 text-sm font-medium">{props.children}</div>
          <button
            onClick={() => onDismiss(id)}
            className="flex h-5 w-5 items-center justify-center rounded-md hover:bg-stone-200/50 hover:text-stone-900 dark:hover:bg-stone-800/50 dark:hover:text-stone-50"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  },
);
Toast.displayName = "Toast";

export { Toast, toastVariants };
