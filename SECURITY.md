# Security policy

## Reporting a vulnerability

If you've found a security issue in Daja — API key leak, arbitrary code execution path, data exfiltration risk, PII exposure — please **do not** open a public GitHub issue.

Instead:
1. Email `ayaangazali.work@gmail.com` with subject `[Daja security] <short description>`
2. Include: affected version, reproduction steps, impact assessment, and (if applicable) a proposed fix
3. Expect an acknowledgement within 72 hours

We'll coordinate a fix + disclosure timeline. Credit is given in release notes at the reporter's preference.

## Scope

In scope:
- Renderer → main process boundary (IPC surface)
- API key storage (`keyVault.ts` + OS keychain integration)
- External network calls (Yahoo Finance, LLM providers) — request/response handling, auth headers, error leakage
- File-system operations (PDF tools, settings export)
- Electron window + preload configuration

Out of scope:
- Missing features or UX bugs (use normal issue tracker)
- Vulnerabilities in upstream libraries not reproducible in Daja's use of them
- Social engineering of end users

## Design posture

Daja is a local-first app. Key security properties:

| Property | How enforced |
|---|---|
| Renderer isolation | `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` |
| External network access | Renderer CSP `connect-src 'self'` — all external calls route through main |
| Secret storage | Electron `safeStorage` (OS keychain); key never leaves disk as plaintext |
| IPC input validation | Zod schemas on every handler |
| Path traversal (PDF) | Input paths validated + rejected if non-PDF; output paths normalized |
| SQL injection | `better-sqlite3` parameterized queries only (no string concat) |
| Scheme validation | `shell.openExternal` + `setWindowOpenHandler` allowlist http/https/mailto |
| No telemetry | Daja makes zero telemetry/analytics calls — local-only app |

## Known limitations

- **Linux keychain**: if neither `libsecret` nor `gnome-keyring` is installed, key encryption falls back with a user-visible error. Keys cannot be stored until that's resolved.
- **Apple notarization**: macOS builds are currently unsigned — users must right-click → Open on first launch (Gatekeeper warning). Distribution via signed/notarized builds tracked in roadmap.
- **Auto-update**: not yet configured. Users download builds manually from GitHub Releases.

## Supported versions

Only the latest `main` build receives security fixes. No LTS branch.
