Security notes

1) Do not store provider API keys in client-side code or client environment files
- Place keys only on the server (API). Use server-side environment variables (e.g., `GOOGLE_API_KEY`) and never commit `.env` files.
- The client should call server endpoints (for example `POST /api/analyze`) which then call the AI provider using the server-side key.

2) Environment examples
- See `API/.env.example` and `Client/.env.example` for recommended env variables.

3) Sessions and auth
- Passwords are hashed using bcrypt on the server.
- Sessions are stored with an expiry (`expiresAt`). Tokens are returned on login/register.
- For production, consider switching to signed HTTP-only secure cookies or OAuth/JWT with proper rotation and revocation.

4) Server hardening
- The API includes Helmet for secure headers and express-rate-limit for basic rate limiting.
- CORS is restricted via `API_ALLOWED_ORIGIN` or `VITE_CLIENT_ORIGIN` environment variables.

5) Further recommendations
- Use HTTPS in production and terminate TLS at a trusted reverse proxy (NGINX, Cloud provider LB).
- Add input validation (e.g., express-validator/zod) to all endpoints.
- Add logging and monitoring (structured logs, error reporting).
- Add tests for auth flows and session expiry.

