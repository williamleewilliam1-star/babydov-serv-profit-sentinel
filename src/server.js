import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeOpportunity, MODEL } from "./serv.js";
import { scanTermix } from "./termix.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const port = Number(process.env.PORT || 8787);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  res.end(body);
}
async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) throw new Error("Request body too large.");
  }
  return JSON.parse(raw || "{}");
}

async function serveFile(res, pathname) {
  const target = pathname === "/" ? "index.html" : pathname.slice(1);
  if (!["index.html", "app.js", "style.css"].includes(target)) return false;
  const full = path.join(publicDir, target);
  const data = await fs.readFile(full);
  res.writeHead(200, {
    "Content-Type": mime[path.extname(full)] || "application/octet-stream",
    "Cache-Control": target === "index.html" ? "no-store" : "public, max-age=300"
  });
  res.end(data);
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        service: "BABYDOV SERV Profit Sentinel",
        provider: "OpenServ SERV Reasoning",
        model: MODEL
      });
    }

    if (req.method === "GET" && url.pathname === "/api/termix/scan") {
      const result = await scanTermix();
      return sendJson(res, 200, result);
    }

    if (req.method === "POST" && url.pathname === "/api/analyze") {
      const body = await readJson(req);
      const result = await analyzeOpportunity(body);
      return sendJson(res, 200, result);
    }

    if (req.method === "GET" && await serveFile(res, url.pathname)) return;
    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Unexpected server error"
    });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`BABYDOV SERV Profit Sentinel listening on http://0.0.0.0:${port}`);
});
