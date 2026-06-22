"use client";

import { motion } from "framer-motion";
import { Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { proveedores, tonos } from "@/data/pegar";
import type { EscenarioConfig } from "./types";

const provValue = { Auto: "auto", DeepSeek: "deepseek", Claude: "claude" } as const;

function Switch({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "relative h-6 w-10 rounded-full transition-colors",
        on ? "bg-brand" : "bg-line",
      )}
      aria-pressed={on}
    >
      <span
        className={cn(
          "absolute top-0.5 size-5 rounded-full bg-surface transition-all",
          on ? "left-[18px]" : "left-0.5",
        )}
      />
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-brand/40 bg-brand/12 text-brand"
          : "border-line text-muted hover:bg-elevated hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

export function ConfigPanel({
  value,
  onChange,
  onDelete,
  onClose,
}: {
  value: EscenarioConfig;
  onChange: (patch: Partial<EscenarioConfig>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 24, opacity: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
      className="absolute right-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-80 flex-col overflow-auto rounded-[var(--radius-lg)] border border-line bg-surface shadow-float"
    >
      <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
        <h3 className="font-display text-base font-medium text-fg">Escenario</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="grid size-7 place-items-center rounded-lg text-muted hover:bg-elevated"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-5 p-4">
        <label className="block">
          <span className="text-xs text-muted">Nombre</span>
          <input
            value={value.nombre}
            onChange={(e) => onChange({ nombre: e.target.value })}
            className={cn(inputCls, "mt-1.5")}
          />
        </label>

        <label className="block">
          <span className="text-xs text-muted">Condición · tema</span>
          <input
            value={value.tema ?? ""}
            onChange={(e) => onChange({ tema: e.target.value || null })}
            placeholder="ej: política"
            className={cn(inputCls, "mt-1.5")}
          />
        </label>

        <div>
          <p className="mb-2 text-xs text-muted">Versiones</p>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Chip
                key={n}
                active={value.nVersiones === n}
                onClick={() => onChange({ nVersiones: n })}
              >
                {n}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs text-muted">Tono</p>
          <div className="flex flex-wrap gap-1.5">
            {tonos.map((t) => (
              <Chip
                key={t}
                active={value.tono === t}
                onClick={() => onChange({ tono: t })}
              >
                {t}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs text-muted">Proveedor de IA</p>
          <div className="flex rounded-lg border border-line p-0.5">
            {proveedores.map((p) => {
              const val = provValue[p];
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChange({ proveedor: val })}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                    value.proveedor === val
                      ? "bg-elevated text-fg"
                      : "text-muted hover:text-fg",
                  )}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="text-xs text-muted">Cupo diario (máx. notas)</span>
          <input
            type="number"
            min={0}
            value={value.cupoDiario ?? ""}
            onChange={(e) =>
              onChange({
                cupoDiario: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="sin límite"
            className={cn(inputCls, "mt-1.5")}
          />
        </label>

        <div className="flex items-center justify-between">
          <span className="text-sm text-fg">Requiere moderación</span>
          <Switch
            on={value.moderacion}
            onToggle={() => onChange({ moderacion: !value.moderacion })}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-fg">Activo</span>
          <Switch
            on={value.activo}
            onToggle={() => onChange({ activo: !value.activo })}
          />
        </div>

        <Button
          variant="danger"
          onClick={onDelete}
          className="w-full"
        >
          <Trash2 className="size-4" />
          Eliminar escenario
        </Button>
      </div>
    </motion.div>
  );
}
