# Working on lineFONT

| Task | Start here |
| --- | --- |
| Embed the library or add a language binding | [Integration skill](.agents/skills/linefont-integration/SKILL.md) |
| Change layout, metrics or geometry | [Rust core](core/src/lib.rs), [format contract](spec/FORMAT.md), [reference cases](examples/conformance/README.md) |
| Edit a bundled font | [Font author guide](docs/font-authors.md) and the family's README in `fonts/`. bagLING is part of the bundled fonts' names. |
| Work on the offline viewer | [Preview guide](docs/preview.md), [CLI entry point](tools/preview-linefont.mjs), [browser tests](tests/browser/preview.test.mjs) |

Check [README](README.md) for released and development features and [ROADMAP](ROADMAP.md) for planned work.
