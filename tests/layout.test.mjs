import assert from 'node:assert/strict';
import test from 'node:test';
import { layout, rankFonts, validateFonts } from '../dist/index.js';

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
