import { useEffect, useRef, useState, type MutableRefObject } from "react";

import type { WebNowPlaying } from "./auth/now-playing";
import {
  confirmKaraokeMapping,
  getBlockedVideoIds,
  loadKaraokeMapping,
  markVideoAsBlocked,
  saveKaraokeMapping,
} from "./karaoke/mapping-store";
import { createKaraokeBilibiliPlayer, type KaraokeBilibiliPlayer } from "./karaoke/bilibili-player-runtime";
import { searchBilibiliCandidates } from "./karaoke/bilibili-search";
import { pauseSpotifyPlayback } from "./karaoke/spotify-control";
import type { KaraokeMapping, KaraokeModeState, KaraokeRuntimeModel } from "./karaoke/types";
import { createKaraokeYouTubePlayer, type KaraokeYouTubePlayer } from "./karaoke/youtube-player-runtime";
import { findKaraokeMappingCandidates } from "./karaoke/youtube-search";

const ORIGINAL_MESSAGE = "Original mode";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

type KaraokeStatus = {
  mode: KaraokeModeState;
  message: string;
  mapping: KaraokeMapping | null;
  candidateMappings: KaraokeMapping[];
  referenceTrack: WebNowPlaying | null;
  localPlaybackMs: number | null;
  canResumeAutoplay: boolean;
};

function createInitialStatus(): KaraokeStatus {
  return {
    mode: "original",
    message: ORIGINAL_MESSAGE,
    mapping: null,
    candidateMappings: [],
    referenceTrack: null,
    localPlaybackMs: null,
    canResumeAutoplay: false,
  };
}

async function resolveKaraokeMappings(track: WebNowPlaying): Promise<KaraokeMapping[]> {
  const cached = loadKaraokeMapping(track.trackId);
  const blockedVideoIds = getBlockedVideoIds(track.trackId);
  const results: KaraokeMapping[] = [];

  if (cached && !blockedVideoIds.has(cached.youtubeVideoId)) {
    results.push({
      ...cached,
      spotifyTitle: track.title,
      spotifyArtist: track.artist,
      spotifyDurationMs: track.durationMs,
      updatedAt: Date.now(),
    });
  }

  const discovered = await findKaraokeMappingCandidates({ track });
  for (const mapping of discovered) {
    if (blockedVideoIds.has(mapping.youtubeVideoId)) {
      continue;
    }

    if (results.some((item) => item.youtubeVideoId === mapping.youtubeVideoId)) {
      continue;
    }

    results.push(mapping);
  }

  return results.slice(0, 12);
}

function isBilibiliMapping(mapping: KaraokeMapping): boolean {
  return mapping.youtubeVideoId.startsWith("bilibili:");
}

function toBilibiliMapping(track: WebNowPlaying, candidate: { bvid: string; title: string; author?: string }): KaraokeMapping {
  return {
    spotifyTrackId: track.trackId,
    spotifyTitle: track.title,
    spotifyArtist: track.artist,
    spotifyDurationMs: track.durationMs,
    youtubeVideoId: `bilibili:${candidate.bvid}`,
    youtubeTitle: candidate.title,
    youtubeChannelTitle: candidate.author,
    confirmedByUser: false,
    matchConfidence: 0.5,
    searchQueriesTried: ["bilibili_fallback"],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function useKaraokeMode(input: {
  accessToken: string | null;
  nowPlaying: WebNowPlaying | null;
}): KaraokeRuntimeModel & { playerHostRef: MutableRefObject<HTMLDivElement | null> } {
  const [status, setStatus] = useState<KaraokeStatus>(() => createInitialStatus());
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<KaraokeYouTubePlayer | null>(null);
  const bilibiliPlayerRef = useRef<KaraokeBilibiliPlayer | null>(null);
  const playerInitPromiseRef = useRef<Promise<KaraokeYouTubePlayer> | null>(null);
  const queueRef = useRef(Promise.resolve());
  const transitionIdRef = useRef(0);
  const localProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeSourceRef = useRef<"youtube" | "bilibili" | null>(null);
  const lastStableSourceRef = useRef<"youtube" | "bilibili" | null>(null);
  const lastStableMappingRef = useRef<KaraokeMapping | null>(null);
  const manualStartContextRef = useRef<{
    track: WebNowPlaying;
    mappings: KaraokeMapping[];
    startSeconds: number;
  } | null>(null);
  const manualStartAttemptRef = useRef(0);

  const logDiagnostic = (event: string, details: Record<string, unknown> = {}) => {
    const activation =
      typeof navigator !== "undefined" && "userActivation" in navigator
        ? (navigator as Navigator & { userActivation?: { isActive?: boolean; hasBeenActive?: boolean } }).userActivation
        : undefined;

    console.info("[karaoke-mode]", {
      event,
      timestamp: Date.now(),
      mode: status.mode,
      activationIsActive: activation?.isActive,
      activationHasBeenActive: activation?.hasBeenActive,
      ...details,
    });
  };

  const clearLocalProgressTimer = () => {
    if (localProgressTimerRef.current) {
      clearInterval(localProgressTimerRef.current);
      localProgressTimerRef.current = null;
    }
  };

  const updateLocalProgress = () => {
    const progressMs =
      activeSourceRef.current === "youtube"
        ? playerRef.current?.getCurrentTimeMs()
        : activeSourceRef.current === "bilibili"
          ? bilibiliPlayerRef.current?.getCurrentTimeMs()
          : undefined;

    if (typeof progressMs !== "number") {
      return;
    }

    setStatus((current) => ({
      ...current,
      localPlaybackMs: progressMs,
    }));
  };

  const ensurePlayer = async (): Promise<KaraokeYouTubePlayer> => {
    if (playerRef.current) {
      return playerRef.current;
    }

    if (playerInitPromiseRef.current) {
      return playerInitPromiseRef.current;
    }

    const host = playerHostRef.current;
    if (!host) {
      throw new Error("Karaoke player host is unavailable.");
    }

    const pending = createKaraokeYouTubePlayer(host)
      .then((player) => {
        playerRef.current = player;
        playerInitPromiseRef.current = null;
        return player;
      })
      .catch((error) => {
        playerInitPromiseRef.current = null;
        throw error;
      });

    playerInitPromiseRef.current = pending;
    return pending;
  };

  const primePlaybackGesture = () => {
    void ensurePlayer().catch(() => undefined);
  };

  const ensureBilibiliPlayer = (): KaraokeBilibiliPlayer => {
    if (bilibiliPlayerRef.current) {
      return bilibiliPlayerRef.current;
    }

    const host = playerHostRef.current;
    if (!host) {
      throw new Error("Bilibili player host is unavailable.");
    }

    bilibiliPlayerRef.current = createKaraokeBilibiliPlayer(host);
    return bilibiliPlayerRef.current;
  };

  const playMappingAt = async (mapping: KaraokeMapping, startSeconds: number): Promise<"youtube" | "bilibili"> => {
    if (isBilibiliMapping(mapping)) {
      const bilibiliPlayer = ensureBilibiliPlayer();
      const bvid = mapping.youtubeVideoId.replace("bilibili:", "");
      await bilibiliPlayer.loadAndPlay(bvid, startSeconds);
      return "bilibili";
    }

    const player = await ensurePlayer();
    await withTimeout(
      player.loadAndPlay(mapping.youtubeVideoId, startSeconds),
      20_000,
      "Selected backing track did not start in time.",
    );
    return "youtube";
  };

  const runSerialized = async (task: (transitionId: number) => Promise<void>): Promise<void> => {
    const nextTask = queueRef.current
      .catch(() => undefined)
      .then(async () => {
      transitionIdRef.current += 1;
      const transitionId = transitionIdRef.current;
      await task(transitionId);
    });

    queueRef.current = nextTask.catch(() => undefined);
    return nextTask;
  };

  const startPlaybackFromMappings = async (inputStart: {
    player: KaraokeYouTubePlayer;
    mappings: KaraokeMapping[];
    startSeconds: number;
    fromManualAttempt: boolean;
    trackId?: string;
  }): Promise<KaraokeMapping> => {
    let lastPlaybackError: Error | null = null;
    let blockedErrorCount = 0;

    for (let index = 0; index < inputStart.mappings.length; index += 1) {
      const mapping = inputStart.mappings[index];
      setStatus((current) => ({
        ...current,
        message: `Starting YouTube karaoke playback (${index + 1}/${inputStart.mappings.length})...`,
        mapping,
      }));

      logDiagnostic("player_start_attempt", {
        fromManualAttempt: inputStart.fromManualAttempt,
        attemptIndex: index + 1,
        totalCandidates: inputStart.mappings.length,
        youtubeVideoId: mapping.youtubeVideoId,
        startSeconds: inputStart.startSeconds,
      });

      try {
        await withTimeout(
          inputStart.player.loadAndPlay(mapping.youtubeVideoId, inputStart.startSeconds),
          20_000,
          "YouTube playback did not start in time.",
        );

        saveKaraokeMapping(mapping);
        return mapping;
      } catch (error) {
        const playbackError = error instanceof Error ? error : new Error(String(error));
        lastPlaybackError = playbackError;

        if (/error 101|error 150/i.test(playbackError.message)) {
          blockedErrorCount += 1;
          if (inputStart.trackId) {
            markVideoAsBlocked(inputStart.trackId, mapping.youtubeVideoId);
          }
        }

        logDiagnostic("player_start_error", {
          fromManualAttempt: inputStart.fromManualAttempt,
          youtubeVideoId: mapping.youtubeVideoId,
          message: playbackError.message,
        });

        const candidateSpecific = /player error|embedding|not start in time/i.test(playbackError.message);
        if (candidateSpecific) {
          continue;
        }

        throw playbackError;
      }
    }

    if (blockedErrorCount === inputStart.mappings.length && inputStart.mappings.length > 0) {
      throw new Error(
        "YouTube blocked embedding for all candidate videos (error 150/101). Try a different song or add a manual video override.",
      );
    }

    throw lastPlaybackError ?? new Error("Unable to start any karaoke backing track.");
  };

  const enterKaraokeMode = async () =>
    runSerialized(async (transitionId) => {
      if (status.mode === "karaoke" || status.mode === "switching_to_karaoke") {
        return;
      }

      const track = input.nowPlaying;
      logDiagnostic("enter_requested", {
        hasTrack: Boolean(track),
        hasAccessToken: Boolean(input.accessToken),
      });

      if (!track) {
        setStatus((current) => ({
          ...current,
          mode: "error",
          message: "No active Spotify track detected."
        }));
        return;
      }

      setStatus((current) => ({
        ...current,
        mode: "switching_to_karaoke",
        message: "Switching to Karaoke mode...",
        referenceTrack: track,
      }));

      try {
        setStatus((current) => ({
          ...current,
          message: "Looking up karaoke backing track...",
        }));

        const youtubeMappings = await withTimeout(resolveKaraokeMappings(track), 20_000, "Karaoke track lookup timed out.");
        if (transitionId !== transitionIdRef.current) {
          return;
        }

        const mappings = [...youtubeMappings];
        try {
          const bilibiliCandidates = await withTimeout(
            searchBilibiliCandidates({ track }),
            8_000,
            "Bilibili prefetch timed out.",
          );
          for (const bilibiliCandidate of bilibiliCandidates) {
            const mapped = toBilibiliMapping(track, bilibiliCandidate);
            if (mappings.some((item) => item.youtubeVideoId === mapped.youtubeVideoId)) {
              continue;
            }

            mappings.push(mapped);
            if (mappings.length >= 10) {
              break;
            }
          }
        } catch {
          // Ignore prefetch failures; regular fallback path still exists.
        }

        const playableYouTubeMappings = mappings.filter((item) => !isBilibiliMapping(item));
        const hasYouTubeCandidates = playableYouTubeMappings.length > 0;

        const startSeconds = Math.max(0, Math.floor((track.progressMs ?? 0) / 1000));
        manualStartContextRef.current = {
          track,
          mappings,
          startSeconds,
        };

        setStatus((current) => ({
          ...current,
          candidateMappings: mappings.slice(0, 3),
          mapping: mappings[0] ?? current.mapping,
        }));

        if (!hasYouTubeCandidates) {
          logDiagnostic("no_youtube_candidates", {
            trackId: track.trackId,
          });
        }

        logDiagnostic("mappings_ready", {
          candidateCount: mappings.length,
          startSeconds,
          trackId: track.trackId,
        });

        if (!input.accessToken) {
          throw new Error("Spotify session expired. Reconnect and try again.");
        }

        setStatus((current) => ({
          ...current,
          message: "Pausing Spotify playback...",
        }));

        const player = await ensurePlayer();

        const pauseResult = await pauseSpotifyPlayback({ accessToken: input.accessToken });
        if (transitionId !== transitionIdRef.current) {
          return;
        }

        let selectedMapping: KaraokeMapping;
        let source: "youtube" | "bilibili" = "youtube";

        const preferBilibiliFirst =
          playableYouTubeMappings.length <= 1 || (playableYouTubeMappings[0]?.matchConfidence ?? 0) < 0.58;

        if (hasYouTubeCandidates && !preferBilibiliFirst) {
          try {
            selectedMapping = await startPlaybackFromMappings({
              player,
              mappings: playableYouTubeMappings,
              startSeconds,
              fromManualAttempt: false,
              trackId: track.trackId,
            });
            source = "youtube";
          } catch (youtubeError) {
            const youtubeMessage = youtubeError instanceof Error ? youtubeError.message : String(youtubeError);
            if (!/error 101|error 150|blocked embedding/i.test(youtubeMessage)) {
              throw youtubeError;
            }

            logDiagnostic("fallback_to_bilibili", {
              reason: youtubeMessage,
              trackId: track.trackId,
            });

            setStatus((current) => ({
              ...current,
              message: "YouTube embed blocked. Trying Bilibili fallback...",
            }));

            const bilibiliCandidates = await withTimeout(
              searchBilibiliCandidates({ track }),
              15_000,
              "Bilibili lookup timed out.",
            );

            if (bilibiliCandidates.length === 0) {
              throw new Error(
                "YouTube blocked embedding and no Bilibili backup was found. Use another song or add manual override.",
              );
            }

            const bilibiliPlayer = ensureBilibiliPlayer();
            const bilibiliCandidate = bilibiliCandidates[0];
            await bilibiliPlayer.loadAndPlay(bilibiliCandidate.bvid, startSeconds);

            source = "bilibili";
            selectedMapping = {
              spotifyTrackId: track.trackId,
              spotifyTitle: track.title,
              spotifyArtist: track.artist,
              spotifyDurationMs: track.durationMs,
              youtubeVideoId: `bilibili:${bilibiliCandidate.bvid}`,
              youtubeTitle: bilibiliCandidate.title,
              youtubeChannelTitle: bilibiliCandidate.author,
              confirmedByUser: false,
              matchConfidence: 0.5,
              searchQueriesTried: ["bilibili_fallback"],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
          }
        } else {
          setStatus((current) => ({
            ...current,
            message: "No YouTube candidates available. Trying Bilibili fallback...",
          }));

          const bilibiliCandidates = mappings
            .filter((item) => isBilibiliMapping(item))
            .map((item) => ({
              bvid: item.youtubeVideoId.replace("bilibili:", ""),
              title: item.youtubeTitle,
              author: item.youtubeChannelTitle,
              score: item.matchConfidence,
            }));

          const resolvedBilibiliCandidates =
            bilibiliCandidates.length > 0
              ? bilibiliCandidates
              : await withTimeout(searchBilibiliCandidates({ track }), 15_000, "Bilibili lookup timed out.");

          if (resolvedBilibiliCandidates.length === 0) {
            throw new Error("No suitable karaoke backing track found on YouTube or Bilibili.");
          }

          const bilibiliPlayer = ensureBilibiliPlayer();
          const bilibiliCandidate = resolvedBilibiliCandidates[0];
          await bilibiliPlayer.loadAndPlay(bilibiliCandidate.bvid, startSeconds);

          source = "bilibili";
          selectedMapping = toBilibiliMapping(track, bilibiliCandidate);
        }

        activeSourceRef.current = source;

        clearLocalProgressTimer();
        localProgressTimerRef.current = setInterval(updateLocalProgress, 250);

        setStatus((current) => ({
          ...current,
          mode: "karaoke",
          message:
            source === "bilibili"
              ? "Karaoke mode active (Bilibili fallback)"
              : pauseResult.warning
                ? `Karaoke mode active (${pauseResult.warning})`
                : "Karaoke mode active",
          mapping: selectedMapping,
          candidateMappings: mappings.slice(0, 3),
          referenceTrack: track,
          localPlaybackMs:
            source === "youtube" ? player.getCurrentTimeMs() : (bilibiliPlayerRef.current?.getCurrentTimeMs() ?? 0),
          canResumeAutoplay: false,
        }));
        lastStableSourceRef.current = source;
        lastStableMappingRef.current = selectedMapping;
      } catch (error) {
        clearLocalProgressTimer();
        const message = error instanceof Error ? error.message : "Failed to switch into Karaoke mode.";
        const autoplayBlocked = /autoplay/i.test(message);
        if (!autoplayBlocked) {
          playerRef.current?.stop();
        }
        bilibiliPlayerRef.current?.stop();
        activeSourceRef.current = null;

        setStatus((current) => ({
          ...current,
          mode: "error",
          message,
          candidateMappings: current.candidateMappings,
          canResumeAutoplay: autoplayBlocked,
        }));

        logDiagnostic("enter_failed", {
          message,
          autoplayBlocked,
          hasManualContext: Boolean(manualStartContextRef.current),
        });
      }
    });

  const exitKaraokeMode = async () =>
    runSerialized(async () => {
      if (status.mode === "original" || status.mode === "switching_to_original") {
        return;
      }

      setStatus((current) => ({
        ...current,
        mode: "switching_to_original",
        message: "Switching back to Original mode...",
      }));

      try {
        clearLocalProgressTimer();
        playerRef.current?.stop();
        bilibiliPlayerRef.current?.stop();
        activeSourceRef.current = null;

        setStatus((current) => ({
          ...current,
          mode: "original",
          message: ORIGINAL_MESSAGE,
          candidateMappings: [],
          localPlaybackMs: null,
          referenceTrack: null,
          canResumeAutoplay: false,
        }));
      } catch (error) {
        setStatus((current) => ({
          ...current,
          mode: "error",
          message: error instanceof Error ? error.message : "Failed to exit Karaoke mode.",
          canResumeAutoplay: false,
        }));
      }
    });

  const resumeAutoplay = async () => {
    manualStartAttemptRef.current += 1;
    logDiagnostic("resume_requested", {
      attempt: manualStartAttemptRef.current,
      canResumeAutoplay: status.canResumeAutoplay,
      hasManualContext: Boolean(manualStartContextRef.current),
    });

    if (!status.canResumeAutoplay) {
      return;
    }

    const player = playerRef.current;
    if (!player) {
      setStatus((current) => ({
        ...current,
        mode: "error",
        message: "Karaoke player is not ready. Retry entering Karaoke mode.",
        canResumeAutoplay: false,
      }));
      return;
    }

    const manualContext = manualStartContextRef.current;
    if (!manualContext) {
      setStatus((current) => ({
        ...current,
        mode: "error",
        message: "No pending Karaoke start context. Retry Enter Karaoke.",
        canResumeAutoplay: false,
      }));
      return;
    }

    try {
      setStatus((current) => ({
        ...current,
        message: `Manual start attempt ${manualStartAttemptRef.current}...`,
      }));

      const selectedMapping = await startPlaybackFromMappings({
        player,
        mappings: manualContext.mappings,
        startSeconds: 0,
        fromManualAttempt: true,
        trackId: manualContext.track.trackId,
      });

      activeSourceRef.current = "youtube";

      clearLocalProgressTimer();
      localProgressTimerRef.current = setInterval(updateLocalProgress, 250);

        setStatus((current) => ({
          ...current,
          mode: "karaoke",
          message: "Karaoke mode active",
          mapping: selectedMapping,
          candidateMappings: manualContext.mappings.slice(0, 3),
          referenceTrack: manualContext.track,
        localPlaybackMs: player.getCurrentTimeMs(),
        canResumeAutoplay: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start YouTube playback.";
      setStatus((current) => ({
        ...current,
        mode: "error",
        message,
        canResumeAutoplay: true,
      }));

      activeSourceRef.current = null;

      logDiagnostic("resume_failed", {
        attempt: manualStartAttemptRef.current,
        message,
      });
    }
  };

  const clearError = () => {
    setStatus((current) => {
      if (current.mode !== "error") {
        return current;
      }

      return {
        ...current,
        mode: "original",
        message: ORIGINAL_MESSAGE,
        candidateMappings: current.candidateMappings,
        canResumeAutoplay: false,
      };
    });
  };

  const setPreferredCandidate = (youtubeVideoId: string) => {
    setStatus((current) => {
      const nextCandidates = [...current.candidateMappings];
      const preferredIndex = nextCandidates.findIndex((item) => item.youtubeVideoId === youtubeVideoId);
      if (preferredIndex <= 0) {
        return current;
      }

      const [preferred] = nextCandidates.splice(preferredIndex, 1);
      nextCandidates.unshift(preferred);

      if (manualStartContextRef.current) {
        const nextMappings = [...manualStartContextRef.current.mappings];
        const mappingIndex = nextMappings.findIndex((item) => item.youtubeVideoId === youtubeVideoId);
        if (mappingIndex > 0) {
          const [selected] = nextMappings.splice(mappingIndex, 1);
          nextMappings.unshift(selected);
          manualStartContextRef.current = {
            ...manualStartContextRef.current,
            mappings: nextMappings,
          };
        }
      }

      return {
        ...current,
        candidateMappings: nextCandidates,
        mapping: preferred,
        message: "Preferred backing track selected",
      };
    });
  };

  const removeBlockedCandidate = (youtubeVideoId: string) => {
    if (manualStartContextRef.current) {
      manualStartContextRef.current = {
        ...manualStartContextRef.current,
        mappings: manualStartContextRef.current.mappings.filter((item) => item.youtubeVideoId !== youtubeVideoId),
      };
    }

    setStatus((current) => {
      const nextFromContext = manualStartContextRef.current?.mappings.slice(0, 3) ?? [];
      const nextCandidates = nextFromContext.length > 0
        ? nextFromContext
        : current.candidateMappings.filter((item) => item.youtubeVideoId !== youtubeVideoId);
      const nextMapping =
        current.mapping?.youtubeVideoId === youtubeVideoId ? (nextCandidates[0] ?? null) : current.mapping;

      return {
        ...current,
        candidateMappings: nextCandidates,
        mapping: nextMapping,
      };
    });
  };

  const switchToCandidate = async (youtubeVideoId: string) =>
    runSerialized(async () => {
      const context = manualStartContextRef.current;
      const mapping = context?.mappings.find((item) => item.youtubeVideoId === youtubeVideoId);
      if (!context || !mapping) {
        return;
      }

      try {
        setPreferredCandidate(youtubeVideoId);
        setStatus((current) => ({
          ...current,
          mode: "switching_to_karaoke",
          message: "Switching backing track...",
        }));

        clearLocalProgressTimer();
        if (activeSourceRef.current === "youtube") {
          playerRef.current?.stop();
        } else if (activeSourceRef.current === "bilibili") {
          bilibiliPlayerRef.current?.stop();
        }
        const startSeconds = Math.max(0, Math.floor((status.localPlaybackMs ?? context.startSeconds * 1000) / 1000));

        if (isBilibiliMapping(mapping)) {
          await playMappingAt(mapping, startSeconds);

          activeSourceRef.current = "bilibili";
          localProgressTimerRef.current = setInterval(updateLocalProgress, 250);
          setStatus((current) => ({
            ...current,
            mode: "karaoke",
            message: "Switched backing track (Bilibili)",
            mapping,
            localPlaybackMs: bilibiliPlayerRef.current?.getCurrentTimeMs() ?? startSeconds * 1000,
            canResumeAutoplay: false,
          }));
          lastStableSourceRef.current = "bilibili";
          lastStableMappingRef.current = mapping;
          return;
        }

        try {
          await playMappingAt(mapping, startSeconds);

          activeSourceRef.current = "youtube";
          localProgressTimerRef.current = setInterval(updateLocalProgress, 250);
          saveKaraokeMapping(mapping);

          setStatus((current) => ({
            ...current,
            mode: "karaoke",
            message: "Switched backing track",
            mapping,
            localPlaybackMs: playerRef.current?.getCurrentTimeMs() ?? startSeconds * 1000,
            canResumeAutoplay: false,
          }));
          lastStableSourceRef.current = "youtube";
          lastStableMappingRef.current = mapping;
        } catch (youtubeError) {
          const youtubeMessage = youtubeError instanceof Error ? youtubeError.message : String(youtubeError);
          if (!/error 101|error 150|blocked embedding|autoplay/i.test(youtubeMessage)) {
            throw youtubeError;
          }

          if (/error 101|error 150|blocked embedding/i.test(youtubeMessage)) {
            markVideoAsBlocked(context.track.trackId, mapping.youtubeVideoId);
            removeBlockedCandidate(mapping.youtubeVideoId);
          }

          setStatus((current) => ({
            ...current,
            message: "Selected YouTube video is blocked. Trying Bilibili fallback...",
          }));

          const bilibiliCandidates = await withTimeout(
            searchBilibiliCandidates({ track: context.track }),
            15_000,
            "Bilibili lookup timed out.",
          );

          if (bilibiliCandidates.length === 0) {
            throw new Error("Selected options are embed-blocked and no Bilibili fallback was found.");
          }

          const bilibiliPlayer = ensureBilibiliPlayer();
          const bilibiliCandidate = bilibiliCandidates[0];
          await bilibiliPlayer.loadAndPlay(bilibiliCandidate.bvid, startSeconds);

          activeSourceRef.current = "bilibili";
          localProgressTimerRef.current = setInterval(updateLocalProgress, 250);

          const bilibiliMapping: KaraokeMapping = {
            spotifyTrackId: context.track.trackId,
            spotifyTitle: context.track.title,
            spotifyArtist: context.track.artist,
            spotifyDurationMs: context.track.durationMs,
            youtubeVideoId: `bilibili:${bilibiliCandidate.bvid}`,
            youtubeTitle: bilibiliCandidate.title,
            youtubeChannelTitle: bilibiliCandidate.author,
            confirmedByUser: false,
            matchConfidence: 0.5,
            searchQueriesTried: ["bilibili_fallback"],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          setStatus((current) => ({
            ...current,
            mode: "karaoke",
            message: "Switched backing track (Bilibili fallback)",
            mapping: bilibiliMapping,
            localPlaybackMs: bilibiliPlayer.getCurrentTimeMs(),
            canResumeAutoplay: false,
          }));
          lastStableSourceRef.current = "bilibili";
          lastStableMappingRef.current = bilibiliMapping;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to switch backing track.";
        const previousMapping = status.mapping ?? lastStableMappingRef.current;
        const previousSource = activeSourceRef.current ?? lastStableSourceRef.current;
        const previousStartSeconds = Math.max(0, Math.floor((status.localPlaybackMs ?? 0) / 1000));

        if (previousMapping && previousSource) {
          try {
            await playMappingAt(previousMapping, previousStartSeconds);
            activeSourceRef.current = previousSource;
            localProgressTimerRef.current = setInterval(updateLocalProgress, 250);
            setStatus((current) => ({
              ...current,
              mode: "karaoke",
              message: `Switch failed; restored previous backing track (${message})`,
              mapping: previousMapping,
              localPlaybackMs:
                previousSource === "youtube"
                  ? (playerRef.current?.getCurrentTimeMs() ?? previousStartSeconds * 1000)
                  : (bilibiliPlayerRef.current?.getCurrentTimeMs() ?? previousStartSeconds * 1000),
              canResumeAutoplay: false,
            }));
            return;
          } catch {
            // Fall through to error state.
          }
        }

        setStatus((current) => ({
          ...current,
          mode: "error",
          message,
          canResumeAutoplay: /autoplay/i.test(message),
        }));
      }
    });

  const banCurrentCandidate = async () =>
    runSerialized(async () => {
      const currentMapping = status.mapping;
      const context = manualStartContextRef.current;
      if (!currentMapping || !context) {
        return;
      }

      if (isBilibiliMapping(currentMapping)) {
        setStatus((current) => ({
          ...current,
          message: "Current source is Bilibili fallback; YouTube ban is not applicable.",
        }));
        return;
      }

      markVideoAsBlocked(context.track.trackId, currentMapping.youtubeVideoId);
      removeBlockedCandidate(currentMapping.youtubeVideoId);

      setStatus((current) => ({
        ...current,
        message: "Banned current YouTube candidate. Switching to next option...",
      }));

      const nextCandidate = manualStartContextRef.current?.mappings[0];
      if (nextCandidate) {
        setTimeout(() => {
          void switchToCandidate(nextCandidate.youtubeVideoId);
        }, 0);
        return;
      }

      const bilibiliCandidates = await withTimeout(
        searchBilibiliCandidates({ track: context.track }),
        15_000,
        "Bilibili lookup timed out.",
      );

      if (bilibiliCandidates.length === 0) {
        setStatus((current) => ({
          ...current,
          mode: "error",
          message: "No replacement candidate was found after banning the current one.",
        }));
        return;
      }

      const mapped = toBilibiliMapping(context.track, bilibiliCandidates[0]);
      if (manualStartContextRef.current) {
        manualStartContextRef.current = {
          ...manualStartContextRef.current,
          mappings: [mapped, ...manualStartContextRef.current.mappings],
        };
      }

      setTimeout(() => {
        void switchToCandidate(mapped.youtubeVideoId);
      }, 0);
    });

  const confirmCurrentMapping = () => {
    setStatus((current) => {
      if (!current.mapping) {
        return current;
      }

      const confirmed = confirmKaraokeMapping(current.mapping.spotifyTrackId);
      if (!confirmed) {
        return current;
      }

      return {
        ...current,
        mapping: confirmed,
        message: "Karaoke mapping confirmed",
      };
    });
  };

  useEffect(() => {
    return () => {
      clearLocalProgressTimer();
      playerRef.current?.dispose();
      playerRef.current = null;
      bilibiliPlayerRef.current?.dispose();
      bilibiliPlayerRef.current = null;
      playerInitPromiseRef.current = null;
      activeSourceRef.current = null;
    };
  }, []);

  return {
    mode: status.mode,
    message: status.message,
    currentMapping: status.mapping,
    candidateMappings: status.candidateMappings,
    referenceTrack: status.referenceTrack,
    localPlaybackMs: status.localPlaybackMs,
    canResumeAutoplay: status.canResumeAutoplay,
    primePlaybackGesture,
    setPreferredCandidate,
    switchToCandidate,
    banCurrentCandidate,
    enterKaraokeMode,
    exitKaraokeMode,
    resumeAutoplay,
    clearError,
    confirmCurrentMapping,
    playerHostRef,
  };
}
