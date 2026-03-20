# Feature Research

**Domain:** Web app UX for live Spotify lyrics
**Researched:** 2026-03-20
**Confidence:** MEDIUM-HIGH

## Table Stakes

| Feature | Complexity | Notes |
|---------|------------|-------|
| Browser-accessible app shell | MEDIUM | Replaces desktop-only launch path |
| Light/dark theme toggle | LOW | Must be visible and easy to use |
| Theme persistence across reloads | LOW | localStorage is sufficient |
| Responsive desktop/mobile layout | MEDIUM | Must support common breakpoints cleanly |
| Existing lyrics states in web UI | MEDIUM | Preserve loading/empty/not-found behavior |

## Differentiators

| Feature | Complexity | Notes |
|---------|------------|-------|
| Intentional aesthetic polish (typography, spacing, composition) | MEDIUM | User explicitly requested aesthetically pleasing output |
| Cohesive state styling across themes | MEDIUM | Avoid default scaffold look |

## Anti-Features

| Feature | Why Skip |
|---------|----------|
| Full redesign of playback/business logic | Not required for v1.1 web milestone |
| New provider integrations | Expands scope beyond requested migration |

---
*Feature research for milestone v1.1*
