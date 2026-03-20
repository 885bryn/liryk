import { describe, expect, it } from "vitest";

import { useAutoScrollController } from "./use-auto-scroll-controller";

describe("useAutoScrollController", () => {
  it("pauses auto-scroll after manual scroll and resumes after timeout", () => {
    const controller = useAutoScrollController({ suspendMs: 3_000 });

    controller.onActiveLineChange(5, 1_000);
    const paused = controller.onUserManualScroll(2_000);
    expect(paused.isAutoScrollActive).toBe(false);
    expect(paused.showReturnToLive).toBe(true);

    const stillPaused = controller.tick(4_500);
    expect(stillPaused.isAutoScrollActive).toBe(false);

    const resumed = controller.tick(5_001);
    expect(resumed.isAutoScrollActive).toBe(true);
    expect(resumed.showReturnToLive).toBe(false);
  });

  it("return-to-live re-enables auto-scroll immediately", () => {
    const controller = useAutoScrollController({ suspendMs: 10_000 });
    controller.onActiveLineChange(2, 100);
    controller.onUserManualScroll(200);

    const restored = controller.returnToLive(250);
    expect(restored.isAutoScrollActive).toBe(true);
    expect(restored.targetIndex).toBe(2);
  });

  it("keeps smooth-step mode and updates target by active line", () => {
    const controller = useAutoScrollController();

    const first = controller.onActiveLineChange(1, 0);
    const second = controller.onActiveLineChange(2, 50);

    expect(first.mode).toBe("smooth-step");
    expect(second.targetIndex).toBe(2);
  });
});
