import { describe, expect, it } from "vitest";

import { createLyricsCacheEntry } from "../../core/lyrics/cache-policy";
import { createFileLyricsCache } from "./file-lyrics-cache";

type MemoryFs = {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  unlink(path: string): Promise<void>;
};

function createMemoryFs(initialContent?: string): MemoryFs {
  let content = initialContent ?? null;

  return {
    async readFile() {
      if (content === null) {
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      }

      return content;
    },
    async writeFile(_path, nextContent) {
      content = nextContent;
    },
    async mkdir() {
      return;
    },
    async unlink() {
      content = null;
    },
  };
}

describe("createFileLyricsCache", () => {
  it("writes and reads entries keyed by trackId", async () => {
    const fsImpl = createMemoryFs();
    const cache = createFileLyricsCache({ filePath: "memory://cache.json", fsImpl });
    const entry = createLyricsCacheEntry({
      trackId: "track-1",
      resolvedLyrics: {
        sourceState: "synced",
        renderMode: "synced",
        lines: [{ startMs: 1_000, text: "line", renderMode: "synced", isTimestamped: true }],
      },
      fetchedAtMs: 1_000,
    });

    await cache.write(entry);
    const loaded = await cache.read("track-1");

    expect(loaded).toEqual(entry);
  });

  it("deletes only the requested track key", async () => {
    const fsImpl = createMemoryFs();
    const cache = createFileLyricsCache({ filePath: "memory://cache.json", fsImpl });
    const trackOne = createLyricsCacheEntry({
      trackId: "track-1",
      resolvedLyrics: { sourceState: "plain", renderMode: "plain-static", lines: [] },
      fetchedAtMs: 1_000,
    });
    const trackTwo = createLyricsCacheEntry({
      trackId: "track-2",
      resolvedLyrics: { sourceState: "plain", renderMode: "plain-static", lines: [] },
      fetchedAtMs: 2_000,
    });

    await cache.write(trackOne);
    await cache.write(trackTwo);
    await cache.delete("track-1");

    expect(await cache.read("track-1")).toBeNull();
    expect(await cache.read("track-2")).toEqual(trackTwo);
  });

  it("treats malformed JSON and wrong schema as cache miss", async () => {
    const malformed = createFileLyricsCache({ filePath: "memory://cache.json", fsImpl: createMemoryFs("not-json") });
    expect(await malformed.read("track-1")).toBeNull();

    const wrongSchema = createFileLyricsCache({
      filePath: "memory://cache.json",
      fsImpl: createMemoryFs(JSON.stringify({ schemaVersion: 999, entries: {} })),
    });
    expect(await wrongSchema.read("track-1")).toBeNull();
  });
});
