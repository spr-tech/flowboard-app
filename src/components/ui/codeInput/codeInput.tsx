"use client";

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

import { cn } from "@/utilities/helpers/cn";

type CodeInputProps = {
  /** How many digits (one box each). */
  length?: number;
  /** Called with the digits typed so far ("12" or "123456") whenever they change. */
  onChange?: (code: string) => void;
  /** Called once all boxes are filled by typing, pasting or autofill. */
  onComplete: (code: string) => void;
  /** The id of the element that names the whole code (for the group's label). */
  labelledBy: string;
  /** The id of a message about the code (an error, say), read out with each box. */
  describedBy?: string;
  isInvalid?: boolean;
  isDisabled?: boolean;
  autoFocus?: boolean;
};

const onlyDigits = (text: string) => text.replace(/\D/g, "");

/**
 * One-time-code boxes. Typing a digit moves to the next box, Backspace on an empty box moves back,
 * the arrow keys move between boxes, and pasting (or the phone's autofill) fills every box at once.
 * The first box has autocomplete="one-time-code", so iOS and Android offer the code from the email.
 * To clear it, give it a new `key`.
 */
export function CodeInput({
  length = 6,
  onChange,
  onComplete,
  labelledBy,
  describedBy,
  isInvalid = false,
  isDisabled = false,
  autoFocus = false,
}: CodeInputProps) {
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length }, () => ""));
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const focusBox = (index: number) => {
    const box = boxes.current[Math.max(0, Math.min(length - 1, index))];
    box?.focus();
    box?.select();
  };

  const update = (next: string[]) => {
    setDigits(next);
    const code = next.join("");
    onChange?.(code);
    if (next.every((digit) => digit !== "")) onComplete(code);
  };

  /** Puts `text`'s digits into the boxes from `start` on, and focuses the box after the last one. */
  const fill = (start: number, text: string) => {
    const incoming = onlyDigits(text).slice(0, length - start).split("");
    if (incoming.length === 0) return;
    const next = [...digits];
    incoming.forEach((digit, offset) => (next[start + offset] = digit));
    update(next);
    focusBox(start + incoming.length);
  };

  const handleChange = (index: number, value: string) => {
    if (value === "") {
      const next = [...digits];
      next[index] = "";
      update(next);
      return;
    }
    const typed = onlyDigits(value);
    if (typed.length === 0) return;
    // Typing into a box that already has a digit (if the cursor wasn't on it): keep the new one,
    // which may land before or after the old one.
    if (typed.length === 2 && digits[index]) {
      fill(index, typed[0] === digits[index] ? typed[1] : typed[0]);
      return;
    }
    // One digit, or several at once (autofill, or a paste the browser handled itself).
    fill(index, typed);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && digits[index] === "" && index > 0) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = "";
      update(next);
      focusBox(index - 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = onlyDigits(event.clipboardData.getData("text"));
    // A whole code fills every box, whichever box had focus.
    fill(pasted.length >= length ? 0 : index, pasted);
  };

  return (
    <div role="group" aria-labelledby={labelledBy} className="flex gap-2 sm:gap-2.5">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            boxes.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          // Room for a pasted or autofilled code; handleChange keeps one digit per box.
          maxLength={length}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          autoFocus={autoFocus && index === 0}
          disabled={isDisabled}
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.target.select()}
          className={cn(
            "h-14 w-full min-w-0 rounded-input border-[1.5px] bg-surface-card text-center font-heading text-2xl font-bold text-fg-primary outline-none sm:h-16",
            "focus-visible:ring-4 focus-visible:ring-focus disabled:opacity-60",
            isInvalid ? "border-danger" : "border-line-strong focus-visible:border-line-focus"
          )}
        />
      ))}
    </div>
  );
}
