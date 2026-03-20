---
phase: 04
slug: cache-freshness-and-repeat-load-performance
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-20
---

# Phase 04 - Validation Strategy

> Per-phase validation contract for cache speed and freshness behavior.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | package.json |
| **Quick run command** | `npm test -- src/core/lyrics/cache-policy.test.ts src/infra/cache/file-lyrics-cache.test.ts src/app/lyrics-resolution-runtime.test.ts src/core/lyrics/lyrics-resolver.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- <targeted phase file list>`
- **After every wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | CACH-01, CACH-02 | unit | `npm test -- src/core/lyrics/cache-policy.test.ts` | MISSING -> Plan 01 creates it | ⬜ pending |
| 04-01-02 | 01 | 1 | CACH-01 | unit | `npm test -- src/infra/cache/file-lyrics-cache.test.ts` | MISSING -> Plan 01 creates it | ⬜ pending |
| 04-02-01 | 02 | 2 | CACH-01, CACH-02 | integration | `npm test -- src/core/lyrics/lyrics-resolver.test.ts src/app/lyrics-resolution-runtime.test.ts` | ✅ | ⬜ pending |
| 04-02-02 | 02 | 2 | CACH-02 | integration | `npm test -- src/app/lyrics-resolution-runtime.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

---

## Wave 0 Requirements

Existing test infrastructure is sufficient; Plan 01 creates the new phase-specific test files before depending tasks use them.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Repeat play visibly loads lyrics faster than a first uncached resolve | CACH-01 | Automated tests can prove cache-path branching, but perceived speed still benefits from human confirmation | Resolve one track, replay it, and confirm cached lyrics appear immediately without waiting for provider fetch |
| Stale cached lyrics update after background refresh without showing the wrong track | CACH-02 | Integration tests can prove guards, but final UX timing should be confirmed | Seed a stale entry, replay the same track, and confirm cached lyrics render first then refresh only if the same track remains active |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity preserved across both plans
- [x] Wave 0 not required beyond new test files created in Plan 01
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
