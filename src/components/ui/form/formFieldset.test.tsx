import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FormFieldset } from "./formFieldset";

function Fields({ disabled, invalid = false }: { disabled: boolean; invalid?: boolean }) {
  return (
    <FormFieldset disabled={disabled}>
      <input aria-label="Name" defaultValue="Ada" />
      <input aria-label="Email" aria-invalid={invalid || undefined} />
      <button type="submit">Save</button>
    </FormFieldset>
  );
}

describe("FormFieldset", () => {
  it("disables every field and button inside while locked, and keeps what was typed", () => {
    const { rerender } = render(<Fields disabled={false} />);
    rerender(<Fields disabled />);

    expect(screen.getByLabelText("Name")).toBeDisabled();
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByLabelText("Name")).toHaveValue("Ada");
  });

  it("gives focus back to the field that had it when it unlocks", () => {
    const { rerender } = render(<Fields disabled={false} />);
    act(() => screen.getByLabelText("Name").focus());
    rerender(<Fields disabled />);
    act(() => screen.getByLabelText("Name").blur()); // what the browser does to a disabled field

    rerender(<Fields disabled={false} />);
    expect(screen.getByLabelText("Name")).toHaveFocus();
  });

  it("focuses the first invalid field instead, when the submit came back with an error", () => {
    const { rerender } = render(<Fields disabled={false} />);
    act(() => screen.getByLabelText("Name").focus());
    rerender(<Fields disabled />);
    act(() => screen.getByLabelText("Name").blur());

    rerender(<Fields disabled={false} invalid />);
    expect(screen.getByLabelText("Email")).toHaveFocus();
  });
});
