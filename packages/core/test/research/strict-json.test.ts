import { describe, expect, it } from "vitest";

import {
  StrictResearchJsonError,
  parseStrictResearchJson,
} from "../../src/research/strict-json.js";

const encode = (value: string): Uint8Array => new TextEncoder().encode(value);

describe("strict Research JSON", () => {
  it("accepts the complete JSON grammar and valid surrogate pairs", () => {
    expect(
      parseStrictResearchJson(
        encode('{"object":{"array":[true,false,null,-1.25e+2]},"emoji":"\\ud83d\\ude00"}'),
      ),
    ).toEqual({
      object: { array: [true, false, null, -125] },
      emoji: "😀",
    });
  });

  it.each([
    ["empty", ""],
    ["comment", '{"a":1}// comment'],
    ["trailing token", '{"a":1} true'],
    ["trailing comma", '{"a":1,}'],
    ["leading zero", '{"a":01}'],
    ["bad fraction", '{"a":1.}'],
    ["bad exponent", '{"a":1e}'],
    ["unpaired high surrogate", '{"a":"\\ud800"}'],
    ["unpaired low surrogate", '{"a":"\\udc00"}'],
    ["bad surrogate pair", '{"a":"\\ud800\\u0041"}'],
    ["invalid escape", '{"a":"\\x20"}'],
  ])("rejects %s", (_label, source) => {
    expect(() => parseStrictResearchJson(encode(source))).toThrow(
      StrictResearchJsonError,
    );
  });

  it.each([
    '{"a":1,"a":2}',
    '{"a":1,"\\u0061":2}',
    '{"😀":1,"\\ud83d\\ude00":2}',
    '{"nested":{"x":1,"x":2}}',
  ])("rejects duplicate decoded keys in %s", (source) => {
    expect(() => parseStrictResearchJson(encode(source))).toThrow(
      /duplicate object key/,
    );
  });

  it("rejects UTF-8 BOM and malformed UTF-8", () => {
    expect(() =>
      parseStrictResearchJson(Uint8Array.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])),
    ).toThrow(/BOM/);
    expect(() =>
      parseStrictResearchJson(Uint8Array.from([0x7b, 0x22, 0x61, 0x22, 0x3a, 0xc3, 0x28, 0x7d])),
    ).toThrow(/UTF-8/);
  });
});
