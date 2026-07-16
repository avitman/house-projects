import { useState, useEffect, useRef } from "react";
import {
  Plus, X, Trash2, ShoppingCart, ListChecks, ChevronRight,
  Home, Check, Loader2, Calendar, Link2, Lock, Store, ChevronDown, Paperclip, ExternalLink,
} from "lucide-react";
import type { Project, Task, ShoppingItem, AppData } from "./types";

const ACCENTS = [
  { bg: "#3B5B74", tint: "#E7EEF2" }, // denim
  { bg: "#D9A441", tint: "#FBF4E4" }, // mustard
  { bg: "#6B4557", tint: "#F1E7EC" }, // plum
  { bg: "#5C7A6B", tint: "#EAF0EC" }, // sage
  { bg: "#A85C4A", tint: "#F4E8E4" }, // brick
];
const GENERAL_ACCENT = { bg: "#7A7566", tint: "#EDEAE4" };

const PAPER = "#F6F1E7";
const INK = "#24313E";
const INK_SOFT = "#5B6672";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d: string | null) {
  if (!d) return "";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

function isUrl(str: string) {
  return /^https?:\/\/\S+/i.test((str || "").trim());
}

function emptyProject(name: string, idx: number): Project {
  return { id: uid(), name, accent: idx % ACCENTS.length, tasks: [], shopping: [] };
}

type SyncState = "idle" | "saving" | "error";

export default function App() {
  const [projects, setProjects] = useState<Project[] | null>(null); // null = loading
  const [generalShopping, setGeneralShopping] = useState<ShoppingItem[]>([]);
  const [view, setView] = useState<"projects" | "shopping">("projects");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<"tasks" | "shopping">("tasks");
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/data");
        if (!res.ok) throw new Error("failed to load");
        const data: AppData = await res.json();
        setProjects(data.projects || []);
        setGeneralShopping(data.generalShopping || []);
      } catch {
        setProjects([]);
        setGeneralShopping([]);
      }
    })();
  }, []);

  function persist(nextProjects: Project[], nextGeneral: ShoppingItem[]) {
    setProjects(nextProjects);
    setGeneralShopping(nextGeneral);
    setSyncState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projects: nextProjects, generalShopping: nextGeneral }),
        });
        setSyncState(res.ok ? "idle" : "error");
      } catch {
        setSyncState("error");
      }
    }, 250);
  }

  const activeProject = projects?.find((p) => p.id === activeId) || null;

  function addProject() {
    const name = newProjectName.trim();
    if (!name || !projects) return;
    persist([...projects, emptyProject(name, projects.length)], generalShopping);
    setNewProjectName("");
    setShowAddProject(false);
  }

  function deleteProject(id: string) {
    if (!projects) return;
    persist(projects.filter((p) => p.id !== id), generalShopping);
    if (activeId === id) setActiveId(null);
  }

  function addTask(projectId: string, text: string, dueDate: string, dependsOn: string[], notes: string) {
    if (!projects) return;
    const next = projects.map((p) =>
      p.id === projectId
        ? { ...p, tasks: [...p.tasks, { id: uid(), text, done: false, dueDate: dueDate || null, dependsOn, notes: notes || "" }] }
        : p
    );
    persist(next, generalShopping);
  }

  function addShoppingItem(projectId: string, text: string, store: string, notes: string) {
    if (!projects) return;
    const next = projects.map((p) =>
      p.id === projectId
        ? { ...p, shopping: [...p.shopping, { id: uid(), text, done: false, store: store || "", notes: notes || "" }] }
        : p
    );
    persist(next, generalShopping);
  }

  function toggleItem(projectId: string, listKey: "tasks" | "shopping", itemId: string) {
    if (!projects) return;
    const next = projects.map((p) =>
      p.id === projectId
        ? { ...p, [listKey]: (p[listKey] as { id: string; done: boolean }[]).map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)) }
        : p
    ) as Project[];
    persist(next, generalShopping);
  }

  function deleteItem(projectId: string, listKey: "tasks" | "shopping", itemId: string) {
    if (!projects) return;
    const next = projects.map((p) => {
      if (p.id !== projectId) return p;
      if (listKey === "tasks") {
        const filtered = p.tasks.filter((it) => it.id !== itemId);
        return { ...p, tasks: filtered.map((t) => ({ ...t, dependsOn: t.dependsOn.filter((d) => d !== itemId) })) };
      }
      return { ...p, shopping: p.shopping.filter((it) => it.id !== itemId) };
    });
    persist(next, generalShopping);
  }

  function updateItemNote(projectId: string, listKey: "tasks" | "shopping", itemId: string, note: string) {
    if (!projects) return;
    const next = projects.map((p) =>
      p.id === projectId
        ? { ...p, [listKey]: (p[listKey] as { id: string; notes: string }[]).map((it) => (it.id === itemId ? { ...it, notes: note } : it)) }
        : p
    ) as Project[];
    persist(next, generalShopping);
  }

  function addGeneralItem(text: string, store: string, notes: string) {
    if (!projects) return;
    persist(projects, [...generalShopping, { id: uid(), text, done: false, store: store || "", notes: notes || "" }]);
  }

  function toggleGeneralItem(itemId: string) {
    if (!projects) return;
    persist(projects, generalShopping.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)));
  }

  function deleteGeneralItem(itemId: string) {
    if (!projects) return;
    persist(projects, generalShopping.filter((it) => it.id !== itemId));
  }

  function updateGeneralNote(itemId: string, note: string) {
    if (!projects) return;
    persist(projects, generalShopping.map((it) => (it.id === itemId ? { ...it, notes: note } : it)));
  }

  const allStores = Array.from(
    new Set([
      ...(projects || []).flatMap((p) => p.shopping.map((s) => s.store).filter(Boolean)),
      ...generalShopping.map((s) => s.store).filter(Boolean),
    ])
  ).sort();

  if (projects === null) {
    return (
      <div style={{ background: PAPER, color: INK }} className="min-h-screen flex items-center justify-center" dir="rtl">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ background: PAPER, color: INK, fontFamily: "'Heebo', sans-serif" }} className="min-h-screen">
      <style>{`
        .display-font { font-family: 'Frank Ruhl Libre', serif; }
        .folder-card { position: relative; }
        .folder-tab { position: absolute; top: -13px; right: 22px; width: 84px; height: 18px; border-radius: 7px 7px 0 0; }
        .checkbox-circle { width: 22px; height: 22px; border-radius: 999px; border: 2px solid; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .15s ease; }
        .item-row { transition: background .15s ease; }
        .item-row:hover .del-btn { opacity: 1; }
        .item-row:hover .note-btn { opacity: 1; }
        .del-btn { opacity: 0; transition: opacity .15s ease; }
        .note-btn.inactive { opacity: 0; transition: opacity .15s ease; }
        @media (hover: none) { .del-btn { opacity: .55; } .note-btn.inactive { opacity: .4; } }
      `}</style>

      <header className="px-5 pt-7 pb-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <Home size={20} strokeWidth={2.5} />
          <h1 className="display-font text-2xl font-bold">פרויקטים בבית</h1>
        </div>
        <p style={{ color: INK_SOFT }} className="text-sm mt-1">משימות וקניות, פרויקט אחר פרויקט</p>

        <div className="flex gap-2 mt-5">
          <button
            onClick={() => { setView("projects"); setActiveId(null); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors"
            style={{ background: view === "projects" ? INK : "white", color: view === "projects" ? PAPER : INK, border: `1px solid ${view === "projects" ? INK : "#DDD6C7"}` }}
          >
            <ListChecks size={15} /> פרויקטים
          </button>
          <button
            onClick={() => setView("shopping")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors"
            style={{ background: view === "shopping" ? INK : "white", color: view === "shopping" ? PAPER : INK, border: `1px solid ${view === "shopping" ? INK : "#DDD6C7"}` }}
          >
            <ShoppingCart size={15} /> קניות
          </button>
        </div>
      </header>

      <main className="px-5 pb-16 max-w-3xl mx-auto">
        {view === "shopping" ? (
          <ShoppingHub
            projects={projects}
            generalShopping={generalShopping}
            toggleItem={toggleItem}
            deleteItem={deleteItem}
            updateItemNote={updateItemNote}
            addGeneralItem={addGeneralItem}
            toggleGeneralItem={toggleGeneralItem}
            deleteGeneralItem={deleteGeneralItem}
            updateGeneralNote={updateGeneralNote}
            allStores={allStores}
          />
        ) : !activeProject ? (
          <ProjectsGrid
            projects={projects}
            onOpen={(id) => { setActiveId(id); setTab("tasks"); }}
            onDelete={deleteProject}
            showAddProject={showAddProject}
            setShowAddProject={setShowAddProject}
            newProjectName={newProjectName}
            setNewProjectName={setNewProjectName}
            addProject={addProject}
          />
        ) : (
          <ProjectView
            project={activeProject}
            tab={tab}
            setTab={setTab}
            onBack={() => setActiveId(null)}
            addTask={addTask}
            addShoppingItem={addShoppingItem}
            toggleItem={toggleItem}
            deleteItem={deleteItem}
            updateItemNote={updateItemNote}
            allStores={allStores}
          />
        )}
      </main>

      <div
        className="fixed bottom-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full transition-opacity"
        style={{ background: syncState === "error" ? "#A85C4A" : INK, color: PAPER, opacity: syncState === "idle" ? 0 : 0.85 }}
      >
        {syncState === "saving" ? "שומר…" : syncState === "error" ? "שגיאה בשמירה" : ""}
      </div>
    </div>
  );
}

function ProjectsGrid({
  projects, onOpen, onDelete, showAddProject, setShowAddProject,
  newProjectName, setNewProjectName, addProject,
}: {
  projects: Project[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  showAddProject: boolean;
  setShowAddProject: (v: boolean) => void;
  newProjectName: string;
  setNewProjectName: (v: string) => void;
  addProject: () => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-2">
        {projects.map((p) => {
          const accent = ACCENTS[p.accent % ACCENTS.length];
          const totalItems = p.tasks.length + p.shopping.length;
          const doneItems = p.tasks.filter((t) => t.done).length + p.shopping.filter((t) => t.done).length;
          const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;
          return (
            <div key={p.id} className="folder-card mt-3">
              <div className="folder-tab" style={{ background: accent.bg }} />
              <button
                onClick={() => onOpen(p.id)}
                className="w-full text-right rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                style={{ background: "white", border: `1px solid ${accent.tint}` }}
              >
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: accent.bg }}>
                  <span className="text-white font-bold display-font text-lg truncate">{p.name}</span>
                  <ChevronRight size={18} className="text-white/85 shrink-0" />
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center gap-4 text-sm mb-2" style={{ color: INK_SOFT }}>
                    <span className="flex items-center gap-1"><ListChecks size={14} /> {p.tasks.length}</span>
                    <span className="flex items-center gap-1"><ShoppingCart size={14} /> {p.shopping.length}</span>
                  </div>
                  <div className="h-1.5 rounded-full w-full" style={{ background: accent.tint }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: accent.bg }} />
                  </div>
                </div>
              </button>
              <button
                onClick={() => onDelete(p.id)}
                className="absolute top-2 left-2 p-1 rounded-full text-white/80 hover:text-white transition-colors"
                aria-label="מחיקת פרויקט"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}

        {showAddProject ? (
          <div className="mt-3 rounded-2xl border-2 border-dashed p-4 flex flex-col gap-3" style={{ borderColor: INK_SOFT }}>
            <input
              autoFocus
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addProject()}
              placeholder="שם הפרויקט, למשל: שיפוץ המרפסת"
              className="w-full bg-transparent outline-none text-sm placeholder:opacity-60"
              style={{ color: INK }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowAddProject(false); setNewProjectName(""); }} className="px-3 py-1.5 rounded-full text-sm" style={{ color: INK_SOFT }}>ביטול</button>
              <button onClick={addProject} className="px-3 py-1.5 rounded-full text-sm text-white font-medium" style={{ background: INK }}>יצירה</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddProject(true)}
            className="mt-3 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 py-8 hover:opacity-80 transition-opacity"
            style={{ borderColor: "#C9C2B2", color: INK_SOFT }}
          >
            <Plus size={18} /> <span className="text-sm font-medium">פרויקט חדש</span>
          </button>
        )}
      </div>

      {projects.length === 0 && !showAddProject && (
        <p className="text-sm mt-6 text-center" style={{ color: INK_SOFT }}>עדיין אין כאן פרויקטים. התחילו עם הראשון למעלה ↑</p>
      )}
    </div>
  );
}

function ProjectView({
  project, tab, setTab, onBack, addTask, addShoppingItem, toggleItem, deleteItem, updateItemNote, allStores,
}: {
  project: Project;
  tab: "tasks" | "shopping";
  setTab: (t: "tasks" | "shopping") => void;
  onBack: () => void;
  addTask: (projectId: string, text: string, dueDate: string, dependsOn: string[], notes: string) => void;
  addShoppingItem: (projectId: string, text: string, store: string, notes: string) => void;
  toggleItem: (projectId: string, listKey: "tasks" | "shopping", itemId: string) => void;
  deleteItem: (projectId: string, listKey: "tasks" | "shopping", itemId: string) => void;
  updateItemNote: (projectId: string, listKey: "tasks" | "shopping", itemId: string, note: string) => void;
  allStores: string[];
}) {
  const accent = ACCENTS[project.accent % ACCENTS.length];

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm mb-4 mt-1" style={{ color: INK_SOFT }}>
        <ChevronRight size={16} className="rotate-180" /> כל הפרויקטים
      </button>

      <h2 className="display-font text-2xl font-bold mb-4">{project.name}</h2>

      <div className="flex gap-2 mb-4">
        {(
          [
            { key: "tasks" as const, label: "משימות", icon: ListChecks },
            { key: "shopping" as const, label: "קניות", icon: ShoppingCart },
          ]
        ).map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-sm font-medium transition-colors"
              style={{ background: active ? accent.bg : accent.tint, color: active ? "white" : INK }}
            >
              <Icon size={15} /> {label}
              <span className="text-xs rounded-full px-1.5 ml-0.5" style={{ background: active ? "rgba(255,255,255,.25)" : "rgba(0,0,0,.08)" }}>
                {project[key].length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-b-2xl rounded-tl-2xl p-2" style={{ background: "white", border: `1px solid ${accent.tint}` }}>
        {tab === "tasks" ? (
          <TasksPanel project={project} accent={accent} addTask={addTask} toggleItem={toggleItem} deleteItem={deleteItem} updateItemNote={updateItemNote} />
        ) : (
          <ShoppingPanel project={project} accent={accent} addShoppingItem={addShoppingItem} toggleItem={toggleItem} deleteItem={deleteItem} updateItemNote={updateItemNote} allStores={allStores} />
        )}
      </div>
    </div>
  );
}

type Accent = { bg: string; tint: string };

/* ---------- shared note row ---------- */
function NoteLine({
  note, editing, onStartEdit, onChange, onSave, color,
}: {
  note: string;
  editing: boolean;
  onStartEdit: () => void;
  onChange: (v: string) => void;
  onSave: () => void;
  color: string;
}) {
  if (editing) {
    return (
      <div className="flex items-center gap-2 pr-9 mt-0.5">
        <Paperclip size={11} style={{ color: INK_SOFT }} className="shrink-0" />
        <input
          autoFocus
          value={note}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSave()}
          onBlur={onSave}
          placeholder="הערה או קישור למוצר…"
          className="flex-1 bg-transparent outline-none text-xs border-b"
          style={{ borderColor: "#DDD6C7", color: INK }}
        />
      </div>
    );
  }
  if (!note) return null;
  return (
    <button onClick={onStartEdit} className="flex items-center gap-1.5 pr-9 mt-0.5 text-xs text-right" style={{ color: INK_SOFT }}>
      {isUrl(note) ? <ExternalLink size={11} style={{ color }} className="shrink-0" /> : <Paperclip size={11} className="shrink-0" />}
      {isUrl(note) ? (
        <a href={note.trim()} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="underline truncate" style={{ color }}>
          {note}
        </a>
      ) : (
        <span className="truncate">{note}</span>
      )}
    </button>
  );
}

function NoteToggleButton({ hasNote, onClick, color }: { hasNote: boolean; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className={`note-btn p-1 shrink-0 ${hasNote ? "" : "inactive"}`}
      style={{ color: hasNote ? color : INK_SOFT }}
      aria-label="הערה"
    >
      <Paperclip size={14} />
    </button>
  );
}

function TasksPanel({
  project, accent, addTask, toggleItem, deleteItem, updateItemNote,
}: {
  project: Project;
  accent: Accent;
  addTask: (projectId: string, text: string, dueDate: string, dependsOn: string[], notes: string) => void;
  toggleItem: (projectId: string, listKey: "tasks" | "shopping", itemId: string) => void;
  deleteItem: (projectId: string, listKey: "tasks" | "shopping", itemId: string) => void;
  updateItemNote: (projectId: string, listKey: "tasks" | "shopping", itemId: string, note: string) => void;
}) {
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [deps, setDeps] = useState<string[]>([]);
  const [showDeps, setShowDeps] = useState(false);
  const [note, setNote] = useState("");
  const [showNoteField, setShowNoteField] = useState(false);
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");

  const tasks = project.tasks;
  const taskById = Object.fromEntries(tasks.map((t) => [t.id, t]));

  function isBlocked(task: Task) {
    return task.dependsOn.some((id) => taskById[id] && !taskById[id].done);
  }

  function submit() {
    const t = text.trim();
    if (!t) return;
    addTask(project.id, t, due, deps, note.trim());
    setText(""); setDue(""); setDeps([]); setShowDeps(false); setNote(""); setShowNoteField(false);
  }

  function onToggle(task: Task) {
    if (!task.done && isBlocked(task)) {
      const names = task.dependsOn.filter((id) => taskById[id] && !taskById[id].done).map((id) => taskById[id].text);
      setBlockedMsg(`קודם צריך: ${names.join(", ")}`);
      setTimeout(() => setBlockedMsg(null), 2800);
      return;
    }
    toggleItem(project.id, "tasks", task.id);
  }

  function startEdit(t: Task) {
    setEditingNoteId(t.id);
    setDraftNote(t.notes || "");
  }
  function saveNote(taskId: string) {
    updateItemNote(project.id, "tasks", taskId, draftNote.trim());
    setEditingNoteId(null);
  }

  const today = todayStr();

  return (
    <div>
      {tasks.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: INK_SOFT }}>אין עדיין משימות. מה צריך לעשות?</p>
      ) : (
        <ul className="flex flex-col">
          {tasks.map((t) => {
            const blocked = !t.done && isBlocked(t);
            const overdue = !!t.dueDate && t.dueDate < today && !t.done;
            const dueTodayFlag = t.dueDate === today && !t.done;
            const editing = editingNoteId === t.id;
            return (
              <li key={t.id} className="item-row flex flex-col gap-1 px-2 py-2.5 rounded-xl">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onToggle(t)}
                    className="checkbox-circle"
                    style={{ borderColor: t.done ? accent.bg : "#C9C2B2", background: t.done ? accent.bg : "transparent" }}
                    aria-label="סימון כבוצע"
                  >
                    {t.done ? <Check size={13} color="white" strokeWidth={3} /> : blocked ? <Lock size={11} color="#B0A990" /> : null}
                  </button>
                  <span className="flex-1 text-sm" style={{ textDecoration: t.done ? "line-through" : "none", color: t.done ? INK_SOFT : INK }}>
                    {t.text}
                  </span>
                  {t.dueDate && (
                    <span
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        background: overdue ? "#F4E8E4" : dueTodayFlag ? accent.tint : "#F0EEE7",
                        color: overdue ? "#A85C4A" : dueTodayFlag ? accent.bg : INK_SOFT,
                      }}
                    >
                      <Calendar size={11} /> {formatDate(t.dueDate)}
                    </span>
                  )}
                  <NoteToggleButton hasNote={!!t.notes} onClick={() => startEdit(t)} color={accent.bg} />
                  <button onClick={() => deleteItem(project.id, "tasks", t.id)} className="del-btn p-1" style={{ color: INK_SOFT }} aria-label="מחיקה">
                    <X size={15} />
                  </button>
                </div>
                {t.dependsOn.length > 0 && (
                  <div className="flex items-center gap-1 pr-9 text-xs" style={{ color: INK_SOFT }}>
                    <Link2 size={11} />
                    תלוי ב: {t.dependsOn.map((id) => taskById[id]?.text).filter(Boolean).join(", ")}
                  </div>
                )}
                <NoteLine
                  note={editing ? draftNote : t.notes}
                  editing={editing}
                  onStartEdit={() => startEdit(t)}
                  onChange={setDraftNote}
                  onSave={() => saveNote(t.id)}
                  color={accent.bg}
                />
              </li>
            );
          })}
        </ul>
      )}

      {blockedMsg && (
        <div className="mx-2 mb-2 text-xs px-3 py-2 rounded-lg" style={{ background: "#F4E8E4", color: "#A85C4A" }}>
          {blockedMsg}
        </div>
      )}

      <div className="px-2 py-2 mt-1 border-t" style={{ borderColor: accent.tint }}>
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !showDeps && submit()}
            placeholder="הוספת משימה חדשה…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-50 min-w-0"
          />
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="text-xs bg-transparent outline-none shrink-0"
            style={{ color: INK_SOFT, width: "108px" }}
          />
          <button onClick={submit} className="p-1.5 rounded-full text-white shrink-0" style={{ background: accent.bg }} aria-label="הוספה">
            <Plus size={15} />
          </button>
        </div>

        <div className="flex items-center gap-3 mt-2">
          {tasks.length > 0 && (
            <button onClick={() => setShowDeps((s) => !s)} className="flex items-center gap-1 text-xs" style={{ color: INK_SOFT }}>
              <ChevronDown size={12} className={showDeps ? "rotate-180" : ""} style={{ transition: "transform .15s" }} />
              תלות במשימות {deps.length > 0 ? `(${deps.length})` : ""}
            </button>
          )}
          <button onClick={() => setShowNoteField((s) => !s)} className="flex items-center gap-1 text-xs" style={{ color: INK_SOFT }}>
            <Paperclip size={12} /> הערה / קישור {note ? "•" : ""}
          </button>
        </div>

        {showDeps && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tasks.map((t) => {
              const selected = deps.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => setDeps((d) => (selected ? d.filter((x) => x !== t.id) : [...d, t.id]))}
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: selected ? accent.bg : accent.tint, color: selected ? "white" : INK }}
                >
                  {t.text}
                </button>
              );
            })}
          </div>
        )}

        {showNoteField && (
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="הערה או קישור (אופציונלי)…"
            className="w-full bg-transparent outline-none text-xs mt-2 border-b py-1"
            style={{ borderColor: "#DDD6C7", color: INK }}
          />
        )}
      </div>
    </div>
  );
}

function ShoppingPanel({
  project, accent, addShoppingItem, toggleItem, deleteItem, updateItemNote, allStores,
}: {
  project: Project;
  accent: Accent;
  addShoppingItem: (projectId: string, text: string, store: string, notes: string) => void;
  toggleItem: (projectId: string, listKey: "tasks" | "shopping", itemId: string) => void;
  deleteItem: (projectId: string, listKey: "tasks" | "shopping", itemId: string) => void;
  updateItemNote: (projectId: string, listKey: "tasks" | "shopping", itemId: string, note: string) => void;
  allStores: string[];
}) {
  const [text, setText] = useState("");
  const [store, setStore] = useState("");
  const [note, setNote] = useState("");
  const [showNoteField, setShowNoteField] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const items = project.shopping;

  function submit() {
    const t = text.trim();
    if (!t) return;
    addShoppingItem(project.id, t, store.trim(), note.trim());
    setText(""); setStore(""); setNote(""); setShowNoteField(false);
  }

  function startEdit(it: ShoppingItem) {
    setEditingNoteId(it.id);
    setDraftNote(it.notes || "");
  }
  function saveNote(itemId: string) {
    updateItemNote(project.id, "shopping", itemId, draftNote.trim());
    setEditingNoteId(null);
  }

  return (
    <div>
      {items.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: INK_SOFT }}>אין עדיין פריטי קנייה.</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((it) => {
            const editing = editingNoteId === it.id;
            return (
              <li key={it.id} className="item-row flex flex-col gap-1 px-2 py-2.5 rounded-xl">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleItem(project.id, "shopping", it.id)}
                    className="checkbox-circle"
                    style={{ borderColor: it.done ? accent.bg : "#C9C2B2", background: it.done ? accent.bg : "transparent" }}
                    aria-label="סימון כבוצע"
                  >
                    {it.done && <Check size={13} color="white" strokeWidth={3} />}
                  </button>
                  <span className="flex-1 text-sm" style={{ textDecoration: it.done ? "line-through" : "none", color: it.done ? INK_SOFT : INK }}>
                    {it.text}
                  </span>
                  {it.store && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: accent.tint, color: accent.bg }}>
                      <Store size={11} /> {it.store}
                    </span>
                  )}
                  <NoteToggleButton hasNote={!!it.notes} onClick={() => startEdit(it)} color={accent.bg} />
                  <button onClick={() => deleteItem(project.id, "shopping", it.id)} className="del-btn p-1" style={{ color: INK_SOFT }} aria-label="מחיקה">
                    <X size={15} />
                  </button>
                </div>
                <NoteLine
                  note={editing ? draftNote : it.notes}
                  editing={editing}
                  onStartEdit={() => startEdit(it)}
                  onChange={setDraftNote}
                  onSave={() => saveNote(it.id)}
                  color={accent.bg}
                />
              </li>
            );
          })}
        </ul>
      )}

      <div className="px-2 py-2 mt-1 border-t" style={{ borderColor: accent.tint }}>
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="הוספת פריט לרשימת קניות…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-50 min-w-0"
          />
          <input
            value={store}
            onChange={(e) => setStore(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="חנות"
            list="stores-list"
            className="text-xs bg-transparent outline-none shrink-0"
            style={{ color: INK_SOFT, width: "84px" }}
          />
          <datalist id="stores-list">
            {allStores.map((s) => <option key={s} value={s} />)}
          </datalist>
          <button onClick={submit} className="p-1.5 rounded-full text-white shrink-0" style={{ background: accent.bg }} aria-label="הוספה">
            <Plus size={15} />
          </button>
        </div>
        <button onClick={() => setShowNoteField((s) => !s)} className="flex items-center gap-1 text-xs mt-2" style={{ color: INK_SOFT }}>
          <Paperclip size={12} /> הערה / קישור למוצר {note ? "•" : ""}
        </button>
        {showNoteField && (
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="הערה או קישור (אופציונלי)…"
            className="w-full bg-transparent outline-none text-xs mt-2 border-b py-1"
            style={{ borderColor: "#DDD6C7", color: INK }}
          />
        )}
      </div>
    </div>
  );
}

type ShoppingHubItem = ShoppingItem & { projectId: string | null; projectName: string; accent: Accent };

function ShoppingHub({
  projects, generalShopping, toggleItem, deleteItem, updateItemNote,
  addGeneralItem, toggleGeneralItem, deleteGeneralItem, updateGeneralNote, allStores,
}: {
  projects: Project[];
  generalShopping: ShoppingItem[];
  toggleItem: (projectId: string, listKey: "tasks" | "shopping", itemId: string) => void;
  deleteItem: (projectId: string, listKey: "tasks" | "shopping", itemId: string) => void;
  updateItemNote: (projectId: string, listKey: "tasks" | "shopping", itemId: string, note: string) => void;
  addGeneralItem: (text: string, store: string, notes: string) => void;
  toggleGeneralItem: (itemId: string) => void;
  deleteGeneralItem: (itemId: string) => void;
  updateGeneralNote: (itemId: string, note: string) => void;
  allStores: string[];
}) {
  const [filter, setFilter] = useState("all");
  const [text, setText] = useState("");
  const [store, setStore] = useState("");
  const [note, setNote] = useState("");
  const [showNoteField, setShowNoteField] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");

  function submit() {
    const t = text.trim();
    if (!t) return;
    addGeneralItem(t, store.trim(), note.trim());
    setText(""); setStore(""); setNote(""); setShowNoteField(false);
  }

  const projectItems: ShoppingHubItem[] = projects.flatMap((p) =>
    p.shopping.map((it) => ({ ...it, projectId: p.id, projectName: p.name, accent: ACCENTS[p.accent % ACCENTS.length] }))
  );
  const generalItems: ShoppingHubItem[] = generalShopping.map((it) => ({ ...it, projectId: null, projectName: "כללי", accent: GENERAL_ACCENT }));
  const allItems = [...projectItems, ...generalItems];

  const stores = Array.from(new Set(allItems.map((it) => it.store || "ללא חנות"))).sort();
  const filtered = filter === "all" ? allItems : allItems.filter((it) => (it.store || "ללא חנות") === filter);

  const grouped: Record<string, ShoppingHubItem[]> = {};
  filtered.forEach((it) => {
    const key = it.store || "ללא חנות";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(it);
  });

  function handleToggle(it: ShoppingHubItem) {
    if (it.projectId) toggleItem(it.projectId, "shopping", it.id);
    else toggleGeneralItem(it.id);
  }
  function handleDelete(it: ShoppingHubItem) {
    if (it.projectId) deleteItem(it.projectId, "shopping", it.id);
    else deleteGeneralItem(it.id);
  }
  function startEdit(it: ShoppingHubItem) {
    setEditingNoteId(it.id);
    setDraftNote(it.notes || "");
  }
  function saveNote(it: ShoppingHubItem) {
    if (it.projectId) updateItemNote(it.projectId, "shopping", it.id, draftNote.trim());
    else updateGeneralNote(it.id, draftNote.trim());
    setEditingNoteId(null);
  }

  return (
    <div>
      <div className="rounded-2xl p-3 mb-5 mt-2" style={{ background: "white", border: `1px solid ${GENERAL_ACCENT.tint}` }}>
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="פריט כללי, לא קשור לפרויקט מסוים…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-50 min-w-0"
          />
          <input
            value={store}
            onChange={(e) => setStore(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="חנות"
            list="stores-list-hub"
            className="text-xs bg-transparent outline-none shrink-0"
            style={{ color: INK_SOFT, width: "84px" }}
          />
          <datalist id="stores-list-hub">
            {allStores.map((s) => <option key={s} value={s} />)}
          </datalist>
          <button onClick={submit} className="p-1.5 rounded-full text-white shrink-0" style={{ background: GENERAL_ACCENT.bg }} aria-label="הוספה">
            <Plus size={15} />
          </button>
        </div>
        <button onClick={() => setShowNoteField((s) => !s)} className="flex items-center gap-1 text-xs mt-2" style={{ color: INK_SOFT }}>
          <Paperclip size={12} /> הערה / קישור למוצר {note ? "•" : ""}
        </button>
        {showNoteField && (
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="הערה או קישור (אופציונלי)…"
            className="w-full bg-transparent outline-none text-xs mt-2 border-b py-1"
            style={{ borderColor: "#DDD6C7", color: INK }}
          />
        )}
      </div>

      {allItems.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: INK_SOFT }}>
          עדיין אין פריטי קניות. אפשר להוסיף פריט כללי, או לעבור ללשונית "קניות" בתוך פרויקט.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-5">
            <button
              onClick={() => setFilter("all")}
              className="text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ background: filter === "all" ? INK : "white", color: filter === "all" ? PAPER : INK, border: `1px solid ${filter === "all" ? INK : "#DDD6C7"}` }}
            >
              הכל ({allItems.length})
            </button>
            {stores.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className="text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1"
                style={{ background: filter === s ? INK : "white", color: filter === s ? PAPER : INK, border: `1px solid ${filter === s ? INK : "#DDD6C7"}` }}
              >
                <Store size={11} /> {s}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-5">
            {Object.entries(grouped).map(([storeName, items]) => (
              <div key={storeName} className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid #EEE9DD" }}>
                <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: INK }}>
                  <Store size={14} color={PAPER} />
                  <span className="text-sm font-bold" style={{ color: PAPER }}>{storeName}</span>
                  <span className="text-xs mr-auto" style={{ color: "#B9C0C6" }}>{items.length}</span>
                </div>
                <ul className="flex flex-col p-2">
                  {items.map((it) => {
                    const editing = editingNoteId === it.id;
                    return (
                      <li key={it.id} className="item-row flex flex-col gap-1 px-2 py-2.5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggle(it)}
                            className="checkbox-circle"
                            style={{ borderColor: it.done ? it.accent.bg : "#C9C2B2", background: it.done ? it.accent.bg : "transparent" }}
                            aria-label="סימון כבוצע"
                          >
                            {it.done && <Check size={13} color="white" strokeWidth={3} />}
                          </button>
                          <span className="flex-1 text-sm" style={{ textDecoration: it.done ? "line-through" : "none", color: it.done ? INK_SOFT : INK }}>
                            {it.text}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: it.accent.tint, color: it.accent.bg }}>
                            {it.projectName}
                          </span>
                          <NoteToggleButton hasNote={!!it.notes} onClick={() => startEdit(it)} color={it.accent.bg} />
                          <button onClick={() => handleDelete(it)} className="del-btn p-1" style={{ color: INK_SOFT }} aria-label="מחיקה">
                            <X size={15} />
                          </button>
                        </div>
                        <NoteLine
                          note={editing ? draftNote : it.notes}
                          editing={editing}
                          onStartEdit={() => startEdit(it)}
                          onChange={setDraftNote}
                          onSave={() => saveNote(it)}
                          color={it.accent.bg}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
