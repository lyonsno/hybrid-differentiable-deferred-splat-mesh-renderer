import { defineConfig, type Plugin } from "vite";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

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

export default defineConfig({
  assetsInclude: ["**/*.wgsl"],
  plugins: [telemetryPlugin()],
  server: {
    open: true,
  },
});
