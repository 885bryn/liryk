# Android Sideloading

This repo is set up for a thin Capacitor-based Android shell around the existing web app. The goal is local sideloading and device testing, not Play Store release automation.

## Prerequisites

- Node.js and npm
- Android Studio with an SDK installed
- A USB-debuggable Android device or an emulator
- A Spotify app configuration that allows the Android callback URI

## One-time setup

1. Install JavaScript dependencies:

   ```bash
   rtk npm install
   ```

2. If the native Android project has not been generated on your machine yet, create it once:

   ```bash
   rtk npm run android:add
   ```

## Sync web assets into the Android shell

Whenever the web app changes, rebuild and copy the latest `dist/` output into the Android project:

```bash
rtk npm run android:sync
```

Open the Android project in Android Studio when you want to inspect native files, run on a device, or build an APK:

```bash
rtk npm run android:open
```

## Build and install a debug APK

1. Connect a phone with USB debugging enabled, or start an emulator.
2. Run the sync step first so Android Studio gets the current web bundle.
3. In Android Studio, choose the `app` configuration and run the debug build on your target device.

If you prefer Capacitor's CLI flow for a connected device, you can also use:

```bash
rtk npm run android:run
```

## Spotify redirect configuration

Use `app.liryk://callback` as the Android redirect URI for the sideloaded app. The Android manifest is wired to accept that custom scheme and host combination.

For browser-based development, keep the existing web callback path aligned with `/callback` so local web auth and Android auth continue to share the same callback handling logic.

## Notes

- The checked-in Android files in this task are scaffold-level entry points. Running `android:add` on a clean machine fills in the rest of the native project files that Capacitor manages.
- The network security config defaults to `cleartextTrafficPermitted="false"`. If you later enable live-reload from a local HTTP server, you will need to loosen that intentionally for development.
