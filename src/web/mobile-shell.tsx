import { useMemo } from "react";

import { Button } from "@/components/ui/button";

import { useWebAuthRuntime } from "./use-web-auth-runtime";

export function MobileShell() {
  const webAuth = useWebAuthRuntime();

  const connectionBody = useMemo(() => {
    if (webAuth.phase === "checking") {
      return <p className="text-sm leading-relaxed text-white/70">Checking Spotify connection...</p>;
    }

    if (webAuth.phase === "busy") {
      return (
        <>
          <p className="text-sm leading-relaxed text-white/70">{webAuth.statusCopy}</p>
          <Button type="button" disabled>
            {webAuth.statusCopy}
          </Button>
        </>
      );
    }

    if (webAuth.uiState.status === "authorizing") {
      return (
        <>
          <p className="text-sm leading-relaxed text-white/70">{webAuth.statusCopy}</p>
          <Button type="button" disabled>
            {webAuth.statusCopy}
          </Button>
        </>
      );
    }

    if (webAuth.uiState.status === "disconnected") {
      return (
        <>
          <p className="text-sm leading-relaxed text-white/70">{webAuth.statusCopy}</p>
          <Button type="button" disabled={webAuth.hasSetupError} onClick={() => void webAuth.onConnect()}>
            Connect Spotify
          </Button>
        </>
      );
    }

    if (webAuth.uiState.status === "recoverable_error") {
      return (
        <>
          <p className="text-sm leading-relaxed text-amber-200">{webAuth.statusCopy}</p>
          <Button type="button" disabled={!webAuth.uiState.retryEligible} onClick={() => void webAuth.onConnect()}>
            Reconnect Spotify
          </Button>
        </>
      );
    }

    return <p className="text-sm leading-relaxed text-white/70">{webAuth.statusCopy}</p>;
  }, [webAuth]);

  return (
    <main
      data-testid="mobile-shell-layout"
      className="flex min-h-screen flex-col bg-black px-4 py-5 text-white"
    >
      <section data-testid="mobile-shell-connection" className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">Liryk</h1>
        {connectionBody}
      </section>

      <section data-testid="mobile-shell-now-playing" className="mt-6 space-y-1 text-sm text-white/60">
        <p>No active track</p>
        <p>Spotify</p>
      </section>

      <section data-testid="mobile-shell-lyrics-stage" className="mt-6 text-sm text-white/70">
        <p>Lyrics will appear once a track is playing.</p>
      </section>
    </main>
  );
}
