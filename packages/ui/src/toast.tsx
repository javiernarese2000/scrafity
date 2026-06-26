"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCheck } from "lucide-react";
import { useState } from "react";

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  function show(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2600);
  }
  return { message, show };
}

export function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg shadow-float"
        >
          <CheckCheck className="size-4 text-success" />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
