import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CodeInput } from "./codeInput";

function setup() {
  const onComplete = vi.fn();
  const onChange = vi.fn();
  render(
    <>
      <p id="label">Your code</p>
      <CodeInput labelledBy="label" onComplete={onComplete} onChange={onChange} />
    </>
  );
  const boxes = screen.getAllByRole("textbox");
  return { boxes, onComplete, onChange };
}

describe("CodeInput", () => {
  it("has six numeric boxes in a labelled group, the first offering the emailed code", () => {
    const { boxes } = setup();

    expect(screen.getByRole("group", { name: "Your code" })).toBeInTheDocument();
    expect(boxes).toHaveLength(6);
    for (const box of boxes) expect(box).toHaveAttribute("inputmode", "numeric");
    expect(boxes[0]).toHaveAttribute("autocomplete", "one-time-code");
    expect(boxes[1]).toHaveAttribute("autocomplete", "off");
    expect(boxes[2]).toHaveAccessibleName("Digit 3 of 6");
  });

  it("moves to the next box as each digit is typed, and submits on the sixth", async () => {
    const { boxes, onComplete } = setup();

    await userEvent.click(boxes[0]);
    await userEvent.keyboard("12345");
    expect(boxes[5]).toHaveFocus();
    expect(onComplete).not.toHaveBeenCalled();

    await userEvent.keyboard("6");
    expect(boxes.map((box) => (box as HTMLInputElement).value).join("")).toBe("123456");
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("ignores letters and other characters", async () => {
    const { boxes, onChange } = setup();

    await userEvent.click(boxes[0]);
    await userEvent.keyboard("a-");
    expect(boxes[0]).toHaveValue("");
    expect(boxes[0]).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Backspace clears a box, then on an empty box moves back and clears that one", async () => {
    const { boxes, onChange } = setup();
    await userEvent.click(boxes[0]);
    await userEvent.keyboard("123");
    expect(boxes[3]).toHaveFocus();

    await userEvent.keyboard("{Backspace}");
    expect(boxes[2]).toHaveFocus();
    expect(boxes[2]).toHaveValue("");
    expect(onChange).toHaveBeenLastCalledWith("12");

    await userEvent.keyboard("{Backspace}");
    expect(boxes[1]).toHaveFocus();
    expect(boxes[1]).toHaveValue("");
  });

  it("pasting a whole code fills every box, whichever box has focus, and submits", async () => {
    const { boxes, onComplete } = setup();

    await userEvent.click(boxes[3]);
    await userEvent.paste("Your code: 482 913");

    expect(boxes.map((box) => (box as HTMLInputElement).value)).toEqual(["4", "8", "2", "9", "1", "3"]);
    expect(onComplete).toHaveBeenCalledWith("482913");
    expect(boxes[5]).toHaveFocus();
  });

  it("pasting a few digits fills from the focused box on", async () => {
    const { boxes, onComplete } = setup();

    await userEvent.click(boxes[2]);
    await userEvent.paste("78");

    expect(boxes.map((box) => (box as HTMLInputElement).value)).toEqual(["", "", "7", "8", "", ""]);
    expect(boxes[4]).toHaveFocus();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("takes a whole code typed into the first box at once (the phone's autofill)", async () => {
    const { boxes, onComplete } = setup();

    // Autofill sets the first box's value in one go, as a change event.
    await userEvent.click(boxes[0]);
    fireEvent.change(boxes[0], { target: { value: "135790" } });

    expect(boxes.map((box) => (box as HTMLInputElement).value).join("")).toBe("135790");
    expect(onComplete).toHaveBeenCalledWith("135790");
  });

  it("moves between boxes with the arrow keys", async () => {
    const { boxes } = setup();

    await userEvent.click(boxes[2]);
    await userEvent.keyboard("{ArrowRight}");
    expect(boxes[3]).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(boxes[1]).toHaveFocus();
  });
});
