"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageCircle,
  Quote,
  Users,
  Settings,
  Menu,
  LayoutDashboard,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavItem } from "@/components/ui/nav-item";
import { SectionTitle } from "@/components/ui/section-title";

interface SidebarProps extends React.ComponentProps<"aside"> {
  collapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ className, collapsed, onToggle, ...props }, ref) => {
    const pathname = usePathname();

    const navItems = [
      {
        href: "/scenario-builder",
        label: "Scenario Builder",
        icon: <LayoutDashboard size={18} strokeWidth={2} />,
      },
      {
        href: "/scenarios",
        label: "Scenarios",
        icon: <Save size={18} strokeWidth={2} />,
      },
      {
        href: "/",
        label: "Playground",
        icon: <Home size={18} strokeWidth={2} />,
      },
    ];

    return (
      <aside
        ref={ref}
        className={cn(
          "fixed left-0 top-0 z-50 h-full flex-col border-r border-border bg-sidebar transition-all duration-300",
          collapsed ? "w-20" : "w-64",
          className,
        )}
        {...props}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <span className="font-bold text-sm">M</span>
              </div>
              <span className="font-serif text-lg font-bold tracking-tight text-foreground">
                Mastra
              </span>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <span className="font-bold text-sm">M</span>
            </div>
          )}
          <button
            onClick={onToggle}
            className="relative -mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-secondary hover:text-foreground focus-visible:bg-secondary focus-visible:text-foreground active:scale-95"
          >
            <Menu size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex flex-1 flex-col justify-between py-4">
          <div className="space-y-1 px-3">
            <SectionTitle divider={false}>Main</SectionTitle>
            {navItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                active={pathname === item.href}
              >
                {item.label}
              </NavItem>
            ))}
          </div>

          <div className="space-y-1 px-3">
            <SectionTitle divider={false}>Settings</SectionTitle>
            <NavItem
              href="/settings"
              icon={<Settings size={18} strokeWidth={2} />}
            >
              Preferences
            </NavItem>
          </div>
        </div>

        {/* Sidebar Footer - Status Indicator */}
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-2.5 w-2.5 flex-none items-center justify-center">
              <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-success/40" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success ring-2 ring-background" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-foreground/80">
                System Online
              </p>
              <p className="text-[10px] text-muted-foreground">
                All systems operational
              </p>
            </div>
          </div>
        </div>
      </aside>
    );
  },
);
Sidebar.displayName = "Sidebar";

export { Sidebar };
