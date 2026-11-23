# lineFONT

lineFONT lays out single-line vector fonts for technical drawings, plotters and engraving. Give the engine text, an ordered font stack and a cap height in your units. It returns pen strokes, metrics and caret positions for your application to draw.

| I want to… | Start here |
| --- | --- |
| Use lineFONT in an application | [Install the library and run a JS, Rust or C example](docs/integration.md) |
| Create or contribute a font | [Choose a starter glyph, edit it and validate the font](docs/font-authors.md) |
| View a font | [Generate a printable SVG or an interactive offline HTML preview](docs/preview.md) (0.0.2 checkout) |

## Which version do I need?

| Package | Accepted `.lint` format identifiers | Available features |
| --- | --- | --- |
| [0.0.1 release](https://github.com/SABERBIRD/lineFONT/releases/tag/v0.0.1) | `linefont/1` | Layout with M/L/C strokes, validator, two bundled fonts |
| [0.0.2 release](https://github.com/SABERBIRD/lineFONT/releases/tag/v0.0.2) | `linefont/1`, `linefont/0.0.2` | Also supports Q/T/S/A curves, polyline output, coverage reports and the preview CLI |

A font's own `version` describes the artwork. Its `format` selects the file syntax. [Release notes](RELEASE_NOTES.md) · [Format specification](spec/FORMAT.md) · [Roadmap](ROADMAP.md)

## First layout in JavaScript

Install the released package with Node 22.12 or newer. Run the following JavaScript as an ES module.

```sh
npm install https://github.com/SABERBIRD/lineFONT/releases/download/v0.0.2/saberbird-linefont-0.0.2.tgz
```

```js
import { layout } from "@saberbird/linefont";
import font from "@saberbird/linefont/fonts/bagling-ua-en";

const fonts = [font];
const result = layout(fonts, {
  text: "Ґрунт / Ground",
  height: 4,
  lineHeight: 7.2,
  top: 1.2,
});
console.log(result.glyphs.length, result.missing); // 14 []
```

Each glyph's `commands` contains its placed strokes. The same layout can drive a screen renderer and a vector export. [Runnable example](examples/integration/layout.mjs)

## Fonts and licensing

The [Ukrainian and English font](fonts/bagLING-UA-EN/README.md) and [Greek letters font](fonts/bagLING-Greek-Letters/README.md) were created with AI assistance. Code uses MIT. Specification, documentation, example font and bundled fonts use CC BY 4.0, credited to SABERBIRD. Preserve the credit and license link and indicate changes when redistributing them. [MIT](LICENSE) · [CC BY 4.0](LICENSES/CC-BY-4.0.txt) · [Third-party notices](THIRD_PARTY.txt)
