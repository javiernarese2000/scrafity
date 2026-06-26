"use client";

import { cn } from "@scrapify/ui/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "./nav";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-6">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-brand-foreground font-display text-lg font-semibold">
          R
        </span>
        <span className="font-display text-xl font-semibold text-fg">Redes</span>
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
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-elevated font-medium text-fg"
                  : "text-muted hover:bg-elevated/60 hover:text-fg",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent" />
              )}
              <Icon className="size-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between border-t border-line px-5 py-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
          Panel de Redes
        </p>
      </div>
    </div>
  );
}
