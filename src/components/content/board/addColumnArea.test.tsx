import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { MyBoardMembership } from "@/models/responses/projectResponses";
import { boardMembership, projectDetail } from "@/test/projectFixtures";
import { renderWithStore } from "@/test/renderWithStore";
import { DEFAULT_MANAGER_PERMISSIONS } from "@/utilities/helpers/permissions";
import { AddColumnArea } from "./addColumnArea";

const render = (me: Partial<MyBoardMembership>) =>
  renderWithStore(<AddColumnArea project={projectDetail({ me: boardMembership(me) })} meId="me" />);

describe("AddColumnArea", () => {
  it("offers the owner Add column", () => {
    render({ role: "OWNER" });
    expect(screen.getByRole("button", { name: "Add column" })).toBeEnabled();
  });

  it("offers a manager with manageColumns Add column", () => {
    render({ role: "MANAGER", permissions: DEFAULT_MANAGER_PERMISSIONS });
    expect(screen.getByRole("button", { name: "Add column" })).toBeEnabled();
  });

  it("shows a member, and a manager without manageColumns, nothing", () => {
    const { container, unmount } = render({ role: "MEMBER" });
    expect(container).toBeEmptyDOMElement();
    unmount();

    const manager = render({ role: "MANAGER", permissions: { ...DEFAULT_MANAGER_PERMISSIONS, manageColumns: false } });
    expect(manager.container).toBeEmptyDOMElement();
  });
});
