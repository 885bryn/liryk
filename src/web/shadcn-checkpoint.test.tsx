import { render, screen } from "@testing-library/react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { ShadcnCheckpoint } from "./shadcn-checkpoint";

describe("ShadcnCheckpoint", () => {
  it("renders Button, Card, Switch, and Dropdown primitives", () => {
    render(<ShadcnCheckpoint />);

    expect(screen.getByRole("button", { name: "Primary action" })).toBeTruthy();
    expect(screen.getByText("Checkpoint Card")).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Enable dark mode" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open menu" })).toBeTruthy();
  });

  it("documents setup and verification commands", async () => {
    const { readFile } = await import("node:fs/promises");
    const thisFilePath = fileURLToPath(import.meta.url);
    const docsPath = resolve(
      dirname(thisFilePath),
      "../../.planning/phases/05-web-runtime-and-theme-foundation/05-SHADCN-CHECKPOINT.md",
    );

    const docs = await readFile(docsPath, "utf8");
    expect(docs).toContain("npx shadcn@latest init");
    expect(docs).toContain("npm test -- src/web/shadcn-checkpoint.test.tsx");
  });
});
