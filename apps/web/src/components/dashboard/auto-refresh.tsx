"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Refresca los datos del server component cada `seconds` (dashboard en vivo). */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
