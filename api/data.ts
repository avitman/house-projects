import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readAll, writeAll } from "./_lib/sheets.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const data = await readAll();
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const body = req.body ?? {};
      if (!Array.isArray(body.projects) || !Array.isArray(body.generalShopping)) {
        return res.status(400).json({ error: "Expected { projects: [], generalShopping: [] }" });
      }
      await writeAll({ projects: body.projects, generalShopping: body.generalShopping });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
}
