"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { navItems } from "./nav";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SidebarContent({
  onNavigate,
  collapsed = false,
  onToggle,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-16 items-center gap-2.5",
          collapsed ? "justify-center px-0" : "px-6",
        )}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-brand-foreground font-display text-lg font-semibold">
          S
        </span>
        {!collapsed && (
          <span className="font-display text-xl font-semibold text-fg">
            Scrapify
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "relative flex items-center rounded-lg py-2 text-sm transition-colors",
                collapsed ? "justify-center px-0" : "gap-3 px-3",
                active
                  ? "bg-elevated font-medium text-fg"
                  : "text-muted hover:bg-elevated/60 hover:text-fg",
              )}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent" />
              )}
              <Icon className="size-[18px] shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "flex items-center border-t border-line py-3",
          collapsed ? "justify-center px-0" : "justify-between px-5",
        )}
      >
        {!collapsed && (
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            Fase 1 · MVP
          </p>
        )}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            title={collapsed ? "Expandir" : "Colapsar"}
            className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-elevated hover:text-fg"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[18px]" />
            ) : (
              <PanelLeftClose className="size-[18px]" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
