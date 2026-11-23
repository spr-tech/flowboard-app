import { describe, expect, it } from "vitest";

import { getPasswordStrength, hasRepetition, hasSimpleSequence, lengthPoints } from "./passwordStrength";

// Points: length (lengthPoints) + one per kind of character beyond the first (lowercase,
// uppercase, digits, symbols), minus 2 for repeats and 1 for a simple sequence.
// Strong from 5 points, Fair from 3. The comments below show each example's sum.

describe("lengthPoints", () => {
  it.each([
    [9, 0],
    [10, 1],
    [11, 1],
    [12, 2],
    [13, 2],
    [14, 3],
    [15, 3],
    [16, 4],
    [40, 4],
  ])("%i characters → %i points", (length, points) => {
    expect(lengthPoints(length)).toBe(points);
  });
});

describe("getPasswordStrength", () => {
  it.each([
    ["", "empty"],
    ["short!", "too short"],
    ["longenoughbutnosymbol", "no special character"],
    ["has<angle>brackets!", "an angle bracket"],
    ["plumtree!!", "10 characters, two kinds: 1 + 1"],
    ["abcdef123!!", "a sequence: 1 + 2 − 1"],
    ["aaaaaaaaaaaa!", "repeats: 2 + 1 − 2"],
    ["qwerty-qwerty", "a keyboard row: 2 + 1 − 1"],
  ])("Weak: %j (%s)", (password) => {
    expect(getPasswordStrength(password)).toBe("weak");
  });

  it.each([
    ["password1!", "10 characters, three kinds: 1 + 2"],
    ["Lagos2024!", "10 characters, all four kinds: 1 + 3"],
    ["Abcdefgh1!", "all four kinds but a sequence: 1 + 3 − 1"],
  ])("Fair: %j (%s)", (password) => {
    expect(getPasswordStrength(password)).toBe("fair");
  });

  it.each([
    ["Tr0ub4dor&3x", "12 characters, all four kinds: 2 + 3"],
    ["Blue#Kettle9", "12 characters, all four kinds: 2 + 3"],
    ["lantern moss river", "a long phrase, lowercase and spaces: 4 + 1"],
    ["Sunset-Harbor-47", "16 characters, all four kinds: 4 + 3"],
    ["correct horse battery staple", "a long passphrase: 4 + 1"],
    ["Mango!Violin+Tide 82", "long and mixed: 4 + 3"],
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
