import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { InviteResponse } from "@/models/responses/memberResponses";
import { renderWithStore } from "@/test/renderWithStore";
import { PendingInvites } from "./pendingInvites";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn(), dismissToast: vi.fn() }));

const DAY = 24 * 60 * 60 * 1000;
const invite = (n: number): InviteResponse => ({
  id: `inv${n}`,
  email: `person${n}@team.dev`,
  sentAt: new Date(Date.now() - DAY).toISOString(),
  expiresAt: new Date(Date.now() + 6 * DAY).toISOString(),
});
const invites = (count: number) => Array.from({ length: count }, (_, index) => invite(index + 1));
const shownEmails = () => screen.getAllByRole("listitem").map((row) => row.querySelector("[title]")?.textContent);

describe("PendingInvites: three at a time", () => {
  it("shows up to 3 invites with no paging controls", () => {
    renderWithStore(<PendingInvites projectId="p1" invites={invites(3)} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByRole("group", { name: "Pending invites pages" })).not.toBeInTheDocument();
  });

  it("pages through more with Previous and Next, disabled at the ends", async () => {
    renderWithStore(<PendingInvites projectId="p1" invites={invites(7)} />);

    expect(shownEmails()).toEqual(["person1@team.dev", "person2@team.dev", "person3@team.dev"]);
    expect(screen.getByRole("status")).toHaveTextContent("1–3 of 7");
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(shownEmails()).toEqual(["person4@team.dev", "person5@team.dev", "person6@team.dev"]);
    expect(screen.getByRole("status")).toHaveTextContent("4–6 of 7");

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(shownEmails()).toEqual(["person7@team.dev"]);
    expect(screen.getByRole("status")).toHaveTextContent("7–7 of 7");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByRole("status")).toHaveTextContent("4–6 of 7");
  });

  it("steps back a page when the last page empties (its last invite was cancelled)", async () => {
    const view = renderWithStore(<PendingInvites projectId="p1" invites={invites(4)} />);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(shownEmails()).toEqual(["person4@team.dev"]);

    view.rerender(<PendingInvites projectId="p1" invites={invites(3)} />);

    expect(shownEmails()).toEqual(["person1@team.dev", "person2@team.dev", "person3@team.dev"]);
    expect(screen.queryByRole("group", { name: "Pending invites pages" })).not.toBeInTheDocument();
  });

  it("keeps the whole email available when it's cut short", () => {
    renderWithStore(<PendingInvites projectId="p1" invites={invites(1)} />);
    expect(screen.getByTitle("person1@team.dev")).toHaveClass("truncate");
  });
});
