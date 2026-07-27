const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

class DuplicateKeyScanner {
  private index = 0;

  constructor(private readonly text: string) {}

  scan(): void {
    this.skipWhitespace();
    this.value();
    this.skipWhitespace();
    if (this.index !== this.text.length) {
      throw new Error("JSON input contains trailing content");
    }
  }

  private value(): void {
    const token = this.text[this.index];
    if (token === "{") {
      this.object();
      return;
    }
    if (token === "[") {
      this.array();
      return;
    }
    if (token === '"') {
      this.string();
      return;
    }
    while (
      this.index < this.text.length &&
      !",]} \t\r\n".includes(this.text[this.index] ?? "")
    ) {
      this.index += 1;
    }
  }

  private object(): void {
    this.index += 1;
    this.skipWhitespace();
    const keys = new Set<string>();
    if (this.text[this.index] === "}") {
      this.index += 1;
      return;
    }
    while (true) {
      const key = this.string();
      if (keys.has(key))
        throw new Error(`JSON input contains duplicate key '${key}'`);
      keys.add(key);
      this.skipWhitespace();
      this.index += 1;
      this.skipWhitespace();
      this.value();
      this.skipWhitespace();
      if (this.text[this.index] === "}") {
        this.index += 1;
        return;
      }
      this.index += 1;
      this.skipWhitespace();
    }
  }

  private array(): void {
    this.index += 1;
    this.skipWhitespace();
    if (this.text[this.index] === "]") {
      this.index += 1;
      return;
    }
    while (true) {
      this.value();
      this.skipWhitespace();
      if (this.text[this.index] === "]") {
        this.index += 1;
        return;
      }
      this.index += 1;
      this.skipWhitespace();
    }
  }

  private string(): string {
    const start = this.index;
    this.index += 1;
    while (this.index < this.text.length) {
      const token = this.text[this.index];
      if (token === '"') {
        this.index += 1;
        return JSON.parse(this.text.slice(start, this.index)) as string;
      }
      if (token === "\\") this.index += 1;
      this.index += 1;
    }
    throw new Error("JSON input contains an unterminated string");
  }

  private skipWhitespace(): void {
    while (
      this.text[this.index] === " " ||
      this.text[this.index] === "\t" ||
      this.text[this.index] === "\r" ||
      this.text[this.index] === "\n"
    ) {
      this.index += 1;
    }
  }
}

export function parseStrictJsonInput(bytes: Uint8Array): unknown {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    throw new Error("JSON input must not contain a UTF-8 BOM");
  }
  let text: string;
  try {
    text = UTF8_DECODER.decode(bytes);
  } catch {
    throw new Error("JSON input must be valid UTF-8");
  }
  if (text.length === 0) throw new Error("JSON input is empty");
  const value = JSON.parse(text) as unknown;
  new DuplicateKeyScanner(text).scan();
  return value;
}
