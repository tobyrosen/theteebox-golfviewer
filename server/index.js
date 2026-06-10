import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");
const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;

const { hosts: ALLOWED_HOSTS } = JSON.parse(
  await readFile(join(__dirname, "allowlist.json"), "utf8"),
);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

async function serveStatic(req, res) {
  const reqPath = req.url.split("?")[0];
  const filePath = reqPath === "/" ? "/index.html" : reqPath;
  const safe = normalize(join(PUBLIC_DIR, filePath));
  if (safe !== PUBLIC_DIR && !safe.startsWith(PUBLIC_DIR + sep))
    return send(res, 403, "Forbidden");

  try {
    const body = await readFile(safe);
    const type = MIME[extname(safe)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(body);
  } catch {
    send(res, 404, "Not found");
  }
}

async function proxy(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`).searchParams.get(
    "url",
  );
  if (!url) return send(res, 400, "Missing ?url=");

  let target;
  try {
    target = new URL(url);
  } catch {
    return send(res, 400, "Invalid URL");
  }

  if (target.protocol !== "https:") {
    return send(res, 400, "HTTPS URLs only");
  }

  if (!ALLOWED_HOSTS.includes(target.hostname)) {
    return send(res, 403, "Host not permitted");
  }

  try {
    const upstream = await fetch(target.toString(), {
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Teebox/0.1",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (upstream.status >= 300 && upstream.status < 400) {
      return send(res, 403, "Redirect not permitted");
    }
    const text = await upstream.text();
    res.writeHead(upstream.status, {
      "Content-Type": "text/html; charset=utf-8",
      "Access-Control-Allow-Origin": `http://localhost:${PORT}`,
      "Cache-Control": "no-store",
    });
    res.end(text);
  } catch (err) {
    send(res, 502, `Upstream fetch failed: ${err.message}`);
  }
}

function send(res, status, msg) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(msg);
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/proxy")) return proxy(req, res);
  return serveStatic(req, res);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n  ✖  Port ${PORT} is already in use. Close the other process or set PORT=<number> and try again.\n`,
    );
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`teebox running at http://localhost:${PORT}`);
});
