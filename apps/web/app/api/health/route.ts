// Endpoint de salud para Railway: responde 200 al instante, sin tocar base ni
// auth. Railway lo usa como healthcheck para hacer deploys sin caída (mantiene
// el contenedor viejo hasta que el nuevo responde acá).
export const dynamic = "force-dynamic";

export function GET() {
  return new Response("ok", {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}
