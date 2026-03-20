# Stack Research

**Domain:** Spotify live lyrics web app conversion (v1.1)
**Researched:** 2026-03-20
**Confidence:** HIGH

## Recommended Stack Additions

| Area | Recommendation | Why |
|------|----------------|-----|
| Web runtime | React + Vite web entry (reuse existing TS domain modules) | Fast migration path from existing UI logic |
| Theming | CSS variables + class-based dark mode | Clean token control and easy persistence |
| UI system | shadcn/ui + Tailwind | Matches user request and existing project direction |
| State persistence | localStorage for theme preference | Reliable, browser-native, low complexity |

## shadcn/ui Installation Timing

- Install shadcn/ui immediately after creating/confirming web scaffold and Tailwind base configuration.
- Do this before building milestone-specific UI layouts, so all components share tokenized theme primitives from the start.

## What Not To Add This Milestone

- New design systems in parallel with shadcn/ui.
- Extra framework migrations (for example switching to Next.js) during this milestone unless required by blockers.

---
*Stack research for milestone v1.1*
