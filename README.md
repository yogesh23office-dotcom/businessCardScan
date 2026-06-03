# CardSync AI — Frontend

TanStack Start + React UI extracted from the monorepo `main/` folder. Talks to the Python API via `VITE_API_URL` (dev proxy targets `http://127.0.0.1:5000` by default).

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
