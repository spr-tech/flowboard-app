import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/components/ui/toast/toast";
import { myMembership } from "@/test/projectFixtures";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { PinToggle } from "./pinToggle";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn() }));

describe("PinToggle", () => {
  beforeEach(() => {
    vi.mocked(toast).mockClear();
  });

  it("is labelled for what it does and reports its state with aria-pressed", () => {
    const { rerender } = renderWithStore(<PinToggle projectId="a" name="Website" isPinned={false} pinnedCount={0} />);
    expect(screen.getByRole("button", { name: "Pin Website" })).toHaveAttribute("aria-pressed", "false");

    rerender(<PinToggle projectId="a" name="Website" isPinned pinnedCount={1} />);
    expect(screen.getByRole("button", { name: "Unpin Website" })).toHaveAttribute("aria-pressed", "true");
  });

  it("toasts 'pinned to your sidebar' for pins 1 to 3 once the server confirms", async () => {
    mockFetch(() => jsonResponse(200, { projectId: "a", ...myMembership({ pinnedAt: "2026-11-21T10:00:00.000Z" }) }));
    renderWithStore(<PinToggle projectId="a" name="Website" isPinned={false} pinnedCount={2} />);

    await userEvent.click(screen.getByRole("button", { name: "Pin Website" }));

    await vi.waitFor(() =>
      expect(toast).toHaveBeenCalledWith({ type: "success", message: "Website pinned to your sidebar" })
    );
  });

  it("says a 4th pin won't show in the sidebar", async () => {
    mockFetch(() => jsonResponse(200, { projectId: "a", ...myMembership({ pinnedAt: "2026-11-21T10:00:00.000Z" }) }));
    renderWithStore(<PinToggle projectId="a" name="Website" isPinned={false} pinnedCount={3} />);

    await userEvent.click(screen.getByRole("button", { name: "Pin Website" }));

    await vi.waitFor(() =>
      expect(toast).toHaveBeenCalledWith({
        type: "success",
        message: "Website pinned (only your first 3 pins show in the sidebar)",
      })
    );
  });

  it("toasts 'unpinned'", async () => {
    mockFetch(() => jsonResponse(200, { projectId: "a", ...myMembership() }));
    renderWithStore(<PinToggle projectId="a" name="Website" isPinned pinnedCount={1} />);

    await userEvent.click(screen.getByRole("button", { name: "Unpin Website" }));

    await vi.waitFor(() => expect(toast).toHaveBeenCalledWith({ type: "success", message: "Website unpinned" }));
  });

  it("shows only the error toast when the pin fails", async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse(500, { error: { code: "INTERNAL", message: "Something went wrong." } })
    );
    renderWithStore(<PinToggle projectId="a" name="Website" isPinned={false} pinnedCount={0} />);

    await userEvent.click(screen.getByRole("button", { name: "Pin Website" }));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await vi.waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
  });
});
