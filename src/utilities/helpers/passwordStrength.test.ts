import { describe, expect, it } from "vitest";

import { getPasswordStrength, hasRepetition, hasSimpleSequence } from "./passwordStrength";

describe("getPasswordStrength", () => {
  it.each([
    ["", "empty"],
    ["short!", "too short"],
    ["longenoughbutnosymbol", "no special character"],
    ["has<angle>brackets!", "an angle bracket"],
    ["password1!", "short, two kinds of character"],
    ["abcdef123!!", "sequences"],
    ["aaaaaaaaaaaa!", "repeats"],
    ["qwerty-qwerty", "a keyboard row"],
  ])("Weak: %j (%s)", (password) => {
    expect(getPasswordStrength(password)).toBe("weak");
  });

  it.each([
    ["Tr0ub4dor&3x", "12 characters, all four kinds"],
    ["Blue#Kettle9", "12 characters, mixed"],
    ["lantern moss river", "a long phrase, lowercase and spaces"],
  ])("Fair: %j (%s)", (password) => {
    expect(getPasswordStrength(password)).toBe("fair");
  });

  it.each([
    ["Sunset-Harbor-47", "16 characters, all four kinds"],
    ["correct horse battery staple", "a long passphrase"],
    ["Mango!Violin+Tide 82", "long and mixed"],
  ])("Strong: %j (%s)", (password) => {
    expect(getPasswordStrength(password)).toBe("strong");
  });

  it("is Weak when the password contains the person's name or email, however strong otherwise", () => {
    const who = { name: "Ada Okafor", email: "ada.okafor@team.dev" };

    expect(getPasswordStrength("Mango!Violin+Tide 82")).toBe("strong");
    expect(getPasswordStrength("Mango!Okafor+Tide 82", who)).toBe("weak");
    expect(getPasswordStrength("ada.okafor Violin+82", who)).toBe("weak");
  });
});

describe("the penalties", () => {
  it("spots simple sequences forwards and backwards, in any case", () => {
    for (const text of ["xxABCx", "x321x", "QWErty", "lkj", "xyz"]) expect(hasSimpleSequence(text)).toBe(true);
    for (const text of ["acegik", "Blue#Kettle9", "13579"]) expect(hasSimpleSequence(text)).toBe(false);
  });

  it("spots the same character three times in a row, or too few different characters", () => {
    for (const text of ["paaass", "!!!", "abababab"]) expect(hasRepetition(text)).toBe(true);
    for (const text of ["aabbcc d", "Blue#Kettle9"]) expect(hasRepetition(text)).toBe(false);
  });
});
