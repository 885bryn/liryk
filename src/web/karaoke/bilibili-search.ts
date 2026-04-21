import { normalizeChineseForDisplay } from "@/core/lyrics/unicode-normalization";

import type { WebNowPlaying } from "../auth/now-playing";

const BILIBILI_SEARCH_URL = "/api/bilibili/search/type";

type BilibiliResultItem = {
  bvid?: string;
  title?: string;
  author?: string;
};

type BilibiliResponse = {
  code?: number;
  data?: {
    result?: BilibiliResultItem[];
  };
};

export type BilibiliCandidate = {
  bvid: string;
  title: string;
  author?: string;
  score: number;
};

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function buildBilibiliQuery(track: WebNowPlaying): string {
  const title = normalizeChineseForDisplay(track.title).trim();
  const artist = normalizeChineseForDisplay(track.artist).trim();
  return `${title} ${artist} 伴奏`;
}

function scoreBilibiliCandidate(track: WebNowPlaying, title: string, author?: string): number {
  const normalized = `${title} ${author ?? ""}`.toLowerCase();
  const titleNormalized = normalizeChineseForDisplay(track.title).toLowerCase();
  const artistNormalized = normalizeChineseForDisplay(track.artist).toLowerCase();

  const hasTitle = normalized.includes(titleNormalized) ? 0.25 : 0;
  const hasArtist = normalized.includes(artistNormalized) ? 0.2 : 0;
  const strongKaraokeHint = /(原版伴奏|纯伴奏|官方伴奏|伴奏版|无主唱)/i.test(normalized) ? 0.35 : 0;
  const karaokeHint = /(伴奏|卡拉ok|ktv|消音|纯音乐)/i.test(normalized) ? 0.2 : 0;

  const badPenalty =
    /(翻唱|弹唱|吉他|钢琴|手机录|现场|清唱|教学|cover|live|mv|reaction|舞蹈)/i.test(normalized) ? 0.7 : 0;

  return Math.max(0, Math.min(1, hasTitle + hasArtist + strongKaraokeHint + karaokeHint - badPenalty));
}

export async function searchBilibiliCandidates(input: {
  track: WebNowPlaying;
  fetchImpl?: typeof fetch;
}): Promise<BilibiliCandidate[]> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = new URL(BILIBILI_SEARCH_URL);
  url.searchParams.set("search_type", "video");
  url.searchParams.set("keyword", buildBilibiliQuery(input.track));
  url.searchParams.set("page", "1");

  const response = await fetchImpl.call(globalThis, url.toString(), {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Bilibili search failed (${response.status})`);
  }

  const payload = (await response.json().catch(() => ({}))) as BilibiliResponse;
  if (payload.code !== 0) {
    throw new Error(`Bilibili search returned code ${payload.code ?? "unknown"}`);
  }

  const results = (payload.data?.result ?? [])
    .map((item) => ({
      bvid: item.bvid?.trim() ?? "",
      title: stripHtml(item.title ?? ""),
      author: item.author?.trim() || undefined,
      score: scoreBilibiliCandidate(input.track, stripHtml(item.title ?? ""), item.author?.trim() || undefined),
    }))
    .filter((item) => item.bvid && item.title && item.score >= 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return results;
}
