"use client";

import { Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { titleForPath } from "./nav";
import { UserMenu } from "./user-menu";

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-canvas/80 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menú"
        className="grid size-9 place-items-center rounded-lg border border-line text-muted hover:bg-elevated hover:text-fg lg:hidden"
      >
        <Menu className="size-4" />
      </button>

      <h1 className="font-display text-lg font-medium text-fg">
        {titleForPath(pathname)}
      </h1>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted sm:flex">
          <Search className="size-4" />
          <input
            placeholder="Buscar notas…"
            className="w-40 bg-transparent text-fg placeholder:text-muted focus:outline-none"
          />
        </div>
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
