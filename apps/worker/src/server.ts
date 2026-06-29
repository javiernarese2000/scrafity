import { createServer } from "node:http";

import { iniciarDespacho } from "./despacho.js";
import { iniciarCola } from "./queue.js";
import { iniciarRetencion } from "./retencion.js";

// Servicio del worker: expone /health y corre la cola de render.
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

iniciarCola();
iniciarRetencion();
iniciarDespacho();
