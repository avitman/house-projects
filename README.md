# House Projects 🏠

A personal tracker for home projects — tasks (with due dates and dependencies) and shopping lists (per-project and general), in Hebrew/RTL. Data lives in a Google Sheet.

## How it works

- **Frontend** (`src/`) — a React + TypeScript SPA (Vite), styled with Tailwind CSS.
- **Backend** (`api/data.ts`) — a Vercel serverless function (Node.js) that reads/writes a Google Sheet through a Google Apps Script Web App bound to the sheet.

Google's Sheets API rejects write requests without an authenticated identity, regardless of the sheet's own sharing settings — a plain "anyone can view/edit" link isn't enough for the API itself. Rather than set up a Google Cloud service account, this app routes reads/writes through a small Apps Script deployed directly from the sheet, which runs with the sheet owner's permissions and exposes a public Web App URL.

## Google Sheet setup

1. Create a Google Sheet with three tabs, each with a header row exactly as below:

   **Projects**
   | id | name | accent | order |
   |----|------|--------|-------|

   **Tasks**
   | id | projectId | text | done | dueDate | dependsOn | notes | order |
   |----|-----------|------|------|---------|-----------|-------|-------|

   **Shopping**
   | id | projectId | text | done | store | notes | order |
   |----|-----------|------|------|-------|-------|-------|

   (`dependsOn` is a comma-separated list of task ids. `projectId` is blank for general/non-project shopping items.)

2. In the Sheet: **Extensions → Apps Script**. Delete the default boilerplate and paste in the contents of [`apps-script/Code.gs`](apps-script/Code.gs).
3. **Deploy → New deployment → Web app**. Set "Execute as" to **Me** and "Who has access" to **Anyone**. Deploy, and authorize it when prompted (it's your own script, acting on your own sheet).
4. Copy the resulting `.../exec` URL — that's your `SHEETS_WEBAPP_URL`.

Redeploying the script after edits requires **Deploy → Manage deployments → edit (pencil) → New version** — otherwise the live URL keeps running the old code.

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in `SHEETS_WEBAPP_URL` with the Apps Script Web App URL from step 4 above. Add the same variable in the Vercel project's Environment Variables settings for deploys.

## Local development

The frontend and API run together via the Vercel CLI (`vercel dev`), which serves the Vite app and runs `api/*.ts` as local serverless functions — same as production.

```bash
npm install
npm run dev:full   # runs `vercel dev`
```

Running `npm run dev` (plain Vite) only serves the frontend — `/api/data` calls will 404 unless you use `dev:full`.

## Deployment (Vercel)

1. Connect this repository to a Vercel project.
2. Vercel auto-detects the Vite frontend and the `api/` serverless functions — no extra config needed.
3. Set `SHEETS_WEBAPP_URL` in the Vercel project settings.

## Security note

The Apps Script Web App URL is the only thing gating write access to your data — anyone with that URL can read/write the sheet, similar to the sheet's own "anyone with the link" sharing. Fine for a personal tracker; don't reuse this pattern for anything sensitive.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, lucide-react
- **Backend:** Node.js, Vercel Serverless Functions
- **Data:** Google Sheets, via a bound Apps Script Web App (`apps-script/Code.gs`)
- **Hosting:** Vercel (frontend + API in one deployment)
