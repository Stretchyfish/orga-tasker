# orga-tasker

An exploratory project to try out Claude Code.

A task management application that enables tracking projects and tasks at as many levels as needed. Work can be organized by custom tags, visualized in multiple formats (Kanban, Roadmap, Calendar), and decomposed into nested hierarchies.

## Features

- **Kanban Board** - Organize tasks in columns with customizable swimlanes
- **Roadmap View** - Gantt-style timeline visualization with drag-and-drop date editing
- **Calendar View** - Monthly calendar showing task spans
- **Recursive Tickets** - Break down complex tasks into nested sub-boards
- **Tags & Swimlanes** - Group work by custom tags and create swimlanes dynamically
- **Browser History** - Navigate between ticket boards using browser navigation
- **Descriptions & Dates** - Add details and set dates for tracking

## Requirements

- **Rust** (1.70+) - [Install Rust](https://rustup.rs/)
- **Node.js** (18+) - [Install Node.js](https://nodejs.org/)

## Setup

### 1. Build the projects

**Backend:**
```bash
cd backend
cargo build
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Start the servers

Open two terminal windows/tabs:

**Terminal 1 - Backend (from project root):**
```bash
cd backend
cargo run
```
The backend will start on `http://localhost:3000`

**Terminal 2 - Frontend (from project root):**
```bash
cd frontend
npm run dev
```
The frontend will start on `http://localhost:5173`

### 3. Open in browser

Navigate to `http://localhost:5173` and start managing your tasks.

## Project Structure

```
orga-tasker/
├── backend/          # Rust backend (Axum + SQLite)
│   └── src/
├── frontend/         # React frontend (Vite)
│   └── src/
└── README.md
```

## Development Notes

- Hot reload is enabled on both frontend and backend
- The SQLite database (`data.db`) is created automatically in the backend directory
- Changes to React components reflect immediately in the browser
- Backend changes require restarting `cargo run`
