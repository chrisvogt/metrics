# Agent Skills

Firebase agent skills for AI-assisted development (Cursor, etc.). These skills provide Firebase-specific knowledge, instructions, and workflows.

## Install

```bash
pnpm dlx skills add firebase/agent-skills
```

Then select the skills you need from the interactive prompt. This project uses: **firebase-basics**, **firebase-auth-basics**, **firebase-firestore-standard**, **firebase-local-env-setup**, and **firebase-ai-logic**.

**Hosting vs App Hosting:** The operator console is deployed with **Firebase App Hosting** (Next.js SSR under `apps/console/`), not classic **Firebase Hosting** (static CDN). Use **firebase-app-hosting-basics** when working on `apphosting.yaml`, App Hosting deploys, or the App Hosting emulator. **firebase-hosting-basics** covers classic Hosting only (SPAs, static sites).

## Upgrade

To update all installed skills to their latest versions:

```bash
pnpm dlx skills update --all
```
