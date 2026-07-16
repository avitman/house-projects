import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import handler from "../api/data";

const PORT = 3001;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res: ServerResponse) => {
  if (!req.url?.startsWith("/api/data")) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  const raw = await readBody(req);
  let body: unknown;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = undefined;
    }
  }

  const vercelRes = res as ServerResponse & { status: (code: number) => typeof vercelRes; json: (obj: unknown) => void };
  vercelRes.status = (code: number) => {
    res.statusCode = code;
    return vercelRes;
  };
  vercelRes.json = (obj: unknown) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(obj));
  };

  const vercelReq = Object.assign(req, { body });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await handler(vercelReq as any, vercelRes as any);
});

server.listen(PORT, () => {
  console.log(`Local API dev server running at http://localhost:${PORT}`);
});
