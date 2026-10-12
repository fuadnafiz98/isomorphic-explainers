// Tiny static file server with optional live reload (used by `npm run dev` and `npm run preview`).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};
const RELOAD = `<script>new EventSource("/__reload").onmessage=()=>location.reload()</script>`;

export function serve({ root, port = 4321, reload = false }) {
  const base = resolve(root);
  const clients = new Set();
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (reload && url.pathname === "/__reload") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
      res.write(": connected\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    let file = normalize(join(base, decodeURIComponent(url.pathname)));
    if (file !== base && !file.startsWith(base + sep)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    try {
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
      let body = await readFile(file);
      const type = TYPES[extname(file)] ?? "application/octet-stream";
      if (reload && type.startsWith("text/html")) body = Buffer.from(body.toString("utf8").replace("</body>", `${RELOAD}</body>`));
      res.writeHead(200, { "content-type": type, "cache-control": "no-store" }).end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("not found");
    }
  });
  return new Promise((done) => {
    server.listen(port, () => done({ server, port, reload: () => clients.forEach((client) => client.write("data: reload\n\n")) }));
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2] ?? "dist";
  const { port } = await serve({ root, port: Number(process.env.PORT ?? 4321) });
  console.log(`serving ${root} at http://localhost:${port}`);
}
