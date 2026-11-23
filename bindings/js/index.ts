import bytes from './wasm.mjs';
export type LintFont = {
  format: 'linefont/1' | 'linefont/0.0.2';
  id: string;
  name: string;
  version: string;
  authors: string[];
  license?: string;
  style: 'upright' | 'italic';
  metrics: { capHeight: number; baseline: number; defaultAdvance: number };
  glyphs: Record<
    string,
    {
      d?: string;
      advance?: number;
      alias?: string;
      composite?: { code: string; x?: number; y?: number }[];
      anchors?: Record<string, { x: number; y: number }>;
      attach?: { x: number; y: number };
    }
  >;
  [key: string]: unknown;
};
export type Command = { code: 'M' | 'L' | 'C'; values: number[] };
export type Layout = {
  bounds: { x: number; y: number; width: number; height: number };
  glyphs: {
    char: string;
    x: number;
    y: number;
    start: number;
    end: number;
    advance: number;
    fontIndex: number | null;
    style: 'upright' | 'italic';
    line: number;
    commands: Command[];
  }[];
  carets: { x: number; y: number }[];
  width: number;
  height: number;
  lines: number;
  missing: string[];
};
type Exports = {
  memory: WebAssembly.Memory;
  lint_alloc: (size: number) => number;
  lint_free: (pointer: number, size: number) => void;
  lint_request: (pointer: number, size: number) => bigint;
};
const binary = Uint8Array.from(atob(bytes), (char) => char.charCodeAt(0));
const wasm = new WebAssembly.Instance(new WebAssembly.Module(binary)).exports as unknown as Exports;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
function request<T>(value: unknown): T {
  const input = encoder.encode(JSON.stringify(value));
  if (input.length > 16_000_000) throw Error('Linefont request is too large');
  const pointer = wasm.lint_alloc(input.length);
  let outputPointer = 0,
    outputLength = 0;
  try {
    new Uint8Array(wasm.memory.buffer, pointer, input.length).set(input);
    const output = wasm.lint_request(pointer, input.length);
    outputPointer = Number(output & 0xffffffffn);
    outputLength = Number(output >> 32n);
    const response = JSON.parse(
      decoder.decode(new Uint8Array(wasm.memory.buffer, outputPointer, outputLength))
    );
    if (response.error)
      throw Object.assign(Error(response.error), { diagnostic: response.diagnostic });
    return response.ok as T;
  } finally {
    wasm.lint_free(pointer, input.length);
    if (outputPointer) wasm.lint_free(outputPointer, outputLength);
  }
}
let active: readonly LintFont[] | undefined;
export function validateFonts(
  fonts: readonly unknown[]
): { font: LintFont; fingerprint: string }[] {
  active = undefined;
  return request<{ fonts: { font: LintFont; fingerprint: string }[] }>({ op: 'fonts', fonts })
    .fonts;
}
function activate(fonts: readonly LintFont[]) {
  if (active === fonts) return;
  request({ op: 'fonts', fonts });
  active = fonts;
}
export function layout(
  fonts: readonly LintFont[],
  options: {
    text: string;
    height: number;
    lineHeight: number;
    top: number;
    tolerance?: number;
    output?: 'beziers' | 'lines';
    wrapWidth?: number;
    letterSpacing?: number;
    style?: 'upright' | 'italic';
    alignment?: 'left' | 'center' | 'right' | 'justify';
    styleRuns?: { start: number; end: number; style: 'upright' | 'italic' }[];
  }
): Layout {
  activate(fonts);
  return request({ op: 'layout', ...options });
}
export function rankFonts(fonts: readonly LintFont[], text: string): LintFont[] {
  activate(fonts);
  return request<number[]>({ op: 'rank', text }).map((index) => fonts[index]);
}
export function parseFont(source: string): LintFont {
  const byteLimit = 8_000_000;
  if (
    source.length > byteLimit ||
    (source.length * 3 > byteLimit && encoder.encode(source).length > byteLimit)
  ) {
    throw Error('Font file is too large');
  }
  let data: unknown;
  try {
    data = JSON.parse(source);
  } catch (error) {
    throw Object.assign(error as SyntaxError, {
      diagnostic: {
        code: 'invalid_json',
        path: '',
        glyph: null,
        commandIndex: null,
        message: String(error),
      },
    });
  }
  return validateFonts([data])[0].font;
}

export function inkBounds(commands: readonly Command[]): Layout['bounds'] | null {
  return request({ op: 'inkBounds', commands });
}
export function coverage(
  fonts: readonly LintFont[],
  text: string
): Record<
  string,
  { kind: 'direct' | 'alias' | 'composite' | 'composed' | 'missing'; fontIndex: number | null }
> {
  activate(fonts);
  return request({ op: 'coverage', text });
}

/** Convert the whole font, using a maximum error in the font's native units. */
export function convertFont(
  font: LintFont,
  options: { output: 'lines' | 'beziers'; tolerance: number }
): LintFont {
  return request({ op: 'convert', font, ...options });
}

/** Convert SVG path data and ancestor transforms to centerline commands. */
export function importSvgPaths(paths: { d: string; transforms: string[] }[]) {
  return request<{ commands: Command[]; approximated: boolean }>({ op: 'importSvgPaths', paths });
}

/** Expand explicit glyph references while preserving effective metrics. */
export function flattenFont(font: LintFont) {
  return request<LintFont>({ op: 'flattenFont', font });
}
