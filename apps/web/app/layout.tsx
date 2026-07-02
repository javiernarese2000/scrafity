import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

import { AppShell } from "@/components/shell/app-shell";
import { ThemeScript } from "@/components/theme/theme-script";
import { esAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Scrapify",
  description: "Agregador y reescritor de noticias con IA",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const isAdmin = esAdmin(user);

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${fraunces.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <body>
        <ThemeScript />
        <AppShell isAdmin={isAdmin}>{children}</AppShell>
      </body>
    </html>
  );
}
