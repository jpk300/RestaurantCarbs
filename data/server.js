const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 4173);
const HOST = "0.0.0.0";
const ROOT = __dirname;
const STATE_FILE = path.join(ROOT, "data", "app-state.json");
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me";
const DATASET_ALLOWED_HOSTS = new Set(["www.menustat.org", "menustat.org", "catalog.data.gov", "data.gov"]);

const DEFAULT_STATE = {
  dataSource: { datasetUrl: "https://www.menustat.org/uploads/1/4/1/6/141624194/ms_annual_data_2022.xls" },
  catalog: [],
  selectedIds: [],
  publishedCatalog: []
};

function ensureStateFile() {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(DEFAULT_STATE, null, 2));
  }
}

function readState() {
  ensureStateFile();
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function writeState(next) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2));
}

function sendJson(res, code, payload) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, code, text) {
  res.writeHead(code, {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer"
  });
  res.end(text);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".csv") return "text/csv; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 10_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function decodeBasicAuth(header = "") {
  if (!header.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex < 0) return null;
    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1)
    };
  } catch {
    return null;
  }
}

function isAuthorized(req) {
  const credentials = decodeBasicAuth(req.headers.authorization || "");
  return credentials && credentials.username === ADMIN_USERNAME && credentials.password === ADMIN_PASSWORD;
}

function requireAdmin(req, res) {
  if (isAuthorized(req)) return true;
  res.writeHead(401, {
    "Content-Type": "application/json; charset=utf-8",
    "WWW-Authenticate": 'Basic realm="RestaurantCarbs Admin"'
  });
  res.end(JSON.stringify({ error: "Unauthorized" }));
  return false;
}

function validateDatasetUrl(rawUrl) {
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error("Only https URLs are allowed.");
  }

  if (!DATASET_ALLOWED_HOSTS.has(parsedUrl.hostname)) {
    throw new Error(`Host is not allowlisted: ${parsedUrl.hostname}`);
  }

  return parsedUrl;
}

async function handleApi(req, res, parsed) {
  if (req.method === "GET" && parsed.pathname === "/api/state") {
    const state = readState();
    return sendJson(res, 200, { publishedCatalog: state.publishedCatalog || [] });
  }

  if (req.method === "GET" && parsed.pathname === "/api/admin/state") {
    if (!requireAdmin(req, res)) return;
    return sendJson(res, 200, readState());
  }

  if (req.method === "POST" && parsed.pathname === "/api/source") {
    if (!requireAdmin(req, res)) return;
    const body = JSON.parse((await getBody(req)) || "{}");
    const state = readState();
    state.dataSource = { datasetUrl: String(body.datasetUrl || "") };
    writeState(state);
    return sendJson(res, 200, { ok: true, dataSource: state.dataSource });
  }

  if (req.method === "POST" && parsed.pathname === "/api/catalog") {
    if (!requireAdmin(req, res)) return;
    const body = JSON.parse((await getBody(req)) || "{}");
    const catalog = Array.isArray(body.catalog) ? body.catalog : [];
    const state = readState();
    state.catalog = catalog;
    writeState(state);
    return sendJson(res, 200, { ok: true, restaurants: catalog.length });
  }

  if (req.method === "POST" && parsed.pathname === "/api/publish") {
    if (!requireAdmin(req, res)) return;
    const body = JSON.parse((await getBody(req)) || "{}");
    const selectedIds = Array.isArray(body.selectedIds) ? body.selectedIds : [];
    const state = readState();
    state.selectedIds = selectedIds;
    state.publishedCatalog = state.catalog.filter((r) => selectedIds.includes(r.id));
    writeState(state);
    return sendJson(res, 200, { ok: true, published: state.publishedCatalog.length });
  }

  if (req.method === "GET" && parsed.pathname === "/api/fetch-dataset") {
    if (!requireAdmin(req, res)) return;

    const remoteUrl = parsed.searchParams.get("url");
    if (!remoteUrl) return sendJson(res, 400, { error: "Missing url" });

    try {
      const parsedRemoteUrl = validateDatasetUrl(remoteUrl);
      const remote = await fetch(parsedRemoteUrl.toString());
      if (!remote.ok) return sendJson(res, 400, { error: `Remote fetch failed (${remote.status})` });

      const buffer = Buffer.from(await remote.arrayBuffer());
      res.writeHead(200, {
        "Content-Type": remote.headers.get("content-type") || "application/octet-stream",
        "X-Content-Type-Options": "nosniff"
      });
      return res.end(buffer);
    } catch (error) {
      return sendJson(res, 500, { error: `Fetch failed: ${error.message}` });
    }
  }

  return sendJson(res, 404, { error: "Not found" });
}

function serveStatic(req, res, parsed) {
  let pathname = parsed.pathname === "/" ? "/index.html" : parsed.pathname;
  const filePath = path.normalize(path.join(ROOT, pathname));

  if (pathname === "/admin.html" && !requireAdmin(req, res)) {
    return;
  }

  if (!filePath.startsWith(ROOT)) {
    return sendText(res, 403, "Forbidden");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      return sendText(res, 404, "Not found");
    }
    res.writeHead(200, {
      "Content-Type": contentType(filePath),
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer"
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (parsed.pathname.startsWith("/api/")) {
      return await handleApi(req, res, parsed);
    }
    return serveStatic(req, res, parsed);
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
});

server.listen(PORT, HOST, () => {
  ensureStateFile();
  if (ADMIN_USERNAME === "admin" && ADMIN_PASSWORD === "change-me") {
    console.warn("WARNING: Using default admin credentials. Set ADMIN_USERNAME and ADMIN_PASSWORD.");
  }
  console.log(`RestaurantCarbs running on http://${HOST}:${PORT}`);
});
