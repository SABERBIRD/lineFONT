import fs from 'node:fs';
const source = JSON.parse(fs.readFileSync('fonts/bagLING-UA-EN/source/glyphs.json', 'utf8'));
const key = (char) => char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
const circle = (x, y, r) => {
  const k = r * 0.5522847498307936;
  return `M${x - r} ${y} C${x - r} ${y - k} ${x - k} ${y - r} ${x} ${y - r} C${x + k} ${y - r} ${x + r} ${y - k} ${x + r} ${y} C${x + r} ${y + k} ${x + k} ${y + r} ${x} ${y + r} C${x - k} ${y + r} ${x - r} ${y + k} ${x - r} ${y}`;
};
function convert(d) {
  const tokens = d.match(/[A-Z]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/g) ?? [];
  let x = 0,
    y = 0;
  const output = [];
  for (let i = 0; i < tokens.length;) {
    const code = tokens[i++];
    const n = () => Number(tokens[i++]);
    if (code === 'M' || code === 'L') {
      x = n();
      y = n();
      output.push(`${code}${x} ${y}`);
    } else if (code === 'H') {
      x = n();
      output.push(`L${x} ${y}`);
    } else if (code === 'V') {
      y = n();
      output.push(`L${x} ${y}`);
    } else if (code === 'C') {
      const v = Array.from({ length: 6 }, n);
      x = v[4];
      y = v[5];
      output.push('C' + v.join(' '));
    } else if (code === 'Q') {
      const cx = n(),
        cy = n(),
        ex = n(),
        ey = n();
      output.push(
        'C' +
          [
            x + ((cx - x) * 2) / 3,
            y + ((cy - y) * 2) / 3,
            ex + ((cx - ex) * 2) / 3,
            ey + ((cy - ey) * 2) / 3,
            ex,
            ey,
          ].join(' ')
      );
      x = ex;
      y = ey;
    } else throw Error(`Unsupported source command ${code}`);
  }
  return output.join(' ');
}
const glyphs = {};
for (const [char, g] of Object.entries(source.glyphs))
  glyphs[key(char)] = {
    advance: g.advance,
    d: char === '•' ? circle(4.4, 5.6, 0.6) : convert(g.path),
  };
const add = (char, d, advance = 10.5) => (glyphs[key(char)] = { d, advance });
const alias = (char, to) => (glyphs[key(char)] = { alias: key(to) });
add('.', circle(2, 9.8, 0.25), 4.8);
add(':', circle(2, 4, 0.25) + ' ' + circle(2, 9.8, 0.25), 4.8);
add(';', circle(2, 4, 0.25) + ' ' + glyphs[key(',')].d, 4.8);
add('…', circle(2, 9.8, 0.25) + ' ' + circle(5, 9.8, 0.25) + ' ' + circle(8, 9.8, 0.25));
add('–', 'M1 5 L8 5', 10);
add('[', 'M7 0 L2 0 L2 10 L7 10', 9);
add(']', 'M2 0 L7 0 L7 10 L2 10', 9);
add('{', 'M7 0 C2 0 5 4 2 5 C5 6 2 10 7 10', 9);
add('}', 'M2 0 C7 0 4 4 7 5 C4 6 7 10 2 10', 9);
add('«', 'M5 2 L1 5 L5 8 M9 2 L5 5 L9 8');
add('»', 'M1 2 L5 5 L1 8 M5 2 L9 5 L5 8');
add('‘', 'M3 0 C1 1 1 2 2 2.8', 4.8);
add('‚', 'M3 9 C3.5 10.6 1.3 11.8 1.3 11.8', 4.8);
add('“', 'M3 0 C1 1 1 2 2 2.8 M7 0 C5 1 5 2 6 2.8', 9);
add('”', 'M3 0 C3.5 1.6 1.3 2.8 1.3 2.8 M7 0 C7.5 1.6 5.3 2.8 5.3 2.8', 9);
add('„', 'M3 9 C3.5 10.6 1.3 11.8 1.3 11.8 M7 9 C7.5 10.6 5.3 11.8 5.3 11.8', 9);
add('−', 'M1 5 L9 5');
add('×', 'M2 1 L8 9 M8 1 L2 9');
add('÷', circle(5, 1.8, 0.25) + ' M1 5 L9 5 ' + circle(5, 8.2, 0.25));
add('<', 'M8 1 L2 5 L8 9');
add('>', 'M2 1 L8 5 L2 9');
add('≤', 'M8 0 L2 4 L8 8 M2 10 L8 10');
add('≥', 'M2 0 L8 4 L2 8 M2 10 L8 10');
add('≠', glyphs[key('=')].d + ' M7 0 L3 10');
add('≈', 'M1 3 C4 0 6 6 9 3 M1 7 C4 4 6 10 9 7');
add('±', 'M1 4 L9 4 M5 0 L5 8 M1 10 L9 10');
add('∓', 'M1 1 L9 1 M1 7 L9 7 M5 3 L5 11');
add('‰', circle(3, 2, 1.3) + ' M1 10 L8 0 ' + circle(7, 8, 1.3) + ' ' + circle(11, 8, 1.3), 14);
add('°', circle(3, 1.5, 1.5), 7);
add('′', 'M4 0 L2 3', 5);
add('″', 'M3 0 L1 3 M7 0 L5 3', 9);
add('⌀', circle(5, 5, 4) + ' M0 11 L10 -1', 12);
alias('ʼ', '’');
add('\u0308', circle(-1.5, -1, 0.25) + ' ' + circle(1.5, -1, 0.25), 0);
glyphs['0308'].attach = { x: 0, y: 0 };
glyphs['0308'].anchors = { top: { x: 0, y: -3 } };
add('\u0306', 'M-2 -2 C-1 0 1 0 2 -2', 0);
glyphs['0306'].attach = { x: 0, y: 0 };
glyphs['0306'].anchors = { top: { x: 0, y: -3 } };
for (const char of 'AEIOUYАЕИІОУаеёиіоуaeiouy') {
  const g = glyphs[key(char)];
  if (g?.d) g.anchors = { top: { x: g.advance / 2, y: char === char.toUpperCase() ? -1 : 2 } };
}
const font = {
  format: 'linefont/1',
  id: 'SABERBIRD/BaglingSingleLine01',
  name: 'bagLING Ukrainian & English',
  license: 'CC-BY-4.0',
  languages: ['uk', 'en'],
  version: '0.3.0',
  family: 'SABERBIRD/BaglingSingleLine01',
  authors: ['SABERBIRD'],
  style: 'upright',
  metrics: { capHeight: 10, baseline: 10, defaultAdvance: 10.5 },
  glyphs,
};
fs.writeFileSync(
  'fonts/bagLING-UA-EN/bagLING-UA-EN.lint',
  JSON.stringify(font, null, 2) + '\n'
);

fs.writeFileSync(
  'bindings/js/bagling-font.mjs',
  'export default ' + JSON.stringify(font) + ';\n'
);
const greekGlyphs = {};
const greek = (char, d, advance = 10.5) => {
  greekGlyphs[key(char)] = {
    d,
    advance,
    anchors: { top: { x: advance / 2, y: char === char.toUpperCase() ? -1 : 2 } },
  };
};
const copy = (char, from) => greek(char, glyphs[key(from)].d, glyphs[key(from)].advance);
for (const [char, from] of Object.entries({
  Α: 'A',
  Β: 'B',
  Γ: 'Г',
  Δ: 'A',
  Ε: 'E',
  Ζ: 'Z',
  Η: 'H',
  Ι: 'I',
  Κ: 'K',
  Μ: 'M',
  Ν: 'N',
  Ο: 'O',
  Ρ: 'P',
  Τ: 'T',
  Υ: 'Y',
  Χ: 'X',
}))
  copy(char, from);
greek('Δ', 'M1 10 L5 0 L9 10 L1 10');
greek('Θ', glyphs[key('O')].d + ' M1 5 L9 5');
greek('Λ', 'M1 10 L5 0 L9 10');
greek('Ξ', 'M1 0 L9 0 M2 5 L8 5 M1 10 L9 10');
greek('Π', 'M1 10 L1 0 L9 0 L9 10');
greek('Σ', 'M9 0 L1 0 L5 5 L1 10 L9 10');
greek('Φ', circle(5, 5, 3.5) + ' M5 0 L5 10');
greek('Ψ', 'M1 0 L1 3 C1 7 9 7 9 3 L9 0 M5 0 L5 10');
greek('Ω', 'M1 10 L4 10 C-2 4 1 0 5 0 C9 0 12 4 6 10 L9 10');
greek('α', 'M8 3 L6 10 C-1 12 -1 2 5 3 C8 3 5 10 9 10');
greek('β', 'M1 13 L1 3 C1 -2 9 -1 7 3 L1 6 C10 2 10 11 1 10');
greek('γ', 'M1 3 C4 1 7 5 5 10 L4 13 M9 3 L5 10');
greek('δ', 'M7 0 C-1 0 8 4 8 7 C8 12 1 12 1 7 C1 2 8 3 8 7');
greek('ε', 'M8 4 C3 0 -1 6 4 6 L7 6 M4 6 C-1 6 2 13 8 9');
greek('ζ', 'M1 1 L8 1 C5 4 0 7 2 9 C4 11 8 9 7 13');
greek('η', 'M1 3 L1 10 M1 5 C4 1 8 2 8 6 L8 13');
greek('θ', 'M8 5 C8 -2 1 -2 1 5 C1 12 8 12 8 5 M1 5 L8 5');
greek('ι', 'M3 3 L3 8 C3 10 4 10 6 9', 7);
copy('κ', 'k');
greek('λ', 'M2 0 C5 0 5 5 9 10 M5 4 L1 10');
greek('μ', 'M1 3 L1 13 M1 7 C1 11 7 11 7 7 L7 3 M7 7 C7 10 8 10 9 10');
greek('ν', 'M1 3 L4 10 C7 8 8 6 9 3');
greek('ξ', 'M7 0 C0 -1 0 5 7 4 M6 4 C0 3 0 9 7 8 M7 8 C10 12 6 14 5 12');
copy('ο', 'o');
greek('π', 'M0 3 L9 3 M2 3 L2 10 M7 3 L7 8 C7 10 8 10 9 10');
copy('ρ', 'p');
greek('σ', 'M9 3 L4 3 C-1 3 0 10 4 10 C8 10 9 5 5 3');
greek('ς', 'M8 3 C0 0 -1 9 5 10 C8 10 8 13 5 13');
greek('τ', 'M0 3 L8 3 M4 3 L4 8 C4 10 6 10 8 9', 9);
copy('υ', 'u');
greek('φ', circle(5, 6.5, 3.5) + ' M5 1 L5 13');
greek('χ', 'M1 3 C4 2 5 13 8 12 M8 3 L1 13');
greek('ψ', 'M1 3 L1 6 C1 11 9 11 9 6 L9 3 M5 1 L5 13');
greek('ω', 'M2 3 C-2 10 5 13 5 6 C5 13 12 10 8 3');
greekGlyphs['0308'] = glyphs['0308'];
greekGlyphs['0301'] = {
  d: 'M-1 -1 L1 -3',
  advance: 0,
  attach: { x: 0, y: 0 },
  anchors: { top: { x: 0, y: -4 } },
};
const greekFont = {
  ...font,
  id: 'SABERBIRD/GreekSingleLine01',
  family: 'SABERBIRD/GreekSingleLine01',
  name: 'bagLING Greek Letters',
  license: 'CC-BY-4.0',
  version: '0.1.0',
  scripts: ['Grek'],
  glyphs: greekGlyphs,
};
fs.writeFileSync(
  'fonts/bagLING-Greek-Letters/bagLING-Greek-Letters.lint',
  JSON.stringify(greekFont, null, 2) + '\n'
);
fs.writeFileSync(
  'bindings/js/greek-font.mjs',
  'export default ' + JSON.stringify(greekFont) + ';\n'
);
