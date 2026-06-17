# Android WebView Shell Design

## Goal

Deliver an Android app version of Liryk that preserves the existing lyric-syncing product behavior while changing as little as possible. The Android app should be sideloadable, focus only on Spotify authentication plus live synced lyrics, and fit cleanly on a phone screen.

## Scope

This design covers:

- packaging the existing Vite/React app in an Android shell
- reducing the app surface to a single main mobile screen
- preserving Spotify authentication, now-playing state, lyric resolution, and live lyric sync
- adapting the current UI so it works well on a phone without redesigning the product
- adding Android-specific callback handling needed for Spotify auth to return into the app

This design does not cover:

- Play Store publishing
- a native Android rewrite
- new product features beyond the current core lyrics flow
- desktop-specific or developer-only panels and routes
- broader visual redesign unrelated to phone fit

## Desired Behavior

1. The app installs on Android through manual sideloading.
2. When opened, the app shows a single main screen optimized for phone dimensions.
3. If the user is not authenticated with Spotify, the app clearly offers the connect flow.
4. After Spotify authentication completes, the app returns into Liryk and resumes on the same main screen.
5. When Spotify playback is active, the app shows current track context and live synced lyrics.
6. If no track is playing, lyrics are replaced with the existing waiting state.
7. If lyrics are missing or low-confidence, the existing user-facing states remain visible.

## Recommended Approach

Use a thin Android shell around the existing web app, with Capacitor as the default packaging layer.

Why this is the recommended path:

- it reuses the current React app, lyric logic, and Spotify session/runtime flow
- it minimizes the chance of behavior drift in the lyric syncing experience
- it is the fastest route to a sideloadable Android app
- it limits native Android work to shell packaging and auth callback plumbing

Alternative approaches were considered:

- a mobile web or PWA deployment would be even simpler but would not meet the goal of a true installable Android app
- a native Android app would offer deeper platform integration but would require a slower reimplementation and create more opportunities for accidental behavior changes

## Architecture

The current web application remains the product source of truth. The Android project hosts the built web assets inside a WebView-based shell and adds only the native integration needed to launch, resume, and return from Spotify authentication.

The architecture is split into two layers:

- **Web app layer:** existing React UI, lyric resolver/runtime logic, Spotify auth/session logic, and state management
- **Android shell layer:** app packaging, WebView hosting, deep-link or app-link callback entry, and any minimal bridge needed to hand auth results back into the web app

The Android shell should not contain lyric-specific business logic. Lyric synchronization, now-playing state interpretation, and user-facing content decisions stay inside the existing TypeScript application so the same behavior remains testable in the current codebase.

## Single-Screen Mobile Experience

The Android app opens directly to one main screen. This screen replaces the current split desktop-style layout and absorbs the fullscreen lyrics experience into the default view.

The mobile layout should be vertically stacked:

1. compact top bar with the app name and only essential controls
2. Spotify connection state and connect or reconnect action when needed
3. current track title and artist
4. primary lyrics viewport taking the majority of the screen height

The separate fullscreen lyrics route should be removed from the Android-focused flow. The main screen is the fullscreen experience.

Elements that are not part of the core product should be removed from scope for this app, including developer-facing panels and any extra diagnostic surfaces. The remaining UI should keep the same voice and states as the current app, but collapse into a phone-appropriate vertical structure.

## Data Flow

1. The Android shell launches the bundled web app.
2. The web app restores prior auth state if a valid session is available.
3. If no valid session exists, the single screen shows the Spotify connect state.
4. The user starts Spotify authentication.
5. Spotify auth completes in the browser flow and returns through the Android callback path into the app shell.
6. The web auth runtime completes session bootstrap and exposes the active session to playback and lyric features.
7. The existing playback runtime resolves now-playing state.
8. The existing lyric resolver fetches and selects lyrics for the active track.
9. The single mobile lyrics screen renders live synced, waiting, not-found, or low-confidence states based on current app state.

## Authentication And Android Callback Handling

The main Android-specific risk is Spotify authentication returning correctly into a wrapped app. The design should therefore preserve the existing auth runtime shape as much as possible and only adapt the callback boundary.

Preferred design:

- keep the existing Spotify auth/session bootstrap logic in the web app
- add a dedicated Android callback entry point that routes the auth result back into the web layer
- let the web auth runtime complete token parsing, session storage, and connected-state transitions

This keeps the shell thin and avoids maintaining two independent auth systems. If Android-specific constraints require a small bridge, that bridge should only transport callback data and lifecycle events, not duplicate auth business rules.

## Error Handling

The app should preserve simple, user-facing states and avoid introducing Android-only UI branches unless necessary.

Required failure behavior:

- if auth fails or callback configuration is wrong, show a reconnectable error state on the main screen
- if Spotify is connected but nothing is playing, show the existing waiting state
- if lyrics are not found, keep the not-found state
- if lyrics are low-confidence, keep the visible low-confidence indicator
- if the app relaunches after a valid prior session, restore into a usable connected state when possible

Any Android-specific auth failures should be handled in the shell or callback wiring first, rather than by changing lyric-sync behavior inside the app.

## Testing And Verification

Verification should focus on preserving product behavior while validating the new shell boundary.

Web-app verification:

- existing build passes
- single-screen mobile layout renders correctly at common phone widths
- current song metadata and lyrics states still render correctly
- waiting, not-found, and low-confidence states remain intact

Android-shell verification:

- Android build installs through sideloading
- app launches into the single main screen
- Spotify auth can leave the app and return correctly through the callback path
- successful auth results in a connected session inside the app
- app relaunch preserves a usable session when prior auth data is still valid

The highest-risk area is auth return into the shell, so smoke testing there matters more than broad native feature testing.

## Risks And Mitigations

- **Wrapped auth flow is brittle on Android**
  - Keep the auth logic in the existing web layer and limit native responsibilities to callback transport and app resume behavior.

- **Desktop-first layout assumptions leak into the phone experience**
  - Replace the split-pane layout with a single stacked mobile screen and explicitly remove the separate fullscreen route from the primary flow.

- **Scope grows into a redesign**
  - Use the current product behavior and states as the baseline. Only make UI changes required to fit and function on a phone.

- **Platform-specific fixes start altering lyric behavior**
  - Keep lyric resolution, sync logic, and user-facing lyric-state decisions inside the existing TypeScript app.

## Success Criteria

- Liryk can be manually installed on an Android phone as an app.
- The app exposes only the core flow: connect Spotify, detect playback, and show live synced lyrics.
- The UI fits naturally on a phone screen without needing a separate fullscreen page.
- Core lyric-sync behavior matches the current web app rather than a rewritten variant.
- Android-specific work stays limited to packaging and auth callback handling.
