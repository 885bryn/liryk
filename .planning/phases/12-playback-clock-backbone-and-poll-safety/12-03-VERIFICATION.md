# Phase 12-03 Verification: Stale Poll Race Safety (CLK-02)

## Objective

Verify overlapping playback poll completions cannot regress runtime playback state, and confirm only trusted newer snapshots are emitted and retained.

## Automated Checks

Run these commands from repository root:

```bash
npm run test -- src/app/playback-runtime.test.ts
npm run build
```

Expected pass signals:

- `src/app/playback-runtime.test.ts` reports all tests passing, including overlap and same-timestamp lower-progress guards.
- Build exits with code `0` and no TypeScript/Vite compilation errors.

## Manual Sanity

1. Start two `pollNow()` calls against deferred playback promises in a local debug harness.
2. Resolve the newer request first with higher `capturedAtMs` and observe one emitted snapshot.
3. Resolve the older request afterward with lower `capturedAtMs` and verify no additional emission occurs.
4. Repeat with equal `capturedAtMs` and lower `progressMs` on the later completion; verify latest snapshot does not regress.

## Requirement Traceability

| Requirement | Runtime Guard | Test Coverage | Verification Evidence |
| --- | --- | --- | --- |
| CLK-02 | `src/app/playback-runtime.ts` explicit stale-by-request and stale-by-freshness early returns before emit/update | `src/app/playback-runtime.test.ts` overlap deferred race tests and same-timestamp lower-progress regression test | `npm run test -- src/app/playback-runtime.test.ts` and `npm run build` |
