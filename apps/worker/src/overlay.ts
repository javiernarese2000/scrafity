import { chromium, type Browser } from "playwright";

let browserP: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserP) {
    browserP = chromium.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return browserP;
}

/** Renderiza un HTML a un PNG transparente de WxH (mismo motor que el preview). */
export async function renderOverlayHtml(
  html: string,
  W: number,
  H: number,
  outPath: string,
): Promise<void> {
  const b = await getBrowser();
  const page = await b.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });
  try {
    await page.setContent(html, { waitUntil: "networkidle" });
    // Esperar a que las fuentes web terminen de cargar.
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: outPath, omitBackground: true });
  } finally {
    await page.close();
  }
}
