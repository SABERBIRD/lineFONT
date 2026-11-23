# Contributing

- **Fonts.** Give each family a subdirectory in `fonts/`. Include the `.lint` file, credits, provenance, license, coverage and a sample. The bagLING fonts use CC BY 4.0. Third-party fonts may use their own terms if those terms permit both the conversion and the distribution proposed in the pull request. Record the upstream URL and version or commit, the rights holder, the license or public-domain statement, and any changes made. Include required notices and respect any naming restrictions. Put required license files in `LICENSES/` so they can be included in packages. Follow the five complete-or-absent groups in the specification. Contributions containing one free glyph are welcome, as shown by `examples/SingleGlyph.lint`. Run `npm run build` and `npm run font:validate -- path/to/font.lint`.
- **Standard.** Describe the problem, examples and the effect on existing files and readers in an issue or PR. Discuss compatibility and versioning before adopting changes. Specification contributions use CC BY 4.0.
- **Implementation.** Submit focused changes with checks for the affected behavior and update the corresponding documentation. Code contributions use MIT.

The maintainer reviews contributions and CI results before merging.
