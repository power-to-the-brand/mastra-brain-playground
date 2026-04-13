"use client";

import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const navItemVariants = cva(
  "group/nav-item relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-300 hover:bg-orange-50/50 hover:pl-4 hover:shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/50 dark:hover:bg-orange-900/20",
  {
    variants: {
      variant: {
        default:
          "text-stone-600 hover:text-orange-700 dark:text-stone-400 dark:hover:text-orange-300",
        active:
          "bg-gradient-to-br from-orange-100/80 to-orange-50/80 text-orange-700 shadow-sm dark:from-orange-900/40 dark:to-orange-800/30 dark:text-orange-300",
      },
      size: {
        default: "px-3 py-2.5 text-sm",
        sm: "px-2 py-1.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface NavItemProps
  extends React.ComponentProps<typeof Link>,
    VariantProps<typeof navItemVariants> {
  icon?: React.ReactNode;
  active?: boolean;
}

const NavItem = React.forwardRef<HTMLAnchorElement, NavItemProps>(
  ({ className, variant, size, icon, active, children, ...props }, ref) => {
    return (
      <Link
        ref={ref}
        className={cn(
          navItemVariants({ variant: active ? "active" : "default", size }),
          className
        )}
        {...props}
      >
        <span className="relative z-10 flex min-w-[24px] items-center justify-center">
          {icon && (
            <span
              className={cn(
                "transition-transform duration-300 group-hover/nav-item:scale-110",
                active && "text-orange-600 dark:text-orange-400"
              )}
            >
              {icon}
            </span>
          )}
        </span>
        <span className="relative z-10 flex-1 truncate">{children}</span>
        {active && (
          <span className="absolute right-3 z-10 h-1.5 w-1.5 rounded-full bg-orange-500/80" />
        )}
      </Link>
    );
  }
);
NavItem.displayName = "NavItem";

export { NavItem, navItemVariants };
