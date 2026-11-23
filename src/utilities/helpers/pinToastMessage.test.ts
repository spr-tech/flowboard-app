import { describe, expect, it } from "vitest";

import { pinToastMessage } from "./pinToastMessage";

describe("pinToastMessage", () => {
  it.each([1, 2, 3])("says pin %i went to the sidebar", (pinNumber) => {
    expect(pinToastMessage("Website relaunch", { pinned: true, pinNumber })).toBe(
      "Website relaunch pinned to your sidebar"
    );
  });

  it.each([4, 9])("says pin %i is pinned but not in the sidebar", (pinNumber) => {
    expect(pinToastMessage("Website relaunch", { pinned: true, pinNumber })).toBe(
      "Website relaunch pinned (only your first 3 pins show in the sidebar)"
    );
  });

  it("says unpinned", () => {
    expect(pinToastMessage("Website relaunch", { pinned: false })).toBe("Website relaunch unpinned");
  });
});
