"use client";

import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const navItemVariants = cva(
  "group/nav-item relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-300 hover:bg-primary/5 hover:pl-4 hover:shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
  {
    variants: {
      variant: {
        default:
          "text-muted-foreground hover:text-foreground",
        active:
          "bg-primary/10 text-primary shadow-sm",
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
                active && "text-primary"
              )}
            >
              {icon}
            </span>
          )}
        </span>
        <span className="relative z-10 flex-1 truncate">{children}</span>
        {active && (
          <span className="absolute right-3 z-10 h-1.5 w-1.5 rounded-full bg-primary" />
        )}
      </Link>
    );
  }
);
NavItem.displayName = "NavItem";

export { NavItem, navItemVariants };
