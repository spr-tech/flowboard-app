import type { ReactElement } from "react";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DashboardContent from "@/components/content/dashboard/dashboardContent";
import ProjectsContent from "@/components/content/projects/projectsContent";
import SettingsContent from "@/components/content/settings/settingsContent";
import type { DashboardSummary } from "@/models/responses/dashboardResponses";
import type { MeResponse } from "@/models/responses/meResponses";
import { stubScreenWidth } from "@/test/matchMedia";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { AppShell } from "./appShell";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn(), dismissToast: vi.fn() }));

const me: MeResponse = { id: "u1", name: "Ada Okafor", email: "ada@team.dev", image: null, hasPassword: true };
const newUser: DashboardSummary = {
  firstName: "Ada",
  projectCount: 0,
  assignedOpen: 0,
  assignedProjectCount: 0,
  dueThisWeek: 0,
  overdue: 0,
  oldestOverdueDays: null,
  completedThisWeek: 0,
};

beforeEach(() => {
  stubScreenWidth(1440);
  mockFetch((request) => {
    const path = new URL(request.url).pathname;
    if (path === "/api/me") return jsonResponse(200, me);
    if (path === "/api/dashboard/summary") return jsonResponse(200, newUser);
    return jsonResponse(200, []); // /api/projects and the rest: nothing yet
  });
});

function renderInShell(page: ReactElement) {
  return renderWithStore(<AppShell user={{ name: "Ada Okafor", email: me.email }}>{page}</AppShell>);
}

/** Exact name, so it's the top bar's "Create", not "Create your first project". */
const topBarCreate = () => screen.getByRole("button", { name: "Create" });

async function expectNewProjectDialog() {
  const dialog = await screen.findByRole("dialog", { name: "New project" });
  expect(within(dialog).getByRole("textbox", { name: /name/i })).toBeInTheDocument();
  return dialog;
}

describe("AppShell: the top bar's Create", () => {
  it("opens New project from the dashboard", async () => {
    const { store } = renderInShell(<DashboardContent filter="all" />);
    await screen.findByRole("button", { name: "Create your first project" });

    await userEvent.click(topBarCreate());

    await expectNewProjectDialog();
    expect(store.getState().ui.openDialog).toEqual({ kind: "newProject" });
  });

  it("opens New project from Account settings", async () => {
    renderInShell(<SettingsContent />);
    await screen.findByRole("heading", { name: "Account settings" });

    await userEvent.click(topBarCreate());

    await expectNewProjectDialog();
  });

  it("is one dialog shared with the dashboard's and the projects page's buttons", async () => {
    const dashboard = renderInShell(<DashboardContent filter="all" />);
    await userEvent.click(await screen.findByRole("button", { name: "Create your first project" }));
    const dialog = await expectNewProjectDialog();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    dashboard.unmount();

    renderInShell(<ProjectsContent filter="all" />);
    const [projectsPageButton] = await screen.findAllByRole("button", { name: "New project" });
    await userEvent.click(projectsPageButton);
    expect(await screen.findAllByRole("dialog", { name: "New project" })).toHaveLength(1);
  });
});
