# Stanforte Edge Portal — Desktop App

Native desktop wrapper (Tauri 2) for the Stanforte Edge staff portal.

The React frontend lives in this workspace (`apps/desktop/`), including the
Tauri bridge (`src/lib/tauri-bridge.ts`) that powers native features:

- system tray icon + badge count
- native notifications
- global shortcut (Cmd/Ctrl+Shift+P)
- deep links (`stanforte://`)
- self-update via the updater plugin

Run from the repo root:

```bash
# Desktop dev (starts Vite on http://localhost:5174 + native window)
pnpm run dev:desktop

# Build desktop installers
pnpm run tauri:build
```

> The browser (web) version is the separate `apps/web` workspace and does not
> include any Tauri code.