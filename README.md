# DocEditor — Collaborative Document Editor

A lightweight collaborative document editor inspired by Google Docs, built with Next.js, TipTap, and SQLite.

## Features

- **Document Creation & Editing** — Create, rename, and edit documents with rich-text formatting (bold, italic, underline, headings, bullet/ordered lists).
- **Auto-Save** — Changes are automatically saved 1 second after you stop typing.
- **File Upload** — Upload `.txt` or `.md` files to instantly create new editable documents.
- **Sharing** — Document owners can share documents with other users. Shared documents appear in a dedicated "Shared with Me" section.
- **Persistence** — All data is stored in a local SQLite database (`data.db`) and survives refreshes.
- **Mocked Auth** — Three seeded users (Alice, Bob, Charlie) with an instant user-switcher in the header to demonstrate sharing mechanics.

## Supported File Types

Only `.txt` and `.md` files are supported for upload. This is clearly indicated in the file picker.

## Tech Stack

| Layer      | Technology                                |
| ---------- | ----------------------------------------- |
| Framework  | Next.js 16 (App Router)                   |
| Frontend   | React 19, Vanilla CSS                     |
| Editor     | TipTap (headless rich-text editor)        |
| Database   | SQLite via better-sqlite3                 |
| Icons      | Lucide React                              |
| Testing    | Vitest                                    |

## Setup & Run

### Prerequisites
- Node.js ≥ 18

### Install
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### Run Tests
```bash
npm test
```

## Architecture Notes

### What I Prioritized

1. **Working end-to-end flow over feature depth** — The app covers document CRUD, rich-text editing, file upload, sharing, and persistence. Each feature is thin but functional.

2. **Editor usability** — TipTap provides a professional editing experience out of the box. The toolbar is intuitive with clear iconography and active-state feedback.

3. **Simple but correct sharing model** — Rather than building a full RBAC system, I implemented a straightforward owner + shared-with model. Only document owners can share, and shared users get full edit access. This keeps the code simple while demonstrating the core sharing mechanic.

4. **Auto-save over manual save** — A debounced auto-save (1s after last keystroke) is a better UX than a save button, matching user expectations from Google Docs.

5. **Mocked auth for demo velocity** — A user-switcher dropdown lets reviewers instantly test multi-user scenarios without dealing with login flows. This is the highest-leverage choice for demonstrating sharing behavior in a reviewable prototype.

6. **Premium visual design** — Dark mode with glassmorphism, smooth micro-animations, Inter font, and a cohesive color system. The UI feels polished and modern.

### What I Would Add Next

- Real authentication (NextAuth.js or Clerk)
- WebSocket-based real-time collaboration
- Document deletion and archival
- Permission levels (view-only vs. edit)
- Markdown rendering for uploaded `.md` files
- Search and filtering on the dashboard
- Export to PDF/DOCX
