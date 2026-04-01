# Licensing

## Chronogrove (this repository)

Chronogrove is licensed under the **GNU Affero General Public License v3.0 or later** (AGPL-3.0). The full text is in [`LICENSE`](../LICENSE) at the repository root.

**Change (March 2026):** the project was previously distributed under the [MIT License](https://opensource.org/license/mit). The switch to AGPL applies to this codebase going forward; consult the Git history and tags for earlier MIT-licensed revisions if you rely on that grant.

## AGPL in brief (not legal advice)

AGPL-3.0 is a strong copyleft license. Among other obligations, if you **run a modified version** of this program as a **network service** so that users interact with it over a network, you must generally offer those users **corresponding source** for the modified program. Read the full license and obtain professional advice for your deployment model.

## Third-party open-source dependencies (production)

Compatibility question: *can this project be AGPL-3.0 while depending on npm packages under other licenses?*

In practice, **yes** for the vast majority of permissive and common weak-copyleft libraries: AGPL governs **your** code when you convey or run the combined work; dependencies keep their own licenses, and you must comply with **each** dependency’s notice and redistribution terms (MIT/BSD notice, Apache-2.0 NOTICE file, LGPL requirements for LGPL components, etc.).

A **`pnpm licenses list --prod`** scan (March 2026) of this workspace showed **no packages that are GPL- or AGPL-only** in a way that would typically block releasing this application under AGPL. Most production transitive dependencies are **Apache-2.0**, **MIT**, **BSD-2-Clause / BSD-3-Clause**, **ISC**, **0BSD**, or **BlueOak-1.0.0**.

**Noteworthy components to review yourself:**

| Package / line | License (as reported) | Note |
|----------------|----------------------|------|
| `@img/sharp-libvips-*` (via **`sharp`**) | LGPL-3.0-or-later | Weak copyleft library. Ensure you meet LGPL obligations for this component in your distribution (documentation, relinking/replacement rules as applicable to how you ship native code). |
| **`node-forge`** | `(BSD-3-Clause OR GPL-2.0)` | Dual-licensed; npm ecosystem usage is typically under the BSD-3-Clause terms. |

Versions and licenses **change when dependencies update**. After upgrades, re-run:

```bash
pnpm licenses list --prod
```

This document is an **orientation summary**, not a substitute for legal review.

## APIs and hosted services

Integrations (Firebase, Discogs, Steam, Instagram, etc.) are subject to **those providers’** terms of use and policies, independent of open-source license compatibility among libraries in `node_modules`.
