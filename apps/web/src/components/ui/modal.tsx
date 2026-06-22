"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="relative w-full max-w-md rounded-[var(--radius-lg)] border border-line bg-surface shadow-float"
          >
            <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
              <h3 className="font-display text-lg font-medium text-fg">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="grid size-8 place-items-center rounded-lg text-muted hover:bg-elevated"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export const inputCls =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40";
