# Frontend folder structure

TanStack Router uses **file-based routes** under `src/routes/`. Each route file should stay thin: metadata + which page component to render. Screen UI lives in `src/pages/`.

```
frontend/src/
├── routes/              # URL wiring only (createFileRoute)
│   ├── __root.tsx       # App shell, global head, 404/error
│   ├── index.tsx        # /
│   ├── scan.tsx
│   ├── review.tsx
│   ├── contacts.tsx
│   ├── queue.tsx
│   ├── settings.tsx
│   ├── status.tsx
│   └── analytics.tsx    # redirect → /queue
│
├── pages/               # Full-screen views (one file per route)
│   ├── ScanPage.tsx
│   ├── ReviewPage.tsx
│   ├── ContactsPage.tsx
│   ├── QueuePage.tsx
│   ├── SettingsPage.tsx
│   ├── StatusPage.tsx
│   ├── NotFoundPage.tsx
│   └── RouteErrorPage.tsx
│
├── layouts/             # Cross-route chrome (not URL routes)
│   ├── AppShell.tsx     # Sidebar + top bar + outlet
│   └── RootDocument.tsx # HTML document shell (SSR)
│
├── components/
│   ├── ui/              # shadcn primitives
│   ├── layout/          # AppSidebar, TopBar, PageShell, …
│   ├── common/          # Shared buttons, cards, modals
│   ├── form/            # Form building blocks
│   ├── camera/          # Scan capture
│   ├── review/          # Review flow widgets
│   └── …                # Feature-specific folders
│
├── hooks/               # React hooks
├── lib/                 # API clients, storage, scan pipeline
├── constants/           # Static config / field definitions
├── services/            # Thin service facades (e.g. OCR)
├── utils/               # Pure helpers
├── global.css           # Global tokens + base styles
├── router.tsx           # Router factory
├── start.ts             # TanStack Start middleware
└── server.ts            # Cloudflare / edge entry
```

## Conventions

| Layer | Responsibility |
|-------|----------------|
| `routes/*` | Path, `head()` SEO, `component: XPage` |
| `pages/*` | Page layout, data loading for that screen, composing components |
| `layouts/*` | Shared chrome used by many pages (via root route) |
| `components/*` | Reusable UI; no route-specific business rules |
| `lib/*` | Side effects, fetch, IndexedDB, env-backed config |

## Adding a new screen

1. Create `src/pages/MyPage.tsx` with `export function MyPage()`.
2. Add `src/routes/my-path.tsx` that imports `MyPage` and calls `createFileRoute("/my-path")({ … })`.
3. Register nav in `src/constants/sidebarItems.ts` if it should appear in the sidebar.

## Known follow-ups (optional)

| Item | Notes |
|------|--------|
| `ReviewPage` | Uses `PageContainer` + `AppLayout`; other pages use `PageShell` — unify when polishing UI |
| `routes/analytics.tsx` | Redirect only; sidebar still links `/analytics` → `/queue` |
| `routes/status.tsx` | Dev health check at `/status`; not in sidebar |
| `components/layout/Sidebar.tsx` | Removed (unused legacy; nav is `AppSidebar`) |
| `lib/` | Large shared folder; can split into `lib/api`, `lib/storage` later |
| `npm run lint` | No `eslint.config.js` in repo yet — add config or drop script |
| `../main/` | Original monorepo copy still exists; backend not split to `../backend` yet |
