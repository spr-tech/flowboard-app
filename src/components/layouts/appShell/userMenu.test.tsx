import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { UserMenu } from "./userMenu";

const sessionUser = { name: "Name From Session", email: "demo@example.com", imageUrl: null };

describe("UserMenu", () => {
  it("shows the name from GET /api/me once it arrives", async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse(200, { id: "u1", name: "Demo From Api", email: "demo@example.com", image: null, hasPassword: true }),
    );
    renderWithStore(<UserMenu user={sessionUser} />);

    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));

    expect(await screen.findByText("Demo From Api")).toBeInTheDocument();
    expect(new URL((fetchMock.mock.calls[0][0] as Request).url).pathname).toBe("/api/me");
  });

  it("shows the session's name until /api/me answers", async () => {
    mockFetch(() => new Promise<Response>(() => undefined)); // never answers
    renderWithStore(<UserMenu user={sessionUser} />);

    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));

    expect(await screen.findByText("Name From Session")).toBeInTheDocument();
  });

  it("asks for /api/me once, however many components want it", async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse(200, { id: "u1", name: "Demo", email: "demo@example.com", image: null, hasPassword: true }),
    );
    renderWithStore(
      <>
        <UserMenu user={sessionUser} />
        <UserMenu user={sessionUser} />
      </>,
    );

    await screen.findAllByRole("button", { name: "Account menu" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
