"use client";

import { Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Selector de emojis liviano (sin dependencias): un popover con categorías y una
 * grilla. Devuelve el emoji elegido por `onPick` para insertarlo en el caption.
 */

type Categoria = { id: string; label: string; emojis: string[] };

const CATEGORIAS: Categoria[] = [
  {
    id: "frecuentes",
    label: "Frecuentes",
    emojis: [
      "🔥", "✨", "🎉", "❤️", "👏", "🙌", "💯", "🚀", "👀", "😍",
      "😎", "🤩", "🥳", "💪", "⚡", "⭐", "✅", "📍", "🎬", "📈",
    ],
  },
  {
    id: "caras",
    label: "Caras",
    emojis: [
      "😀", "😁", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰",
      "😘", "😋", "😎", "🤩", "🥳", "🤔", "🤨", "😐", "😶", "🙄",
      "😏", "😴", "😮", "😯", "😢", "😭", "😤", "😡", "🤯", "😬",
      "🥺", "😱", "🤗", "🤭", "😶‍🌫️", "😌", "😔", "🙃", "😅", "😆",
    ],
  },
  {
    id: "gestos",
    label: "Gestos",
    emojis: [
      "👍", "👎", "👏", "🙌", "🤝", "👊", "✊", "🤞", "✌️", "🤟",
      "🤘", "👌", "🤌", "👈", "👉", "👆", "👇", "☝️", "✋", "🖐️",
      "🙏", "💪", "🫶", "👋", "🤙", "💅", "👀", "🧠", "❤️‍🔥", "🫡",
    ],
  },
  {
    id: "corazones",
    label: "Amor",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💕",
      "💞", "💓", "💗", "💖", "💘", "💝", "❣️", "💔", "❤️‍🔥", "💟",
    ],
  },
  {
    id: "simbolos",
    label: "Símbolos",
    emojis: [
      "🔥", "✨", "💯", "⚡", "⭐", "🌟", "💫", "🎉", "🎊", "🏆",
      "🥇", "🎯", "📈", "📊", "💰", "💎", "🔔", "📣", "📢", "✅",
      "❌", "⚠️", "❗", "❓", "💬", "💭", "🔗", "📌", "📍", "🆕",
    ],
  },
  {
    id: "objetos",
    label: "Temas",
    emojis: [
      "🎬", "🎥", "📹", "📸", "🎤", "🎧", "🎵", "🎶", "📰", "📺",
      "⚽", "🏀", "🏈", "🎾", "🏐", "🥇", "🍕", "🍔", "☕", "🍿",
      "🌍", "🌆", "🏙️", "🚗", "✈️", "🎸", "💻", "📱", "🛍️", "🎮",
    ],
  },
];

export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState(CATEGORIAS[0]!.id);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const activa = CATEGORIAS.find((c) => c.id === cat) ?? CATEGORIAS[0]!;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Insertar emoji"
        aria-label="Insertar emoji"
        className={
          "grid size-8 place-items-center rounded-lg border border-line text-muted transition-colors hover:bg-elevated hover:text-fg " +
          (open ? "border-accent text-fg" : "")
        }
      >
        <Smile className="size-4" />
      </button>

      {open && (
        <div className="absolute right-0 bottom-full z-30 mb-2 w-72 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-xl">
          <div className="flex gap-0.5 border-b border-line/70 p-1.5">
            {CATEGORIAS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                className={
                  "flex-1 rounded-md px-1.5 py-1 text-[10px] font-medium transition-colors " +
                  (c.id === cat
                    ? "bg-accent/10 text-fg"
                    : "text-muted hover:bg-elevated")
                }
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="grid max-h-44 grid-cols-8 gap-0.5 overflow-y-auto p-2">
            {activa.emojis.map((e, i) => (
              <button
                key={`${e}-${i}`}
                type="button"
                onClick={() => onPick(e)}
                className="grid aspect-square place-items-center rounded-md text-lg transition-colors hover:bg-elevated"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
