import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DevActivityPanel } from "./dev-activity-panel";
import { MAX_LOG_ENTRIES, useDevActivityLog } from "./use-dev-activity-log";

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
});

// -----------------------------------------------------------------------
// 1. useDevActivityLog — append and ring buffer
// -----------------------------------------------------------------------
describe("useDevActivityLog — append and ring buffer", () => {
  it("renders without crash and starts with empty entries", () => {
    const { result } = renderHook(() => useDevActivityLog());
    expect(result.current.entries).toEqual([]);
  });

  it("append adds entry with timestamp matching HH:MM:SS pattern", () => {
    const { result } = renderHook(() => useDevActivityLog());
    act(() => {
      result.current.append({ category: "auth", message: "test message" });
    });
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].timestamp).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it("append adds entry with provided category and message", () => {
    const { result } = renderHook(() => useDevActivityLog());
    act(() => {
      result.current.append({ category: "lyrics", message: "lyrics loaded" });
    });
    expect(result.current.entries[0].category).toBe("lyrics");
    expect(result.current.entries[0].message).toBe("lyrics loaded");
  });

  it("ring buffer evicts oldest when count exceeds MAX_LOG_ENTRIES (150)", () => {
    const { result } = renderHook(() => useDevActivityLog());

    act(() => {
      for (let i = 0; i < MAX_LOG_ENTRIES + 1; i++) {
        result.current.append({ category: "clock", message: `entry-${i}` });
      }
    });

    expect(result.current.entries).toHaveLength(MAX_LOG_ENTRIES);
    // Oldest (entry-0) should have been evicted; first entry should be entry-1
    expect(result.current.entries[0].message).toBe("entry-1");
  });

  it("append is stable across renders (same reference)", () => {
    const { result, rerender } = renderHook(() => useDevActivityLog());
    const firstAppend = result.current.append;
    rerender();
    expect(result.current.append).toBe(firstAppend);
  });
});

// -----------------------------------------------------------------------
// 2. DevActivityPanel — scroll isolation
// -----------------------------------------------------------------------
describe("DevActivityPanel — scroll isolation", () => {
  it("renders the scroll container with data-testid dev-panel-log-scroll", () => {
    render(<DevActivityPanel entries={[]} />);
    expect(screen.getByTestId("dev-panel-log-scroll")).toBeDefined();
  });

  it("wheel event on scroll container calls stopPropagation", () => {
    render(<DevActivityPanel entries={[]} />);
    const scrollContainer = screen.getByTestId("dev-panel-log-scroll");

    let propagationStopped = false;
    const wheelEvent = new WheelEvent("wheel", { bubbles: true, cancelable: true });
    Object.defineProperty(wheelEvent, "stopPropagation", {
      value: vi.fn(() => { propagationStopped = true; }),
      writable: true,
    });
    fireEvent(scrollContainer, wheelEvent);
    expect(propagationStopped).toBe(true);
  });

  it("touchstart event on scroll container calls stopPropagation", () => {
    render(<DevActivityPanel entries={[]} />);
    const scrollContainer = screen.getByTestId("dev-panel-log-scroll");

    let propagationStopped = false;
    const touchEvent = new TouchEvent("touchstart", { bubbles: true, cancelable: true });
    Object.defineProperty(touchEvent, "stopPropagation", {
      value: vi.fn(() => { propagationStopped = true; }),
      writable: true,
    });
    fireEvent(scrollContainer, touchEvent);
    expect(propagationStopped).toBe(true);
  });
});

// -----------------------------------------------------------------------
// 3. DevActivityPanel — entry rendering
// -----------------------------------------------------------------------
describe("DevActivityPanel — entry rendering", () => {
  it("renders an auth entry with timestamp and message visible in DOM", () => {
    const entries = [
      { id: "test-1", timestamp: "12:34:56", category: "auth" as const, message: "[AUTH] Connected" },
    ];
    render(<DevActivityPanel entries={entries} />);
    expect(screen.getByText("12:34:56")).toBeDefined();
    expect(screen.getByText(/\[AUTH\] Connected/)).toBeDefined();
  });

  it("auth category entry has a color class containing sky or blue (muted tint)", () => {
    const entries = [
      { id: "auth-1", timestamp: "00:00:01", category: "auth" as const, message: "auth message" },
    ];
    const { container } = render(<DevActivityPanel entries={entries} />);
    // The paragraph for the auth entry should have a sky or blue color class
    const authEntry = container.querySelector("p");
    const className = authEntry?.className ?? "";
    expect(className).toMatch(/sky|blue/);
  });
});

// -----------------------------------------------------------------------
// 4. DevActivityPanel — auto-scroll
// -----------------------------------------------------------------------
describe("DevActivityPanel — auto-scroll", () => {
  it("scrollIntoView is called after entry appended when autoScroll is true", () => {
    const entries = [
      { id: "e1", timestamp: "00:00:01", category: "sync" as const, message: "first" },
    ];
    render(<DevActivityPanel entries={entries} />);
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("scrollIntoView is NOT called when autoScroll is paused", () => {
    const entries = [
      { id: "e1", timestamp: "00:00:01", category: "sync" as const, message: "first" },
    ];
    const { rerender } = render(<DevActivityPanel entries={entries} />);

    // Reset call count after initial render
    vi.clearAllMocks();

    // Pause auto-scroll
    const toggle = screen.getByTestId("dev-panel-autoscroll-toggle");
    fireEvent.click(toggle);

    // Add a new entry
    const moreEntries = [
      ...entries,
      { id: "e2", timestamp: "00:00:02", category: "sync" as const, message: "second" },
    ];
    rerender(<DevActivityPanel entries={moreEntries} />);

    expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("clicking dev-panel-autoscroll-toggle sets aria-pressed to false", () => {
    render(<DevActivityPanel entries={[]} />);
    const toggle = screen.getByTestId("dev-panel-autoscroll-toggle");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });

  it("sentinel div with data-testid dev-panel-bottom-sentinel exists", () => {
    render(<DevActivityPanel entries={[]} />);
    expect(screen.getByTestId("dev-panel-bottom-sentinel")).toBeDefined();
  });
});
