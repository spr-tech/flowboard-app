import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/components/ui/toast/toast";
import type { InviteResponse } from "@/models/responses/memberResponses";
import type { ProjectDetail, ProjectMemberResponse } from "@/models/responses/projectResponses";
import { boardMembership, projectDetail } from "@/test/projectFixtures";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import ProjectSettingsContent from "./projectSettingsContent";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn() }));

const me = {
  id: "demo",
  name: "Alex Morgan",
  email: "demo@example.com",
  image: null,
  hasPassword: true,
  emailVerified: true,
};
const detail = (role: "OWNER" | "MEMBER"): ProjectDetail =>
  projectDetail({ colour: "blue", taskCount: 3, me: boardMembership({ role }) });
const members: ProjectMemberResponse[] = [
  { id: "demo", name: "Alex Morgan", email: "demo@example.com", image: null, role: "OWNER", permissions: null, taskCount: 2 },
  { id: "ada", name: "Ada Obi", email: "ada@team.dev", image: null, role: "MEMBER", permissions: null, taskCount: 3 },
];
const DAY = 24 * 60 * 60 * 1000;
const invites: InviteResponse[] = [
  {
    id: "inv-live",
    email: "bisi@team.dev",
    sentAt: new Date(Date.now() - 2 * DAY).toISOString(),
    expiresAt: new Date(Date.now() + 5 * DAY).toISOString(),
  },
  {
    id: "inv-old",
    email: "kemi@team.dev",
    sentAt: new Date(Date.now() - 9 * DAY).toISOString(),
    expiresAt: new Date(Date.now() - 2 * DAY).toISOString(),
  },
];

/** Answers by URL like the real API; writes go to `onWrite`. */
function mockApi(role: "OWNER" | "MEMBER", onWrite: (request: Request) => Response = () => jsonResponse(500, {})) {
  return mockFetch((request) => {
    const path = new URL(request.url).pathname;
    if (request.method !== "GET") return onWrite(request);
    if (path === "/api/me") return jsonResponse(200, me);
    if (path === "/api/projects/p1/members") return jsonResponse(200, members);
    if (path === "/api/projects/p1/invites") return jsonResponse(200, invites);
    return jsonResponse(200, detail(role));
  });
}

const membersSection = () => screen.getByRole("region", { name: "Members" });

beforeEach(() => vi.clearAllMocks());

describe("ProjectSettingsContent", () => {
  it("while loading: the fixed headings show at once; the project's parts are skeletons after 200ms", async () => {
    // The project answers only when the test says so; everything else at once.
    let answer: (response: Response) => void = () => {};
    mockFetch((request) =>
      request.url.endsWith("/api/projects/p1")
        ? new Promise<Response>((resolve) => (answer = resolve))
        : request.url.endsWith("/members")
          ? jsonResponse(200, members)
          : request.url.endsWith("/invites")
            ? jsonResponse(200, [])
            : jsonResponse(200, me)
    );
    renderWithStore(<ProjectSettingsContent projectId="p1" />);

    for (const name of ["General", "Columns", "Members", "Danger zone"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: "Project settings", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to board" })).toHaveAttribute("href", "/projects/p1");
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Loading project settings");
    expect(status.closest("[aria-busy='true']")).not.toBeNull();
    expect(document.querySelectorAll(".skeleton")).toHaveLength(0);

    await waitFor(() => expect(document.querySelectorAll(".skeleton").length).toBeGreaterThan(20));
    expect(document.querySelectorAll(".skeleton:not([aria-hidden='true'])")).toHaveLength(0);

    answer(jsonResponse(200, detail("OWNER")));
    expect(await screen.findByText("Website relaunch · you're the owner")).toBeInTheDocument();
    expect(document.querySelectorAll(".skeleton")).toHaveLength(0);
    expect(screen.queryByText("Loading project settings")).not.toBeInTheDocument();
  });

  it("gives the owner editable General settings and Delete in the Danger zone", async () => {
    mockApi("OWNER");
    renderWithStore(<ProjectSettingsContent projectId="p1" />);

    expect(await screen.findByText("Website relaunch · you're the owner")).toBeInTheDocument();
    expect(screen.getByLabelText("Project name")).toBeEnabled();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Delete project" }));
    expect(await screen.findByRole("dialog", { name: "Delete this project?" })).toBeInTheDocument();
  });

  it("shows a member read-only settings, the owner-only note, and Leave instead of Delete", async () => {
    mockApi("MEMBER");
    renderWithStore(<ProjectSettingsContent projectId="p1" />);

    expect(await screen.findByText("Website relaunch · you're a member")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Only the owner can change the name");
    expect(screen.getByLabelText("Project name")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Leave project" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete project" })).not.toBeInTheDocument();
  });

  it("says the project wasn't found on a 404", async () => {
    mockFetch(() =>
      jsonResponse(404, { error: { code: "PROJECT_NOT_FOUND", message: "We couldn't find that project." } })
    );
    renderWithStore(<ProjectSettingsContent projectId="nope" />);

    expect(await screen.findByRole("heading", { name: "We couldn't find that project" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to your projects" })).toHaveAttribute("href", "/projects");
  });
});

describe("ProjectSettingsContent: Members", () => {
  it("lists everyone with '(you)', email · tasks and role badges", async () => {
    mockApi("OWNER");
    renderWithStore(<ProjectSettingsContent projectId="p1" />);

    const list = await within(await screen.findByRole("list", { name: "Members" })).findAllByRole("listitem");
    expect(list[0]).toHaveTextContent("Alex Morgan (you)");
    expect(list[0]).toHaveTextContent("demo@example.com · 2 tasks");
    expect(list[0]).toHaveTextContent("Owner");
    expect(list[1]).toHaveTextContent("ada@team.dev · 3 tasks");
    expect(within(list[0]).queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
  });

  it("invites: 'Invite sent to …', or 'sent it again' for a pending one, cleared and ready for the next", async () => {
    let resent = false;
    const fetchMock = mockApi("OWNER", () =>
      jsonResponse(201, { id: "inv9", email: "new@team.dev", sentAt: "", expiresAt: "", resent })
    );
    renderWithStore(<ProjectSettingsContent projectId="p1" />);
    const field = await screen.findByLabelText("Invite by email");

    await userEvent.type(field, "New@Team.dev");
    await userEvent.click(screen.getByRole("button", { name: "Send invite" }));

    expect(await screen.findByText("Invite sent to new@team.dev.")).toBeInTheDocument();
    expect(field).toHaveValue("");
    const write = fetchMock.mock.calls.map(([r]) => r as Request).find((r) => r.method === "POST");
    expect(new URL(write?.url ?? "").pathname).toBe("/api/projects/p1/invites");
    expect(await write?.json()).toEqual({ email: "new@team.dev" });

    resent = true;
    await userEvent.type(field, "new@team.dev");
    await userEvent.click(screen.getByRole("button", { name: "Send invite" }));
    expect(
      await screen.findByText("There was already an invite for new@team.dev, so we sent it again.")
    ).toBeInTheDocument();
  });

  it("invites: shows '<name> is already a member.' and a bad address under the field", async () => {
    const message = "Ada Obi is already a member.";
    mockApi("OWNER", () =>
      jsonResponse(409, { error: { code: "ALREADY_MEMBER", message, fields: { email: message } } })
    );
    renderWithStore(<ProjectSettingsContent projectId="p1" />);
    const field = await screen.findByLabelText("Invite by email");

    await userEvent.click(screen.getByRole("button", { name: "Send invite" }));
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();

    await userEvent.type(field, "ada@team.dev");
    await userEvent.click(screen.getByRole("button", { name: "Send invite" }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(toast).not.toHaveBeenCalled();
  });

  it("removes a member after the inline confirmation, which counts their tasks", async () => {
    const fetchMock = mockApi("OWNER", () =>
      jsonResponse(200, { projectId: "p1", userId: "ada", unassignedTaskCount: 3 })
    );
    renderWithStore(<ProjectSettingsContent projectId="p1" />);

    await userEvent.click(await screen.findByRole("button", { name: "Remove Ada Obi" }));
    const confirm = screen.getByRole("group", { name: "Confirm removing Ada Obi" });
    expect(confirm).toHaveTextContent("Remove Ada? Their 3 tasks will be unassigned.");

    await userEvent.click(within(confirm).getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ type: "success", message: "Ada Obi removed" }));
    const write = fetchMock.mock.calls.map(([r]) => r as Request).find((r) => r.method === "DELETE");
    expect(new URL(write?.url ?? "").pathname).toBe("/api/projects/p1/members/ada");
  });

  it("lists pending invites with how long they last, marks expired ones, and resends and cancels", async () => {
    const fetchMock = mockApi("OWNER", (request) =>
      jsonResponse(200, request.method === "DELETE" ? { id: "inv-live" } : { ...invites[1], resent: true })
    );
    renderWithStore(<ProjectSettingsContent projectId="p1" />);

    const pending = await screen.findByRole("region", { name: "Pending invites" });
    expect(pending).toHaveTextContent("Sent 2 days ago · expires in 5 days");
    expect(within(pending).getByText("Expired. Resend to send a fresh link.")).toHaveClass("text-danger");

    await userEvent.click(within(pending).getByRole("button", { name: "Resend invite to kemi@team.dev" }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({ type: "success", message: "Invite resent to kemi@team.dev" })
    );
    await userEvent.click(within(pending).getByRole("button", { name: "Cancel invite to bisi@team.dev" }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({ type: "success", message: "Invite to bisi@team.dev cancelled" })
    );

    const writes = fetchMock.mock.calls.map(([r]) => r as Request).filter((r) => r.method !== "GET");
    expect(writes.map((r) => `${r.method} ${new URL(r.url).pathname}`)).toEqual([
      "POST /api/invites/inv-old/resend",
      "DELETE /api/invites/inv-live",
    ]);
  });

  it("members see the list only: no invite form, no Remove, no pending invites", async () => {
    const fetchMock = mockApi("MEMBER");
    renderWithStore(<ProjectSettingsContent projectId="p1" />);

    await screen.findByRole("list", { name: "Members" });
    expect(membersSection()).toBeInTheDocument();
    expect(screen.queryByLabelText("Invite by email")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Remove/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Pending invites" })).not.toBeInTheDocument();
    const paths = fetchMock.mock.calls.map(([r]) => new URL((r as Request).url).pathname);
    expect(paths).not.toContain("/api/projects/p1/invites");
  });
});
