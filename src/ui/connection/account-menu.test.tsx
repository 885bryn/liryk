import { describe, expect, it, vi } from "vitest";

import { AuthStore } from "../../state/auth/auth-store";
import { buildAccountMenu, createDisconnectAction } from "./account-menu";

describe("account-menu", () => {
  it("shows connected account identity with disconnect action", async () => {
    const store = new AuthStore();
    const state = store.setConnectedWaitingPlayback({
      displayName: "Avery",
      spotifyUserId: "spotify-user-123",
    });

    const clearTokens = vi.fn(async () => undefined);
    const disconnect = createDisconnectAction({
      tokenStore: { clearTokens },
      authStore: store,
    });

    const model = buildAccountMenu(state, disconnect);
    expect(model?.accountLabel).toBe("Avery");
    expect(model?.secondaryLabel).toBe("spotify-user-123");
    expect(model?.disconnectLabel).toBe("Disconnect Spotify");

    await model?.onDisconnect();

    expect(clearTokens).toHaveBeenCalledTimes(1);
    expect(store.selectUiState().status).toBe("disconnected");
  });

  it("does not render account menu when disconnected", () => {
    const store = new AuthStore();
    const model = buildAccountMenu(store.selectUiState(), async () => undefined);
    expect(model).toBeNull();
  });
});
