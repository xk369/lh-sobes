import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyInterviewCommand, createSeedState, deriveState } from "./src/interview-state.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3210);
const HOST = process.env.HOST || "127.0.0.1";
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "interviews.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const SHARED_VENUE_DIR = path.resolve(
  __dirname,
  "../loft_hall_internship_unified_migration_integrate/public/assets/venues"
);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"]
]);

await ensureDataFile();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const isHead = req.method === "HEAD";

    if (req.method === "GET" && url.pathname === "/api/state") {
      const state = await loadState();
      sendJson(res, { ok: true, state });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/command") {
      const command = await readJson(req);
      const state = await loadState();
      const next = applyInterviewCommand(state, command);
      await saveState(next.state);
      sendJson(res, { ok: true, ...next });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/reset") {
      const state = createSeedState(new Date().toISOString());
      await saveState(state);
      sendJson(res, { ok: true, state });
      return;
    }

    if ((req.method === "GET" || isHead) && url.pathname.startsWith("/shared-assets/venues/")) {
      serveSharedVenueAsset(url.pathname, res, isHead);
      return;
    }

    if (req.method === "GET" || isHead) {
      servePublic(url.pathname, res, isHead);
      return;
    }

    sendJson(res, { ok: false, error: "Method not allowed" }, 405);
  } catch (error) {
    const status = error.status || 400;
    sendJson(res, { ok: false, error: error.message || "Unexpected error" }, status);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`LOFT HALL interviews MVP: http://${HOST}:${PORT}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is busy. Start with PORT=3211 npm start`);
    process.exit(1);
  }
  throw error;
});

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) {
    await saveState(createSeedState(new Date().toISOString()));
  }
}

async function loadState() {
  const raw = await readFile(DATA_FILE, "utf8");
  return deriveState(JSON.parse(raw));
}

async function saveState(state) {
  await writeFile(DATA_FILE, `${JSON.stringify(deriveState(state), null, 2)}\n`, "utf8");
}

function servePublic(urlPath, res, headOnly = false) {
  const normalized = safeJoin(PUBLIC_DIR, urlPath === "/" ? "index.html" : urlPath);
  if (!normalized || !existsSync(normalized)) {
    sendText(res, "Not found", 404);
    return;
  }
  streamFile(normalized, res, null, headOnly);
}

function serveSharedVenueAsset(urlPath, res, headOnly = false) {
  const fileName = decodeURIComponent(urlPath.replace("/shared-assets/venues/", ""));
  const normalized = safeJoin(SHARED_VENUE_DIR, fileName);
  if (!normalized || !existsSync(normalized)) {
    sendText(res, "Not found", 404);
    return;
  }
  streamFile(normalized, res, "image/webp", headOnly);
}

function safeJoin(root, requestedPath) {
  const normalized = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  const fullPath = path.join(root, normalized);
  return fullPath.startsWith(root) ? fullPath : null;
}

function streamFile(filePath, res, forcedType = null, headOnly = false) {
  const type = forcedType || mimeTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  if (headOnly) {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
}

function sendJson(res, payload, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, payload, status = 200) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(payload);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(Object.assign(new Error("Payload too large"), { status: 413 }));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(Object.assign(new Error("Invalid JSON"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}
