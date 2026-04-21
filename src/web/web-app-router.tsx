import { AppShell } from "./app-shell";
import { FullscreenLyricsPage } from "./fullscreen-lyrics-page";

export function WebAppRouter() {
  if (window.location.pathname === "/fullscreen") {
    return <FullscreenLyricsPage />;
  }

  return <AppShell />;
}
