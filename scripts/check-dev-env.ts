import { access, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { join } from "node:path";

import { loadAuthEnv } from "../src/infra/config/env.ts";

type EnvSource = Record<string, string | undefined>;

function parseEnvFile(source: string): EnvSource {
  const values: EnvSource = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    values[key] = value;
  }

  return values;
}

async function readEnvLocal(cwd: string): Promise<EnvSource> {
  const envPath = join(cwd, ".env.local");

  try {
    await access(envPath, fsConstants.F_OK);
  } catch {
    throw new Error("Missing .env.local. Run .\\scripts\\setup-windows.ps1, then fill in your Spotify values.");
  }

  return parseEnvFile(await readFile(envPath, "utf8"));
}

async function main(): Promise<void> {
  try {
    const fileValues = await readEnvLocal(process.cwd());
    const envSource = {
      ...fileValues,
      ...(process.env as EnvSource),
    };

    loadAuthEnv(envSource);
    console.log("Environment looks good for local dev.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}

await main();
