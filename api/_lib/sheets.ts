import type { AppData, Project, Task, ShoppingItem } from "../../src/types.js";

type Cell = string | number | boolean;

interface RawRows {
  projects: Cell[][];
  tasks: Cell[][];
  shopping: Cell[][];
}

function getWebAppUrl(): string {
  const url = process.env.SHEETS_WEBAPP_URL;
  if (!url) throw new Error("Missing SHEETS_WEBAPP_URL env var");
  return url;
}

function toBool(v: Cell | undefined): boolean {
  return v === true || v === "TRUE" || v === "1" || v === "true";
}

function fromBool(v: boolean): string {
  return v ? "TRUE" : "FALSE";
}

function str(v: Cell | undefined): string {
  return v === undefined || v === null ? "" : String(v);
}

export async function readAll(): Promise<AppData> {
  const res = await fetch(getWebAppUrl());
  if (!res.ok) throw new Error(`Apps Script read failed: ${res.status}`);
  const raw = (await res.json()) as RawRows;

  const projects: Project[] = (raw.projects ?? [])
    .map((row) => ({
      id: str(row[0]),
      name: str(row[1]),
      accent: Number(row[2] ?? 0),
      order: Number(row[3] ?? 0),
      tasks: [] as Task[],
      shopping: [] as ShoppingItem[],
    }))
    .filter((p) => p.id)
    .sort((a, b) => a.order - b.order);

  const projectById = new Map(projects.map((p) => [p.id, p]));

  const tasksByProject = new Map<string, { task: Task; order: number }[]>();
  for (const row of raw.tasks ?? []) {
    const id = str(row[0]);
    const projectId = str(row[1]);
    if (!id || !projectId) continue;
    const task: Task = {
      id,
      text: str(row[2]),
      done: toBool(row[3]),
      dueDate: str(row[4]) || null,
      dependsOn: str(row[5]) ? str(row[5]).split(",").filter(Boolean) : [],
      notes: str(row[6]),
    };
    const list = tasksByProject.get(projectId) ?? [];
    list.push({ task, order: Number(row[7] ?? 0) });
    tasksByProject.set(projectId, list);
  }
  for (const [projectId, list] of tasksByProject) {
    const project = projectById.get(projectId);
    if (project) project.tasks = list.sort((a, b) => a.order - b.order).map((x) => x.task);
  }

  const generalShopping: ShoppingItem[] = [];
  const shoppingByProject = new Map<string, { item: ShoppingItem; order: number }[]>();
  for (const row of raw.shopping ?? []) {
    const id = str(row[0]);
    if (!id) continue;
    const projectId = str(row[1]);
    const item: ShoppingItem = {
      id,
      text: str(row[2]),
      done: toBool(row[3]),
      store: str(row[4]),
      notes: str(row[5]),
    };
    if (!projectId) {
      generalShopping.push(item);
      continue;
    }
    const list = shoppingByProject.get(projectId) ?? [];
    list.push({ item, order: Number(row[6] ?? 0) });
    shoppingByProject.set(projectId, list);
  }
  for (const [projectId, list] of shoppingByProject) {
    const project = projectById.get(projectId);
    if (project) project.shopping = list.sort((a, b) => a.order - b.order).map((x) => x.item);
  }

  return { projects, generalShopping };
}

export async function writeAll(data: AppData): Promise<void> {
  const projectRows = data.projects.map((p, i) => [p.id, p.name, p.accent, i]);

  const taskRows: (string | number)[][] = [];
  data.projects.forEach((p) => {
    p.tasks.forEach((t, i) => {
      taskRows.push([t.id, p.id, t.text, fromBool(t.done), t.dueDate ?? "", t.dependsOn.join(","), t.notes, i]);
    });
  });

  const shoppingRows: (string | number)[][] = [];
  data.projects.forEach((p) => {
    p.shopping.forEach((s, i) => {
      shoppingRows.push([s.id, p.id, s.text, fromBool(s.done), s.store, s.notes, i]);
    });
  });
  data.generalShopping.forEach((s, i) => {
    shoppingRows.push([s.id, "", s.text, fromBool(s.done), s.store, s.notes, i]);
  });

  const res = await fetch(getWebAppUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projects: projectRows, tasks: taskRows, shopping: shoppingRows }),
  });
  if (!res.ok) throw new Error(`Apps Script write failed: ${res.status}`);
  const json = (await res.json()) as { ok?: boolean };
  if (!json.ok) throw new Error("Apps Script write did not confirm success");
}
