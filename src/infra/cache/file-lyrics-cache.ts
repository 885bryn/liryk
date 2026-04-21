import { dirname } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  LYRICS_CACHE_SCHEMA_VERSION,
  isLyricsCacheEntry,
  type LyricsCacheEntry,
} from "../../core/lyrics/cache-policy";

type StorageShape = {
  schemaVersion: number;
  entries: Record<string, LyricsCacheEntry>;
};

type FileLyricsCacheFs = {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  unlink(path: string): Promise<void>;
};

export type FileLyricsCache = {
  read(trackId: string): Promise<LyricsCacheEntry | null>;
  write(entry: LyricsCacheEntry): Promise<void>;
  delete(trackId: string): Promise<void>;
  clear(): Promise<void>;
};

const defaultFsImpl: FileLyricsCacheFs = {
  readFile: (path) => readFile(path, "utf8"),
  writeFile: (path, content) => writeFile(path, content, "utf8"),
  mkdir: (path) => mkdir(path, { recursive: true }).then(() => undefined),
  unlink: (path) => import("node:fs/promises").then((fs) => fs.unlink(path)),
};

function isStorageShape(value: unknown): value is StorageShape {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<StorageShape>;
  return (
    candidate.schemaVersion === LYRICS_CACHE_SCHEMA_VERSION &&
    !!candidate.entries &&
    typeof candidate.entries === "object" &&
    !Array.isArray(candidate.entries)
  );
}

export function createFileLyricsCache(input: {
  filePath: string;
  fsImpl?: FileLyricsCacheFs;
}): FileLyricsCache {
  const fsImpl = input.fsImpl ?? defaultFsImpl;

  async function readStorage(): Promise<StorageShape | null> {
    try {
      const raw = await fsImpl.readFile(input.filePath);
      const parsed = JSON.parse(raw) as unknown;
      if (!isStorageShape(parsed)) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  async function writeStorage(storage: StorageShape): Promise<void> {
    await fsImpl.mkdir(dirname(input.filePath));
    await fsImpl.writeFile(input.filePath, JSON.stringify(storage));
  }

  return {
    async read(trackId: string): Promise<LyricsCacheEntry | null> {
      const storage = await readStorage();
      if (!storage) {
        return null;
      }

      const entry = storage.entries[trackId];
      if (!entry || !isLyricsCacheEntry(entry)) {
        return null;
      }

      return entry;
    },

    async write(entry: LyricsCacheEntry): Promise<void> {
      const storage =
        (await readStorage()) ??
        ({
          schemaVersion: LYRICS_CACHE_SCHEMA_VERSION,
          entries: {},
        } satisfies StorageShape);

      storage.entries[entry.trackId] = entry;
      await writeStorage(storage);
    },

    async delete(trackId: string): Promise<void> {
      const storage = await readStorage();
      if (!storage) {
        return;
      }

      if (!storage.entries[trackId]) {
        return;
      }

      delete storage.entries[trackId];
      await writeStorage(storage);
    },

    async clear(): Promise<void> {
      await fsImpl.unlink(input.filePath).catch(() => undefined);
    },
  };
}
