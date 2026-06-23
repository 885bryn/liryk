import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

type CommandResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

const tempDirs: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function runCommand(
  command: string,
  args: string[],
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
  } = {},
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

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
    expect(pkg.scripts?.["dev:preflight"]).toBe("node ./scripts/check-dev-env.ts");
    expect(pkg.scripts?.dev).toBe("npm run dev:preflight && vite");
  });

  it("ships an env template with the required auth keys", async () => {
    const source = await readFile(".env.example", "utf8");

    expect(source).toContain("SPOTIFY_CLIENT_ID=");
    expect(source).toContain("SPOTIFY_REDIRECT_URI=http://localhost:3000/callback");
    expect(source).toContain("APP_BASE_URL=http://localhost:3000");
    expect(source).toContain("SPOTIFY_AUTH_SCOPES=user-read-playback-state,user-read-currently-playing");
  });

  it("ships the referenced Windows bootstrap scripts", async () => {
    await expect(stat("scripts/setup-windows.ps1")).resolves.toMatchObject({ isFile: expect.any(Function) });
    await expect(stat("scripts/check-dev-env.ts")).resolves.toMatchObject({ isFile: expect.any(Function) });
  });

  it("creates .env.local from the template without overwriting an existing file", async () => {
    const fixtureDir = await createTempDir("liryk-bootstrap-setup-");
    await writeFile(join(fixtureDir, ".env.example"), "SPOTIFY_CLIENT_ID=template-client\nAPP_BASE_URL=http://localhost:3000\n");

    const firstRun = await runCommand("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      join(process.cwd(), "scripts/setup-windows.ps1"),
    ], { cwd: fixtureDir });

    expect(firstRun.code).toBe(0);
    await expect(readFile(join(fixtureDir, ".env.local"), "utf8")).resolves.toContain("SPOTIFY_CLIENT_ID=template-client");

    await writeFile(join(fixtureDir, ".env.local"), "SPOTIFY_CLIENT_ID=keep-me\n");
    const secondRun = await runCommand("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      join(process.cwd(), "scripts/setup-windows.ps1"),
    ], { cwd: fixtureDir });

    expect(secondRun.code).toBe(0);
    await expect(readFile(join(fixtureDir, ".env.local"), "utf8")).resolves.toBe("SPOTIFY_CLIENT_ID=keep-me\n");
  });

  it("runs the dev preflight against .env.local before startup", async () => {
    const fixtureDir = await createTempDir("liryk-bootstrap-preflight-");
    await writeFile(
      join(fixtureDir, ".env.local"),
      [
        "SPOTIFY_CLIENT_ID=spotify-client-id",
        "SPOTIFY_REDIRECT_URI=http://localhost:3000/callback",
        "APP_BASE_URL=http://localhost:3000",
        "SPOTIFY_AUTH_SCOPES=user-read-playback-state,user-read-currently-playing",
        "",
      ].join("\n"),
    );

    const success = await runCommand("node", [join(process.cwd(), "scripts/check-dev-env.ts")], {
      cwd: fixtureDir,
      env: { ...process.env },
    });

    expect(success.code).toBe(0);
    expect(success.stdout).toContain("Environment looks good");

    await writeFile(join(fixtureDir, ".env.local"), "SPOTIFY_CLIENT_ID=\n");
    const failure = await runCommand("node", [join(process.cwd(), "scripts/check-dev-env.ts")], {
      cwd: fixtureDir,
      env: { ...process.env },
    });

    expect(failure.code).toBe(1);
    expect(failure.stderr).toContain("Missing required environment variable: SPOTIFY_CLIENT_ID");
  });
});
