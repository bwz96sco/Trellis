const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

export class StrictResearchJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StrictResearchJsonError";
  }
}

class JsonScanner {
  private index = 0;

  constructor(private readonly text: string) {}

  scan(): void {
    this.skipWhitespace();
    this.scanValue();
    this.skipWhitespace();
    if (this.index !== this.text.length) {
      this.fail("unexpected trailing content");
    }
  }

  private scanValue(): void {
    const character = this.text[this.index];
    if (character === "{") {
      this.scanObject();
      return;
    }
    if (character === "[") {
      this.scanArray();
      return;
    }
    if (character === '"') {
      this.scanString();
      return;
    }
    if (character === "t") {
      this.scanLiteral("true");
      return;
    }
    if (character === "f") {
      this.scanLiteral("false");
      return;
    }
    if (character === "n") {
      this.scanLiteral("null");
      return;
    }
    if (character === "-" || isDigit(character)) {
      this.scanNumber();
      return;
    }
    this.fail("expected a JSON value");
  }

  private scanObject(): void {
    this.index += 1;
    this.skipWhitespace();
    const keys = new Set<string>();
    if (this.text[this.index] === "}") {
      this.index += 1;
      return;
    }

    while (true) {
      if (this.text[this.index] !== '"') {
        this.fail("expected an object key");
      }
      const key = this.scanString();
      if (keys.has(key)) {
        this.fail(`duplicate object key ${JSON.stringify(key)}`);
      }
      keys.add(key);
      this.skipWhitespace();
      this.expect(":");
      this.skipWhitespace();
      this.scanValue();
      this.skipWhitespace();
      const delimiter = this.text[this.index];
      if (delimiter === "}") {
        this.index += 1;
        return;
      }
      if (delimiter !== ",") {
        this.fail("expected ',' or '}' in object");
      }
      this.index += 1;
      this.skipWhitespace();
    }
  }

  private scanArray(): void {
    this.index += 1;
    this.skipWhitespace();
    if (this.text[this.index] === "]") {
      this.index += 1;
      return;
    }

    while (true) {
      this.scanValue();
      this.skipWhitespace();
      const delimiter = this.text[this.index];
      if (delimiter === "]") {
        this.index += 1;
        return;
      }
      if (delimiter !== ",") {
        this.fail("expected ',' or ']' in array");
      }
      this.index += 1;
      this.skipWhitespace();
    }
  }

  private scanString(): string {
    const start = this.index;
    this.index += 1;
    while (this.index < this.text.length) {
      const character = this.text[this.index];
      if (character === '"') {
        this.index += 1;
        return JSON.parse(this.text.slice(start, this.index)) as string;
      }
      if (character === "\\") {
        this.index += 1;
        this.scanEscape();
        continue;
      }
      const code = this.text.charCodeAt(this.index);
      if (code <= 0x1f) {
        this.fail("unescaped control character in string");
      }
      if (code >= 0xd800 && code <= 0xdfff) {
        if (
          code > 0xdbff ||
          this.index + 1 >= this.text.length ||
          this.text.charCodeAt(this.index + 1) < 0xdc00 ||
          this.text.charCodeAt(this.index + 1) > 0xdfff
        ) {
          this.fail("unpaired Unicode surrogate in string");
        }
        this.index += 2;
        continue;
      }
      this.index += 1;
    }
    this.fail("unterminated string");
  }

  private scanEscape(): void {
    const escape = this.text[this.index];
    if (
      escape === '"' ||
      escape === "\\" ||
      escape === "/" ||
      escape === "b" ||
      escape === "f" ||
      escape === "n" ||
      escape === "r" ||
      escape === "t"
    ) {
      this.index += 1;
      return;
    }
    if (escape !== "u") {
      this.fail("invalid string escape");
    }
    const first = this.readUnicodeEscape();
    if (first >= 0xd800 && first <= 0xdbff) {
      if (this.text[this.index] !== "\\" || this.text[this.index + 1] !== "u") {
        this.fail("unpaired Unicode surrogate escape");
      }
      this.index += 1;
      const second = this.readUnicodeEscape();
      if (second < 0xdc00 || second > 0xdfff) {
        this.fail("invalid Unicode surrogate pair");
      }
      return;
    }
    if (first >= 0xdc00 && first <= 0xdfff) {
      this.fail("unpaired Unicode surrogate escape");
    }
  }

  private readUnicodeEscape(): number {
    if (this.text[this.index] !== "u") {
      this.fail("invalid Unicode escape");
    }
    const hexadecimal = this.text.slice(this.index + 1, this.index + 5);
    if (!/^[0-9a-fA-F]{4}$/.test(hexadecimal)) {
      this.fail("invalid Unicode escape");
    }
    this.index += 5;
    return Number.parseInt(hexadecimal, 16);
  }

  private scanNumber(): void {
    if (this.text[this.index] === "-") this.index += 1;
    if (this.text[this.index] === "0") {
      this.index += 1;
      if (isDigit(this.text[this.index])) this.fail("leading zero in number");
    } else {
      if (!isNonZeroDigit(this.text[this.index])) this.fail("invalid number");
      while (isDigit(this.text[this.index])) this.index += 1;
    }
    if (this.text[this.index] === ".") {
      this.index += 1;
      if (!isDigit(this.text[this.index])) this.fail("invalid number fraction");
      while (isDigit(this.text[this.index])) this.index += 1;
    }
    if (this.text[this.index] === "e" || this.text[this.index] === "E") {
      this.index += 1;
      if (this.text[this.index] === "+" || this.text[this.index] === "-") {
        this.index += 1;
      }
      if (!isDigit(this.text[this.index])) this.fail("invalid number exponent");
      while (isDigit(this.text[this.index])) this.index += 1;
    }
  }

  private scanLiteral(literal: string): void {
    if (this.text.slice(this.index, this.index + literal.length) !== literal) {
      this.fail(`expected '${literal}'`);
    }
    this.index += literal.length;
  }

  private skipWhitespace(): void {
    while (
      this.text[this.index] === " " ||
      this.text[this.index] === "\t" ||
      this.text[this.index] === "\n" ||
      this.text[this.index] === "\r"
    ) {
      this.index += 1;
    }
  }

  private expect(character: string): void {
    if (this.text[this.index] !== character) {
      this.fail(`expected '${character}'`);
    }
    this.index += 1;
  }

  private fail(message: string): never {
    throw new StrictResearchJsonError(`${message} at character ${this.index + 1}`);
  }
}

function isDigit(value: string | undefined): boolean {
  return value !== undefined && value >= "0" && value <= "9";
}

function isNonZeroDigit(value: string | undefined): boolean {
  return value !== undefined && value >= "1" && value <= "9";
}

export function decodeStrictResearchUtf8(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new StrictResearchJsonError("UTF-8 BOM is not allowed");
  }
  try {
    return UTF8_DECODER.decode(new Uint8Array(bytes));
  } catch {
    throw new StrictResearchJsonError("input is not valid UTF-8");
  }
}

export function parseStrictResearchJson(bytes: Uint8Array): unknown {
  const text = decodeStrictResearchUtf8(bytes);
  if (text.length === 0) {
    throw new StrictResearchJsonError("JSON input is empty");
  }
  new JsonScanner(text).scan();
  return JSON.parse(text) as unknown;
}
