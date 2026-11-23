import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DESKTOP_WIDTH, PHONE_WIDTH, stubScreenWidth } from "@/test/matchMedia";
import { useIsPhone } from "./useMediaQuery";

afterEach(() => vi.unstubAllGlobals());

describe("useIsPhone", () => {
  it("is true under md (768px) and false from md up", () => {
    stubScreenWidth(PHONE_WIDTH);
    expect(renderHook(() => useIsPhone()).result.current).toBe(true);

    stubScreenWidth(768);
    expect(renderHook(() => useIsPhone()).result.current).toBe(false);
  });

  it("follows the screen as it's resized", () => {
    const screenSize = stubScreenWidth(DESKTOP_WIDTH);
    const { result } = renderHook(() => useIsPhone());
    expect(result.current).toBe(false);

    screenSize.setWidth(PHONE_WIDTH);
    expect(result.current).toBe(true);

    screenSize.setWidth(800);
    expect(result.current).toBe(false);
  });

  it("falls back to the desktop layout where matchMedia doesn't exist", () => {
    vi.stubGlobal("matchMedia", undefined);

    expect(renderHook(() => useIsPhone()).result.current).toBe(false);
  });
});
