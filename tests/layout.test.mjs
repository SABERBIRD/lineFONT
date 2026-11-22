import assert from 'node:assert/strict';
import test from 'node:test';
import { layout, parseFont, rankFonts, validateFonts } from '../dist/index.js';

function font(glyphs) {
  return {
    format: 'linefont/1', id: 'test/font', name: 'Test', version: '1', authors: ['Test'],
    style: 'upright', metrics: { capHeight: 10, baseline: 10, defaultAdvance: 8 }, glyphs,
  };
}
const stroke = { d: 'M0 0 L0 10' };
const options = { height: 10, lineHeight: 18, top: 3 };

test('validates atomic blocks and aliases', () => {
  assert.throws(() => validateFonts([font({ '0033': stroke })]), /digits/);
  assert.throws(() => validateFonts([font({ '0041': { alias: '0041' } })]), /Cyclic/);
  assert.equal(validateFonts([font({ '0490': stroke })]).length, 1);
});

test('fallback and ranking preserve distinct fonts with equal IDs', () => {
  const a = font({ '0041': stroke });
  const b = font({ '0042': stroke, '0043': stroke });
  const [first, second] = validateFonts([a, b]);
  assert.notEqual(first.fingerprint, second.fingerprint);
  assert.deepEqual(rankFonts([a, b], 'ABC'), [b, a]);
  assert.deepEqual(rankFonts([a, b], 'AB'), [a, b]);
  assert.deepEqual(layout([a, b], { ...options, text: 'ABC' }).glyphs.map(g => g.fontIndex), [0, 1, 1]);
});

test('composes diacritics within one font and keeps UTF-16 ranges', () => {
  const base = font({ '0406': { ...stroke, anchors: { top: { x: 2, y: -1 } } } });
  const mark = font({ '0308': { d: 'M-1 -1 L1 -1', advance: 0, attach: { x: 0, y: 0 } } });
  const combined = font({ ...base.glyphs, ...mark.glyphs, '0020': { d: '', advance: 4 } });
  const value = 'Ї Ї 😀';
  const result = layout([combined], { ...options, text: value });
  assert.equal(result.glyphs[0].commands.length, 4);
  assert.equal(result.glyphs[2].start, 2);
  assert.equal(result.glyphs[2].end, 4);
  assert.equal(result.carets.length, value.length + 1);
  assert.deepEqual(result.missing, ['😀']);
  assert.deepEqual(layout([base, mark], { ...options, text: 'Ї' }).missing, ['Ї']);
});

test('contains italic overhang and wraps within the requested width', () => {
  const fixture = font({ '0041': { d: 'M-1 -2 L9 0 L9 10', advance: 8 } });
  for (const alignment of ['left', 'center', 'right', 'justify']) {
    const result = layout([fixture], { ...options, text: 'A A AAAAA', wrapWidth: 18, alignment, style: 'italic' });
    assert.ok(result.lines > 1);
    assert.ok(result.bounds.x >= -1e-9);
    assert.ok(result.bounds.x + result.bounds.width <= 18 + 1e-9);
  }
});

test('repeated occurrences affect ranking without changing manual priority', () => {
  const a = font({ '0041': stroke });
  const bc = font({ '0042': stroke, '0043': stroke });
  assert.deepEqual(rankFonts([bc, a], 'AAAABC'), [a, bc]);
  assert.deepEqual(layout([bc, a], { ...options, text: 'AAAABC' }).glyphs.map(g => g.fontIndex),
    [1, 1, 1, 1, 0, 0]);
});

test('italic runs use a family variant or shear around the baseline', () => {
  const plain = { ...font({ '0041': stroke }), family: 'example' };
  const italic = { ...plain, style: 'italic', glyphs: { '0041': { d: 'M3 0 L0 10' } } };
  const request = { ...options, text: 'AA', styleRuns: [{ start: 1, end: 2, style: 'italic' }] };
  const [first, second] = layout([plain, italic], request).glyphs;
  assert.equal(first.fontIndex, 0);
  assert.equal(second.fontIndex, 1);
  assert.deepEqual(second.commands.map(c => c.values), [[second.x + 3, 3], [second.x, 13]]);
  const synthesized = layout([plain], request).glyphs[1];
  assert.ok(Math.abs(synthesized.commands[0].values[0] - synthesized.x - 10 * Math.tan(Math.PI / 12)) < 1e-8);
  assert.deepEqual(synthesized.commands[1].values, [synthesized.x, 13]);
});

test('alignment moves carets with ink and justification respects explicit line breaks', () => {
  const stack = [font({ '0041': stroke, '0020': { d: '', advance: 4 } })];
  for (const [alignment, x] of [['center', 11], ['right', 22]]) {
    const r = layout(stack, { ...options, alignment, text: 'A', wrapWidth: 30 });
    assert.equal(r.glyphs[0].commands[0].values[0], x);
    assert.equal(r.carets[0].x, x);
  }
  const request = { ...options, alignment: 'justify', wrapWidth: 30 };
  const wrapped = layout(stack, { ...request, text: 'A A A A' });
  const last = wrapped.glyphs.filter(g => g.line === 0 && g.char === 'A').at(-1);
  assert.equal(last.x + last.advance, 30);
  const manual = layout(stack, { ...request, text: 'A A\r\nA A' });
  assert.deepEqual(manual.glyphs.filter(g => g.char === 'A').map(g => [g.start, g.x]), [[0, 0], [2, 12], [4, 0], [6, 12]]);
});

test('the import limit counts UTF-8 bytes for non-ASCII font metadata', () => {
  const source = JSON.stringify({ ...font({ '0041': stroke }), 'x-description': 'Ґ'.repeat(4_000_000) });
  assert.ok(source.length < 8_000_000);
  assert.throws(() => parseFont(source), /Font file is too large/);
});
