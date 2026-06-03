# CardSync AI — Frontend

TanStack Start + React UI — **client-only** build: contacts and queue live in **IndexedDB**, OCR runs in the **browser** (Tesseract.js). No backend API required for local dev.

See [docs/STRUCTURE.md](docs/STRUCTURE.md) for how `routes/`, `pages/`, `layouts/`, and `components/` are organized.

## Run locally

1. Start the **backend** API on port 5000 (see `../backend` or `../main` until backend is split).
2. In this folder:

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build & preview

```bash
npm run build
npm run serve:netlify
```

Open http://127.0.0.1:8888

## Deploy (Netlify)

Uses `netlify.toml` at this root. Set `VITE_API_URL` to your production API URL in Netlify environment variables.

## Environment

Copy `.env.example` to `.env.development` or `.env` and adjust `VITE_*` values as needed.
