"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, Quote, Users, Settings, Menu, LayoutDashboard } from "lucide-react";
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
        href: "/",
        label: "Dashboard",
        icon: <Home size={18} strokeWidth={2} />,
      },
      {
        href: "/conversations",
        label: "Conversations",
        icon: <MessageCircle size={18} strokeWidth={2} />,
      },
      {
        href: "/quotations",
        label: "Quotations",
        icon: <Quote size={18} strokeWidth={2} />,
      },
      {
        href: "/suppliers",
        label: "Suppliers",
        icon: <Users size={18} strokeWidth={2} />,
      },
      {
        href: "/scenario-builder",
        label: "Scenario Builder",
        icon: <LayoutDashboard size={18} strokeWidth={2} />,
      },
    ];

    return (
      <aside
        ref={ref}
        className={cn(
          "fixed left-0 top-0 z-50 h-full flex-col border-r border-stone-200/60 bg-stone-50/80 backdrop-blur-xl transition-all duration-300 hover:bg-stone-50/90 dark:border-stone-800 dark:bg-stone-950/80 dark:hover:bg-stone-950/90",
          collapsed ? "w-20" : "w-64",
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-sm shadow-orange-500/20">
                <span className="font-bold">M</span>
              </div>
              <span className="font-serif text-lg font-medium tracking-tight text-stone-700 dark:text-stone-200">
                Mastra
              </span>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-sm shadow-orange-500/20">
              <span className="font-bold">M</span>
            </div>
          )}
          <button
            onClick={onToggle}
            className="relative -mr-1 rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-200/50 hover:text-stone-600 focus-visible:bg-stone-200/50 focus-visible:text-stone-600 dark:hover:bg-stone-800/50 dark:hover:text-stone-300"
          >
            <Menu size={18} strokeWidth={1.5} />
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
            <NavItem href="/settings" icon={<Settings size={18} strokeWidth={2} />}>
              Preferences
            </NavItem>
          </div>
        </div>

        {/* Sidebar Footer - Status Indicator */}
        <div className="border-t border-stone-200/60 px-4 py-3 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="relative flex h-2.5 w-2.5 flex-none items-center justify-center">
              <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400/40 dark:bg-emerald-500/20" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-stone-900" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-stone-600 dark:text-stone-400">
                System Online
              </p>
              <p className="text-[10px] text-stone-400 dark:text-stone-500">
                All systems operational
              </p>
            </div>
          </div>
        </div>
      </aside>
    );
  }
);
Sidebar.displayName = "Sidebar";

export { Sidebar };
