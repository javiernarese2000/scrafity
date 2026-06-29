"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { FullscreenToggle } from "./fullscreen-toggle";
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
        <FullscreenToggle />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
