import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { boardMembership, projectDetail } from "@/test/projectFixtures";
import { renderWithStore } from "@/test/renderWithStore";
import { AddColumnArea } from "./addColumnArea";

const render = (role: "OWNER" | "MEMBER", membersCanAddColumns: boolean, memberColumnCount: number) =>
  renderWithStore(
    <AddColumnArea
      project={projectDetail({
        me: boardMembership({ role }),
        columnPermissions: { membersCanAddColumns, memberColumnLimit: 2, memberColumnCount },
      })}
    />
  );

describe("AddColumnArea", () => {
  it("always offers the owner Add column, whatever the switch says", () => {
    render("OWNER", false, 2);
    expect(screen.getByRole("button", { name: "Add column" })).toBeEnabled();
  });

  it("offers a member Add column with the shared usage while under the limit", () => {
    render("MEMBER", true, 1);
    expect(screen.getByRole("button", { name: "Add column" })).toBeEnabled();
    expect(screen.getByText("1 of 2 member columns used")).toBeInTheDocument();
  });

  it("disables it with the limit message once every member slot is used", () => {
    render("MEMBER", true, 2);
    expect(screen.getByRole("button", { name: "+ Add column" })).toBeDisabled();
    expect(screen.getByText("Column limit reached (2 of 2). The owner can raise it.")).toBeInTheDocument();
  });

  it("shows members nothing while the switch is off", () => {
    const { container } = render("MEMBER", false, 0);
    expect(container).toBeEmptyDOMElement();
  });
});
