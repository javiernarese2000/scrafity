"use client";

import { cn } from "@scrapify/ui/cn";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { SidebarContent } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  children,
  isAdmin = true,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setCollapsed(localStorage.getItem("redes-sidebar-collapsed") === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      localStorage.setItem("redes-sidebar-collapsed", c ? "0" : "1");
      return !c;
    });
  }

  // El login se muestra sin el armazón de la app.
  if (pathname === "/login") return <>{children}</>;

  // El Estudio y el Compositor son editores a pantalla completa (sin scroll de página).
  const isEditor = pathname === "/estudio" || pathname === "/componer";

  return (
    <div className={cn("flex", isEditor ? "h-dvh overflow-hidden" : "min-h-dvh")}>
      {/* Sidebar fijo en desktop (colapsable a riel de íconos) */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-line bg-surface transition-[width] duration-200 lg:block",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="sticky top-0 h-dvh">
          <SidebarContent
            collapsed={collapsed}
            onToggle={toggleCollapsed}
            isAdmin={isAdmin}
          />
        </div>
      </aside>

      {/* Drawer en mobile */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-64 border-r border-line bg-surface lg:hidden"
            >
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menú"
                className="absolute right-3 top-5 grid size-8 place-items-center rounded-lg text-muted hover:bg-elevated"
              >
                <X className="size-4" />
              </button>
              <SidebarContent onNavigate={() => setMenuOpen(false)} isAdmin={isAdmin} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main
          className={cn(
            "flex-1",
            isEditor
              ? "overflow-hidden"
              : "px-4 py-8 sm:px-6 lg:px-10",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
