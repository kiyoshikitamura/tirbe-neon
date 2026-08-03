# Migration prep notes

## Current project
- Framework: Next.js 16 + TypeScript
- Package manager: npm
- Main app entry: src/app/page.tsx
- Build command: npm run build
- Dev command: npm run dev -- --hostname 127.0.0.1 --port 3000

## Verified status
- Build: successful
- Editor diagnostics: no errors reported

## Notes for VS Code/Codex migration
- The workspace already contains .env, .env.local, .env.development, and .env.production.
- A VS Code task file was added at .vscode/tasks.json for quick dev/build execution.
- The repo currently has local modifications in several UI and battle-related files.
