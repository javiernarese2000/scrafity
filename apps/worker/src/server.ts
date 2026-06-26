import { createServer } from "node:http";

// Servicio mínimo del worker. Por ahora solo expone /health para poder
// desplegarlo aislado en Railway. La cola de render (Inngest/DB) se cablea
// cuando exista el esquema de video — ver memory/09-redes-multiapp.md.
const port = Number(process.env.PORT ?? 8080);

createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "worker" }));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
}).listen(port, () => {
  console.log(`worker escuchando en :${port}`);
});
