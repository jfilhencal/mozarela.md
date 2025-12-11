# Mozarela.md — Deployment Notes

This project contains an API (Node/Express) and a Client (Vite/React). The repository includes Dockerfiles and a docker-compose for simple deployments.

Quick local deployment (Docker):

1. Build and start both services:

```powershell
cd <repo-root>
docker-compose up --build
```

2. The client will be available at http://localhost:8080 and the API at http://localhost:3001.

Environment notes:
- API:
  - `PORT` (default: 3001)
  - `DATABASE_FILE` (path to sqlite DB file)
  - `API_ALLOWED_ORIGIN` (set to the client origin in production)
  - `GOOGLE_API_KEY` (server-side only — required for AI proxy `/api/analyze`)
  - `COOKIE_SECURE` (set to `true` when serving over HTTPS)
  - `COOKIE_SAMESITE` (defaults to `lax`)
  - `SESSION_TTL_MS` (session TTL in ms)

- Client:
  - `VITE_API_BASE` (set to the API URL during build or at runtime)

Security & production checklist:
- Set `COOKIE_SECURE=true` when serving over TLS.
- Do NOT place provider API keys in the client — use the server-side proxy.
- Use a secret manager for `GOOGLE_API_KEY` in production and do not commit it to the repo.
- Consider running the API behind a reverse proxy (nginx) and enable `TRUST_PROXY` if needed.

If you want, I can add a small GitHub Actions workflow to build and push images to a registry, or add k8s manifests.
