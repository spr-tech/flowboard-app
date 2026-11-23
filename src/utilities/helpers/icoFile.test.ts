// @vitest-environment node
import { describe, expect, it } from "vitest";

import { packIco } from "./icoFile";

describe("packIco", () => {
  const small = { size: 16, png: new Uint8Array([1, 2, 3]) };
  const large = { size: 256, png: new Uint8Array([4, 5]) };

  it("writes the icon header with the image count", () => {
    const view = new DataView(packIco([small, large]).buffer);
    expect(view.getUint16(0, true)).toBe(0);
    expect(view.getUint16(2, true)).toBe(1);
    expect(view.getUint16(4, true)).toBe(2);
  });

  it("writes one directory entry per image pointing at its bytes", () => {
    const ico = packIco([small, large]);
    const view = new DataView(ico.buffer);
    // First image starts after the header (6) and two entries (32).
    expect(view.getUint8(6)).toBe(16);
    expect(view.getUint32(6 + 8, true)).toBe(3);
    expect(view.getUint32(6 + 12, true)).toBe(38);
    expect([...ico.slice(38, 41)]).toEqual([1, 2, 3]);
    // 256px is written as 0, as the format requires.
    expect(view.getUint8(22)).toBe(0);
    expect(view.getUint32(22 + 12, true)).toBe(41);
    expect([...ico.slice(41)]).toEqual([4, 5]);
  });

  it("refuses an empty list and sizes the format can't hold", () => {
    expect(() => packIco([])).toThrow();
    expect(() => packIco([{ size: 512, png: new Uint8Array() }])).toThrow();
  });
});
