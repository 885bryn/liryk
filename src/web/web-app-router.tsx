import { AppShell } from "./app-shell";
import { FullscreenLyricsPage } from "./fullscreen-lyrics-page";

export function WebAppRouter() {
  const pathname = window.location.pathname;

  if (pathname === "/fullscreen") {
    return <FullscreenLyricsPage />;
  }

  return <AppShell />;
}
