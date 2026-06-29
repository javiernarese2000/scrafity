"use client";

import { Maximize, Minimize } from "lucide-react";
import { useEffect, useState } from "react";

/** Botón para entrar/salir de pantalla completa (Fullscreen API). */
export function FullscreenToggle() {
  const [full, setFull] = useState(false);

  useEffect(() => {
    const onChange = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    onChange();
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggle() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={full ? "Salir de pantalla completa" : "Pantalla completa"}
      title={full ? "Salir de pantalla completa" : "Pantalla completa"}
      className="grid size-9 place-items-center rounded-lg border border-line text-muted hover:bg-elevated hover:text-fg"
    >
      {full ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
    </button>
  );
}
