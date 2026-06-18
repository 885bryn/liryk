import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const thisFilePath = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(thisFilePath), "../..");

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(resolve(repoRoot, relativePath), "utf8");
}

describe("android packaging scaffold", () => {
  it("defines the Capacitor app identity and bundled web output", async () => {
    const source = await readRepoFile("capacitor.config.ts");

    expect(source).toContain('appId: "app.liryk"');
    expect(source).toContain('appName: "Liryk"');
    expect(source).toContain('webDir: "dist"');
    expect(source).toContain('androidScheme: "https"');
  });

  it("declares an Android launcher and Spotify callback intent filter", async () => {
    const source = await readRepoFile("android/app/src/main/AndroidManifest.xml");

    expect(source).toContain('android:name="app.liryk.MainActivity"');
    expect(source).toContain("android.intent.action.MAIN");
    expect(source).toContain("android.intent.category.LAUNCHER");
    expect(source).toContain("android.intent.action.VIEW");
    expect(source).toContain('android:scheme="app.liryk"');
    expect(source).toContain('android:host="callback"');
  });

  it("hosts Capacitor through a BridgeActivity entry point", async () => {
    const source = await readRepoFile("android/app/src/main/java/app/liryk/MainActivity.java");

    expect(source).toContain("extends BridgeActivity");
  });

  it("defaults Android network security to no cleartext traffic", async () => {
    const source = await readRepoFile("android/app/src/main/res/xml/network_security_config.xml");

    expect(source).toContain('cleartextTrafficPermitted="false"');
  });
});
