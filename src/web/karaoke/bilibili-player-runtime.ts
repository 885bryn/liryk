export type KaraokeBilibiliPlayer = {
  loadAndPlay(bvid: string, startSeconds: number): Promise<void>;
  stop(): void;
  getCurrentTimeMs(): number;
  dispose(): void;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createKaraokeBilibiliPlayer(container: HTMLElement): KaraokeBilibiliPlayer {
  let iframe: HTMLIFrameElement | null = null;
  let startedAtMs = 0;
  let baseMs = 0;

  return {
    async loadAndPlay(bvid: string, startSeconds: number): Promise<void> {
      if (iframe) {
        iframe.remove();
      }

      iframe = document.createElement("iframe");
      iframe.width = "1";
      iframe.height = "1";
      iframe.allow = "autoplay; encrypted-media; fullscreen";
      iframe.src = `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&page=1&autoplay=1`;
      iframe.style.border = "0";
      container.appendChild(iframe);

      baseMs = Math.max(0, Math.floor(startSeconds * 1000));
      startedAtMs = Date.now();
      await wait(900);
    },
    stop(): void {
      if (iframe) {
        iframe.remove();
        iframe = null;
      }
      baseMs = 0;
      startedAtMs = 0;
    },
    getCurrentTimeMs(): number {
      if (!startedAtMs) {
        return 0;
      }

      return baseMs + Math.max(0, Date.now() - startedAtMs);
    },
    dispose(): void {
      if (iframe) {
        iframe.remove();
        iframe = null;
      }
    },
  };
}
