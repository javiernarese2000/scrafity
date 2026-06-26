import { renderVideo } from "./render.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const input = arg("input");
const output = arg("output");

if (!input || !output) {
  console.error(
    "Uso: render --input <video> --output <mp4> [--logo <png>] [--zocalo <texto>]",
  );
  process.exit(1);
}

await renderVideo({
  inputPath: input,
  outputPath: output,
  logoPath: arg("logo"),
  zocalo: arg("zocalo"),
});

console.log("✅ Render listo:", output);
