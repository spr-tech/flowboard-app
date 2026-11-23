import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/components/ui/toast/toast";
import type { MyBoardMembership, ProjectMemberResponse } from "@/models/responses/projectResponses";
import { boardMembership, projectDetail } from "@/test/projectFixtures";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { DEFAULT_MANAGER_PERMISSIONS } from "@/utilities/helpers/permissions";
import { MANAGER_LIMIT_REASON } from "./members/memberRow";
import { MembersSection } from "./members/membersSection";
import { TasksSection } from "./tasksSection";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn(), dismissToast: vi.fn() }));

const person = (id: string, role: ProjectMemberResponse["role"], extra: Partial<ProjectMemberResponse> = {}) => ({
  id,
  name: id.charAt(0).toUpperCase() + id.slice(1),
  email: `${id}@team.dev`,
  image: null,
  role,
  permissions: role === "MANAGER" ? DEFAULT_MANAGER_PERMISSIONS : null,
  taskCount: 0,
  ...extra,
});

function renderMembers(members: ProjectMemberResponse[], me: Partial<MyBoardMembership>, meId: string) {
  const fetchMock = mockFetch((request) => {
    const path = new URL(request.url).pathname;
    if (request.method !== "GET") return jsonResponse(200, { projectId: "p1", userId: "x", role: "MANAGER" });
    if (path.endsWith("/members")) return jsonResponse(200, members);
    return jsonResponse(200, []);
  });
  renderWithStore(<MembersSection project={projectDetail({ me: boardMembership(me) })} meId={meId} />);
  return () => fetchMock.mock.calls.map(([r]) => r as Request).filter((r) => r.method !== "GET");
}

describe("Settings › Members: roles", () => {
  beforeEach(() => vi.mocked(toast).mockClear());

  it("the owner promotes a member from the role dropdown", async () => {
    const writes = renderMembers([person("alex", "OWNER"), person("sam", "MEMBER")], { role: "OWNER" }, "alex");

    await userEvent.selectOptions(await screen.findByLabelText("Role for Sam"), "MANAGER");

    await vi.waitFor(() => expect(writes()).toHaveLength(1));
    expect(new URL(writes()[0].url).pathname).toBe("/api/projects/p1/members/sam");
    expect(await writes()[0].json()).toEqual({ role: "MANAGER" });
  });

  it("at 3 managers, Manager is disabled for members, with the reason", async () => {
    renderMembers(
      [
        person("alex", "OWNER"),
        person("kim", "MANAGER"),
        person("lee", "MANAGER"),
        person("max", "MANAGER"),
        person("sam", "MEMBER"),
      ],
      { role: "OWNER" },
      "alex"
    );

    const samRole = await screen.findByLabelText("Role for Sam");
    expect(screen.getAllByRole("option", { name: "Manager" }).at(-1)).toBeDisabled();
    expect(samRole).toHaveAccessibleDescription(MANAGER_LIMIT_REASON);
  });

  it("Permissions opens a manager's switches, each saving on change with a toast", async () => {
    const writes = renderMembers([person("alex", "OWNER"), person("kim", "MANAGER")], { role: "OWNER" }, "alex");

    await userEvent.click(await screen.findByRole("button", { name: "Permissions for Kim" }));
    const deleteAny = screen.getByRole("switch", { name: "Delete any task" });
    expect(deleteAny).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("switch", { name: "Change team task order in columns" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await userEvent.click(deleteAny);

    await vi.waitFor(() => expect(writes()).toHaveLength(1));
    expect(new URL(writes()[0].url).pathname).toBe("/api/projects/p1/members/kim/permissions");
    expect(await writes()[0].json()).toEqual({ deleteAnyTask: true });
    expect(toast).toHaveBeenCalledWith({ type: "success", message: "Permissions saved" });
  });

  it("a manager sees role badges (no dropdowns) and Remove only on members when allowed", async () => {
    renderMembers(
      [person("alex", "OWNER"), person("kim", "MANAGER"), person("lee", "MANAGER"), person("sam", "MEMBER")],
      { role: "MANAGER", permissions: { ...DEFAULT_MANAGER_PERMISSIONS, removeMembers: true } },
      "kim"
    );

    expect(await screen.findAllByText("Manager", { selector: "span" })).toHaveLength(2);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Sam" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Lee" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Alex" })).not.toBeInTheDocument();
    // inviteMembers is on by default: the invite card shows.
    expect(screen.getByText("Invite by email")).toBeInTheDocument();
  });
});

describe("Settings › Tasks", () => {
  beforeEach(() => vi.mocked(toast).mockClear());

  it("the owner sets the take limit; it saves after a pause with a toast", async () => {
    const fetchMock = mockFetch(() => jsonResponse(200, projectDetail({ memberTakeLimit: 8 })));
    renderWithStore(<TasksSection project={projectDetail()} />);

    const field = screen.getByLabelText("Members can take up to");
    await userEvent.clear(field);
    await userEvent.type(field, "8");

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled(), { timeout: 1500 });
    expect(await (fetchMock.mock.calls[0][0] as Request).json()).toEqual({ memberTakeLimit: 8 });
    await vi.waitFor(() => expect(toast).toHaveBeenCalledWith({ type: "success", message: "Task settings saved" }));
  });

  it("refuses a limit outside 1 to 20", async () => {
    renderWithStore(<TasksSection project={projectDetail()} />);
    const field = screen.getByLabelText("Members can take up to");
    await userEvent.clear(field);
    await userEvent.type(field, "21");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a number from 1 to 20");
  });

  it("everyone else reads it", () => {
    renderWithStore(<TasksSection project={projectDetail({ me: boardMembership({ role: "MEMBER" }) })} />);
    expect(screen.getByText(/Members can take up to 5 open tasks at a time/)).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });
});
