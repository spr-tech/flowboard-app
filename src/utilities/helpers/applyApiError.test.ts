import { describe, expect, it, vi } from "vitest";

import { NETWORK_ERROR_MESSAGE } from "@/utilities/constants/errorMessages";
import { applyApiError, isAppError } from "./applyApiError";

type Values = { name: string; colour: string };

describe("applyApiError", () => {
  it("puts field messages on their fields, focusing the first, and returns null", () => {
    const setError = vi.fn();
    const error = {
      status: 400,
      code: "VALIDATION_FAILED",
      message: "Check the form",
      fields: { name: "Too long", colour: "Pick one" },
    };

    expect(applyApiError<Values>(error, ["name", "colour"], setError)).toBeNull();
    expect(setError).toHaveBeenNthCalledWith(1, "name", { message: "Too long" }, { shouldFocus: true });
    expect(setError).toHaveBeenNthCalledWith(2, "colour", { message: "Pick one" }, { shouldFocus: false });
  });

  it("returns the message when no field matches", () => {
    const setError = vi.fn();
    const error = { status: 409, code: "CONFLICT", message: "Already exists" };

    expect(applyApiError<Values>(error, ["name"], setError)).toBe("Already exists");
    expect(setError).not.toHaveBeenCalled();
  });

  it("treats anything that isn't an AppError as a network problem", () => {
    expect(applyApiError<Values>(new Error("boom"), ["name"], vi.fn())).toBe(NETWORK_ERROR_MESSAGE);
    expect(isAppError(new Error("boom"))).toBe(false);
  });
});
