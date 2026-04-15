"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between overflow-hidden rounded-xl border border-border bg-card px-4 py-3 text-foreground shadow-lg transition-all hover:bg-muted/50",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-foreground",
        success: "border-success/20 bg-success/5 text-success",
        error: "border-destructive/20 bg-destructive/5 text-destructive",
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
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/10 text-success">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17L4 12" />
              </svg>
            </div>
          )}
          {variant === "error" && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </div>
          )}
          <div className="flex-1 text-sm font-medium leading-none">{props.children}</div>
          <button
            onClick={() => onDismiss(id)}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground/60 transition-all hover:bg-muted hover:text-foreground active:scale-95"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    );
  },
);
Toast.displayName = "Toast";

export { Toast, toastVariants };
