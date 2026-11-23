# bagLING Ukrainian & English — source specimen

This early single-line vector font specimen was drawn for pattern labels.
The artwork consists of centerline paths.

`glyphs.json` contains SVG path commands and advances for 154 characters,
including uppercase and lowercase Ukrainian and English letters, digits,
technical symbols, the space, curly apostrophe, em dash and semicolon.

The cap top is at y=0, the baseline at y=10 and the lowercase top at y=3.
Descenders reach y=13.5 and marks can rise to y=-2.7. Capital height is
10 font units, so the scale factor for a height of H mm is H/10. Advance
sets the pen displacement to the next character. Kerning is pending.
Letters share a baseline and use straight segments and smooth curves.
Dots are short strokes and bullets are small circles. Paths are unfilled.

Regenerate the vector specimens from the repository root.

```bash
python3 fonts/bagLING-UA-EN/source/generate.py
```

The generator checks the requested character set and whether each pangram
contains the full alphabet. SVGs scale cleanly. The PNGs are Chromium
captures at 3840×2160 with no page zoom. The symbol sheet has no text labels
or letters.

The Ukrainian pangram is «Гей, хлопці, не вспію — на ґанку ваша файна їжа
знищується бурундучком.» The English pangram is “The quick brown fox jumps
over the lazy dog.” Both appear in uppercase and lowercase, with full
alphabets below.

The specimen is for visual review. Check legibility at small physical
sizes, pen performance and spacing before production use.
