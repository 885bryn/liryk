# Fullscreen Lyrics Color Themes Design

## Summary

Add a lightweight theme picker to the desktop web app's fullscreen lyrics mode so the user can switch between five curated two-color presets. Each preset uses one background color and one text color, prioritizes strong contrast, and persists per device so the selected mood carries across fullscreen sessions.

## Goals

- Let users switch fullscreen lyrics mode away from the current black-background, white-text default.
- Keep the feature discoverable without adding heavy chrome to the lyric-first fullscreen layout.
- Limit choices to curated, readable two-color presets instead of arbitrary color input.
- Persist the selected preset locally and restore it on future visits.
- Reuse the same selected preset for embedded fullscreen lyrics inside the mobile shell.

## Non-Goals

- Changing the app-wide light/dark theme system.
- Introducing user-defined custom colors.
- Reworking fullscreen lyrics layout, timing, karaoke behavior, diagnostics, or scrolling behavior.
- Applying these presets to non-fullscreen lyrics surfaces in this phase.

## User Experience

### Entry Point

Add a small `Theme` button to fullscreen lyrics mode near the existing utility controls. The button should be visible in standalone fullscreen mode and absent only where existing fullscreen utility chrome is intentionally suppressed.

### Picker Interaction

Selecting the `Theme` button opens a compact palette list. The list presents five preset options, each with:

- a short mood-oriented name
- a small two-color preview swatch
- a clear selected state

When the user selects a preset:

- the fullscreen colors update immediately
- the picker closes
- the selection is saved to local storage

### Persistence

The most recently selected preset is restored whenever fullscreen lyrics mode opens again in the same browser on the same device. If no selection has been saved yet, the page loads with the default preset.

### Embedded Mode

When fullscreen lyrics is rendered in embedded mode inside the mobile shell, the same saved preset should be applied so the visual mood remains consistent across fullscreen entry points. The theme picker itself should follow the same chrome rules as the rest of fullscreen utility controls.

## Preset Strategy

Ship these five curated presets. Each preset must define exactly:

- one background color
- one primary text color

Secondary lyric states and overlays may derive from the same text color through opacity treatment, but no third base color should be introduced for the preset itself.

Preset list:

- `Midnight`: background `#000000`, text `#FFFFFF`
- `Paper Lantern`: background `#FFF4D6`, text `#2F2419`
- `Blue Hour`: background `#10243F`, text `#F3F7FF`
- `Forest Glow`: background `#132A1E`, text `#F4FFE7`
- `Rose Lounge`: background `#2E1622`, text `#FFE8F2`

These five presets were chosen to satisfy the feature goals and should all meet these constraints:

- visually distinct from one another
- high contrast for large lyric text and small overlay labels
- appropriate for extended reading on desktop screens
- compatible with the existing subdued overlay treatment for metadata, diagnostics, and utility controls

## Technical Design

### State Ownership

Keep fullscreen mood themes separate from the existing app-wide `light` and `dark` theme system. This feature is specific to fullscreen lyrics mode and should not expand the meaning of the global site theme store.

Add a small fullscreen theme helper that:

- defines the five preset records
- validates stored preset ids
- reads and writes the selected preset from local storage
- exposes a safe default when storage is missing or invalid

`src/web/fullscreen-lyrics-page.tsx` should own the selected preset state for rendering and interaction.

### Styling Model

Replace the current hard-coded fullscreen color classes and inline white-based color styles with preset-driven values. The preset should control:

- page background
- primary lyric text
- muted overlay text derived from the text color
- low-emphasis utility text derived from the text color

The fullscreen layout, spacing, transforms, and motion logic should remain unchanged.

For synced lyric rows that currently vary emphasis by alpha, blur, scale, and brightness, preserve the existing focus behavior while changing the base text color source from hard-coded white to the active preset text color.

### UI Boundaries

Keep the theme picker local to fullscreen lyrics mode. Do not route it through the existing shell theme toggle. The implementation should remain focused enough that removing or changing the picker later would not affect the rest of the app theme architecture.

## Error Handling

- If local storage contains an unknown preset id, ignore it and fall back to the default preset.
- If local storage is unavailable at runtime, fullscreen lyrics should still render with the default preset and remain usable.
- If the picker is open and a preset is chosen, selection should still apply even if persistence fails.

## Testing Strategy

Add focused coverage around fullscreen theme behavior without weakening the existing fullscreen regression suite.

Required tests:

- default preset renders when no saved selection exists
- picker toggle reveals exactly five preset options
- selecting a preset updates fullscreen theme output immediately
- selected preset is marked active in the picker
- selected preset persists across rerender or remount
- invalid stored preset values fall back to the default safely
- embedded fullscreen mode applies the saved preset consistently

Existing fullscreen tests should continue covering lyric-first layout invariants, live-lock behavior, diagnostics, and dev panel separation.

## Implementation Notes

- Favor a dedicated fullscreen theme storage key instead of overloading the existing global theme key.
- Follow the app's current small-store pattern used under `src/web/theme` where it is helpful, but do not couple fullscreen preset ids to `ThemeMode`.
- Keep the feature additive and localized: one small theme helper plus targeted changes in the fullscreen page and its test file should be enough unless implementation reveals a clearer existing abstraction.

## Open Decisions Resolved In This Spec

- Control style: use a small `Theme` button that opens a compact palette list.
- Number of presets: ship five.
- Persistence: save the selected preset per device in local storage.
- Scope: fullscreen lyrics only, including embedded fullscreen rendering.
