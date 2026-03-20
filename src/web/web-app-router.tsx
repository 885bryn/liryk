import { AppShell } from "./app-shell";

function FullscreenLyricsPage() {
  return <main data-testid="fullscreen-lyrics-layout" className="min-h-screen bg-black text-white" />;
}

export function WebAppRouter() {
  if (window.location.pathname === "/fullscreen") {
    return <FullscreenLyricsPage />;
  }

  return <AppShell />;
}
