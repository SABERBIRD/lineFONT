# Contributing

- **Fonts.** Give each family a subdirectory in `fonts/`. Include the `.lint` file, credits, provenance, license, coverage and a sample. Submit content you can license under CC BY 4.0. Include any required third-party notices. Follow the five complete-or-absent groups in the specification. Contributions containing one free glyph are welcome, as shown by `examples/SingleGlyph.lint`. Run `npm run build` and `npm run font:validate -- path/to/font.lint`.
- **Standard.** Describe the problem, examples and the effect on existing files and readers in an issue or PR. Discuss compatibility and versioning before adopting changes. Specification contributions use CC BY 4.0.
- **Implementation.** Submit focused changes with checks for the affected behavior and update the corresponding documentation. Code contributions use MIT.

The maintainer reviews contributions and CI results before merging.
