import { toast as sonnerToast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "./toast";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), dismiss: vi.fn() } }));

type SonnerOptions = {
  id: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
  onAutoClose?: () => void;
  onDismiss?: () => void;
};
const lastOptions = () => vi.mocked(sonnerToast.success).mock.calls.at(-1)?.[1] as SonnerOptions;

describe("toast", () => {
  beforeEach(() => vi.mocked(sonnerToast.success).mockClear());

  it("defaults the id to type and message, so repeats replace each other", () => {
    toast({ type: "success", message: "Saved" });
    expect(lastOptions()).toEqual({ id: "success:Saved" });
  });

  it("calls onClose once when the toast times out or is dismissed", () => {
    const onClose = vi.fn();
    toast({ type: "success", message: "Task deleted", duration: 5000, onClose });

    lastOptions().onAutoClose?.();
    lastOptions().onDismiss?.();

    expect(lastOptions().duration).toBe(5000);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("doesn't call onClose after the action was clicked", () => {
    const onClose = vi.fn();
    const onUndo = vi.fn();
    toast({ type: "success", message: "Task deleted", action: { label: "Undo", onClick: onUndo }, onClose });

    lastOptions().action?.onClick();
    lastOptions().onDismiss?.(); // Sonner dismisses the toast after its action

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
