import { defineConfig, type Plugin } from "vite";
import { writeFileSync, mkdirSync, createReadStream, statSync } from "node:fs";
import { join, extname } from "node:path";
import { homedir } from "node:os";

function telemetryPlugin(): Plugin {
  const dir = join(process.cwd(), ".telemetry");
  return {
    name: "telemetry-sink",
    configureServer(server) {
      mkdirSync(dir, { recursive: true });
      server.middlewares.use("/api/telemetry", (req, res) => {
        if (req.method !== "POST") {
          res.writeHead(405);
          res.end();
          return;
        }
        let body = "";
        req.on("data", (chunk: string) => { body += chunk; });
        req.on("end", () => {
          try {
            const data = JSON.parse(body);
            const file = join(dir, "tile-budget.jsonl");
            writeFileSync(file, body + "\n", { flag: "a" });
            // Also write latest snapshot for easy reads
            writeFileSync(join(dir, "tile-budget-latest.json"), JSON.stringify(data, null, 2) + "\n");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end('{"ok":true}');
          } catch {
            res.writeHead(400);
            res.end('{"error":"bad json"}');
          }
        });
      });
    },
  };
}

function kaminosAssetsPlugin(): Plugin {
  const assetsRoot = join(homedir(), ".local/state/kaminos/assets");
  const mimeTypes: Record<string, string> = {
    ".ply": "application/octet-stream",
    ".json": "application/json",
    ".spz": "application/octet-stream",
    ".glb": "model/gltf-binary",
  };
  return {
    name: "kaminos-assets",
    configureServer(server) {
      server.middlewares.use("/kaminos-assets", (req, res, next) => {
        const urlPath = decodeURIComponent(req.url?.split("?")[0] ?? "");
        if (urlPath.includes("..")) { res.writeHead(403); res.end(); return; }
        const filePath = join(assetsRoot, urlPath);
        try {
          const stat = statSync(filePath);
          if (!stat.isFile()) { next(); return; }
          const ext = extname(filePath).toLowerCase();
          res.writeHead(200, {
            "Content-Type": mimeTypes[ext] ?? "application/octet-stream",
            "Content-Length": stat.size,
            "Cache-Control": "no-cache",
          });
          createReadStream(filePath).pipe(res);
        } catch {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  assetsInclude: ["**/*.wgsl"],
  plugins: [telemetryPlugin(), kaminosAssetsPlugin()],
  server: {
    open: true,
  },
});
