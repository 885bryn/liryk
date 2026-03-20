## Automated Checks

Run these commands from the repo root:

```bash
npm test -- src/web/app-shell.test.tsx src/web/visual-system.test.tsx
npm run build
```

Expected results:
- Both test files pass with no failures.
- Production build completes successfully.

## Manual Viewport Checks

Use `npm run dev` and inspect both themes at these viewport sizes:
- `390x844` (mobile)
- `1280x800` (desktop)

Required observations:
- Mobile view remains stacked with the lyrics pane appearing before the connection pane.
- Desktop view applies the emphasized 40/60 split (`lyrics 3/5`, `connection 2/5`).
- Supporting and muted status text remains readable in both light and dark themes.

## Requirement Traceability

- `WEB-02`
  - Files: `src/web/app-shell.tsx`, `src/web/app-shell.test.tsx`, `src/web/visual-system.test.tsx`
  - Commands: `npm test -- src/web/app-shell.test.tsx src/web/visual-system.test.tsx`, `npm run build`
  - Evidence: responsive grid class markers, pane ordering, desktop split assertions.

- `THEM-03`
  - Files: `src/styles/globals.css`, `tailwind.config.ts`, `src/components/ui/card.tsx`, `src/web/visual-system.test.tsx`
  - Commands: `npm test -- src/web/visual-system.test.tsx`, `npm run build`
  - Evidence: token-driven card classes (`bg-card`, `text-card-foreground`, `ring-border/60`) and successful build.

- `UI-03`
  - Files: `src/web/app-shell.tsx`, `src/web/app-shell.test.tsx`, `src/components/ui/card.tsx`
  - Commands: `npm test -- src/web/app-shell.test.tsx src/web/visual-system.test.tsx`, `npm run build`
  - Evidence: heading hierarchy markers, stepped spacing rhythm, readable supporting text classes.
