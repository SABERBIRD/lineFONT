"""Exercise an installed wheel in a separate consumer environment."""
from pathlib import Path
import json
import sys

from linefont import Engine, LinefontError


root = Path(sys.argv[1])
suite = json.loads((root / "cases.json").read_text(encoding="utf-8"))
tolerance = suite["geometryTolerance"]


def close(actual, expected):
    assert len(actual) == len(expected), (actual, expected)
    assert all(abs(a - b) <= tolerance for a, b in zip(actual, expected)), (actual, expected)


for case in suite["cases"]:
    engine = Engine.from_files(*(root / file for file in case["fonts"]))
    other = Engine.from_files(root / "fallback.lint")
    request = case["request"]
    def run():
        return engine.layout(request["text"], request["height"],
                             line_height=request["lineHeight"], top=request["top"])
    actual = run()
    other.layout("B", 4)
    assert run() == actual, "Switching documents changed the layout"
    expected = case["expected"]
    assert actual["missing"] == expected["missing"]
    close([caret["x"] for caret in actual["carets"]], expected["caretsX"])
    assert len(actual["glyphs"]) == len(expected["glyphs"])
    for glyph, reference in zip(actual["glyphs"], expected["glyphs"]):
        assert [glyph["start"], glyph["end"]] == reference["range"]
        assert glyph["fontIndex"] == reference["fontIndex"]
        close([glyph["advance"]], [reference["advance"]])
        assert len(glyph["commands"]) == len(reference["commands"])
        for command, reference_command in zip(glyph["commands"], reference["commands"]):
            assert command["code"] == reference_command[0]
            close(command["values"], reference_command[1:])
    try:
        engine.layout("A", -1)
    except LinefontError as error:
        assert error.diagnostic["code"]
    else:
        raise AssertionError("Expected invalid height to raise LinefontError")
    print(case["name"])
