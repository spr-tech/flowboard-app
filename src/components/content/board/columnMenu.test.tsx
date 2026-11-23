import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ColumnMenu } from "./columnMenu";

function openMenu(props: Partial<Parameters<typeof ColumnMenu>[0]> = {}) {
  const handlers = { onRename: vi.fn(), onSetDone: vi.fn(), onDelete: vi.fn() };
  render(
    <ColumnMenu
      columnName="In progress"
      addedBy="Sam Rivera"
      addedAt="2026-11-20T10:00:00.000Z"
      isDone={false}
      isLastColumn={false}
      canRename
      isOwner
      {...handlers}
      {...props}
    />
  );
  return {
    handlers,
    open: () => userEvent.click(screen.getByRole("button", { name: "Column options for In progress" })),
  };
}

describe("ColumnMenu", () => {
  it("offers Rename, Set as done column and Delete column", async () => {
    const { handlers, open } = openMenu();
    await open();

    await userEvent.click(screen.getByRole("menuitem", { name: "Set as done column" }));
    expect(handlers.onSetDone).toHaveBeenCalled();
  });

  it("shows every member who added the column; members get Rename only on their own", async () => {
    const { open } = openMenu({ isOwner: false, canRename: true });
    await open();

    expect(screen.getByText("Added by Sam Rivera · 20 Nov 2026")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Rename" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Set as done column" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Delete column" })).not.toBeInTheDocument();
  });

  it("gives a member nothing but the label on a column someone else added", async () => {
    const { open } = openMenu({ isOwner: false, canRename: false });
    await open();

    expect(screen.getByText(/Added by Sam Rivera/)).toBeInTheDocument();
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
  });

  it("leaves out Set as done on the done column", async () => {
    const { open } = openMenu({ isDone: true });
    await open();

    expect(screen.getByRole("menuitem", { name: "Rename" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Set as done column" })).not.toBeInTheDocument();
  });

  it("explains instead of offering Delete on the last column", async () => {
    const { open } = openMenu({ isLastColumn: true });
    await open();

    expect(screen.queryByRole("menuitem", { name: "Delete column" })).not.toBeInTheDocument();
    expect(screen.getByText("A board needs at least one column.")).toBeInTheDocument();
  });
});
