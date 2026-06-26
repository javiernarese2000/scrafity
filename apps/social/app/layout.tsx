import type { Metadata } from "next";
import {
  Anton,
  Archivo,
  Bebas_Neue,
  Fraunces,
  Geist,
  Geist_Mono,
  Inter,
  Oswald,
} from "next/font/google";

import { AppShell } from "@/components/shell/app-shell";
import { ThemeScript } from "@/components/theme/theme-script";
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

// Tipografías extra para el Estudio (zócalos con impacto).
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});
const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});
const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
});
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Scrapify · Redes",
  description: "Estudio de video y publicación en redes sociales",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${fraunces.variable} ${geist.variable} ${geistMono.variable} ${anton.variable} ${bebas.variable} ${oswald.variable} ${archivo.variable} ${inter.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
