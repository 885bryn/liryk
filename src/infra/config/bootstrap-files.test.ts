import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("bootstrap files", () => {
  it("documents the Windows bootstrap flow in the README", async () => {
    const source = await readFile("README.md", "utf8");

    expect(source).toContain("# Liryk");
    expect(source).toContain("Fresh Windows setup");
    expect(source).toContain(".\\scripts\\setup-windows.ps1");
    expect(source).toContain("npm install");
    expect(source).toContain("npm run dev");
  });

  it("pins the expected Node.js version", async () => {
    const nvmrc = await readFile(".nvmrc", "utf8");
    const pkg = JSON.parse(await readFile("package.json", "utf8")) as {
      engines?: { node?: string };
      scripts?: Record<string, string>;
    };

    expect(nvmrc.trim()).toBe("24.13.1");
    expect(pkg.engines?.node).toBe("24.13.1");
  });

  it("ships an env template with the required auth keys", async () => {
    const source = await readFile(".env.example", "utf8");

    expect(source).toContain("SPOTIFY_CLIENT_ID=");
    expect(source).toContain("SPOTIFY_REDIRECT_URI=http://localhost:3000/callback");
    expect(source).toContain("APP_BASE_URL=http://localhost:3000");
    expect(source).toContain("SPOTIFY_AUTH_SCOPES=user-read-playback-state,user-read-currently-playing");
  });

  it("wires dev startup through the preflight command", async () => {
    const pkg = JSON.parse(await readFile("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(pkg.scripts?.["dev:preflight"]).toBe("node ./scripts/check-dev-env.ts");
    expect(pkg.scripts?.dev).toBe("npm run dev:preflight && vite");
  });
});
