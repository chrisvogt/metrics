# Local development — multi-app setup

Chronogrove runs three separate web surfaces. This document explains how to
run all of them locally at once and how to wire up local hostnames that mirror
production.

## Ports at a glance

| Surface | Script | URL |
|---------|--------|-----|
| Marketing site (`apps/www`) | `pnpm dev:www` | `http://localhost:5174` |
| Operator console (`apps/console`) | `pnpm dev:console` | `http://localhost:5173` |
| Cloud Functions (widget API) | Firebase emulator | `http://localhost:5001` |
| Firebase Auth emulator | — | `http://localhost:9099` |
| Firebase Firestore emulator | — | `http://localhost:8080` |
| Firebase Emulator UI | — | `http://localhost:4000` |

## Run everything at once

```bash
pnpm dev:full
```

This starts the Firebase emulators (auth, functions, firestore) plus both
frontend apps using `concurrently`. Labels are colour-coded in the terminal:
`cyan = emulators`, `green = console`, `yellow = www`.

For a clean rebuild before starting:

```bash
pnpm dev:full:fresh
```

## Individual app commands

```bash
pnpm dev:www       # marketing site only (Vite, port 5174)
pnpm dev:console   # operator console only (Next.js, port 5173)
```

---

## Optional: local hostnames (mirrors production domains)

If you want to develop against domain names that match production — useful when
testing CORS origins, cookie scoping (`Domain=.dev-chronogrove.com`), or the
cross-app navigation — add the following to `/etc/hosts` on your machine:

```
# Chronogrove local dev
127.0.0.1  dev-chronogrove.com
127.0.0.1  console.dev-chronogrove.com
127.0.0.1  api.dev-chronogrove.com
```

Then access each surface with the port in the URL:

| Production | Local equivalent |
|------------|-----------------|
| `chronogrove.com` | `http://dev-chronogrove.com:5174` |
| `console.chronogrove.com` | `http://console.dev-chronogrove.com:5173` |
| `api.chronogrove.com` | `http://api.dev-chronogrove.com:5001` |

> **Why keep the port?** The dev servers run on unprivileged ports (>1024) so
> no `sudo` is needed. The `/etc/hosts` alias just provides the hostname; the
> port still routes to the right process.

The Vite dev server for `apps/www` is configured with `host: true`, so it
binds to `0.0.0.0` and accepts requests on any hostname that resolves to
`127.0.0.1`. Next.js dev works the same way by default.

### Optional: port-free URLs with Caddy

If you'd rather drop the port numbers entirely, install
[Caddy](https://caddyserver.com/) and create a `Caddyfile` in the repo root
(gitignored):

```
dev-chronogrove.com {
  reverse_proxy localhost:5174
}

console.dev-chronogrove.com {
  reverse_proxy localhost:5173
}

api.dev-chronogrove.com {
  reverse_proxy localhost:5001
}
```

Run `caddy run` alongside `pnpm dev:full`. Caddy issues a local TLS cert
automatically (you'll trust its root CA once with `caddy trust`). This is
entirely optional — it's purely a developer convenience, not required for any
feature work.

---

## Firebase Auth authorized domains

Firebase blocks auth flows (sign-in redirects, popups, session cookies) from
any origin not on its allowlist. When using local hostnames you must add them
once in the Firebase Console:

1. Open [Firebase Console](https://console.firebase.google.com/) → your project
2. Go to **Authentication → Settings → Authorized domains**
3. Click **Add domain** and add each local hostname:
   - `console.dev-chronogrove.com`
   - `dev-chronogrove.com`

This is a one-time step per Firebase project. The emulator bypasses this check
for `localhost`, but custom `/etc/hosts` aliases are treated as real origins by
the Auth SDK and must be explicitly allowed.

---

## Environment variables for local dev

When running against emulators, the console expects a Functions origin that
points at the local emulator rather than production. This is already handled by
the `next.config.ts` rewrite rule (`/api → localhost:5001`) in development.

If you add new `NEXT_PUBLIC_*` variables that differ between local and
production, set them in `apps/console/.env.local` (gitignored). The
`apphosting.yaml` holds the production values.
