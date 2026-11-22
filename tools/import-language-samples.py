#!/usr/bin/env python3
"""Import preview samples from a checkout of github.com/googlefonts/lang."""

import ast
import json
import re
import subprocess
import sys
from pathlib import Path


TECHNICAL_SAMPLES = {
    "en_Latn": "Cut along line A–B. Width 12.5 mm, angle 45°.",
    "uk_Cyrl": "Зігніть деталь Ґ уздовж лінії А–Б. Ширина 12,5 мм, кут 45°.",
    "el_Grek": "Κόψτε κατά μήκος της γραμμής Α–Β. Πλάτος 12,5 mm, γωνία 45°.",
}


def values(source, key):
    return [
        ast.literal_eval(literal)
        for literal in re.findall(rf'^\s*{key}:\s*("(?:[^"\\]|\\.)*")', source, re.M)
    ]


def field(source, key):
    return next(iter(values(source, key)), "")


def block(source, key):
    match = re.search(rf"^{key} \{{\n(.*?)^\}}", source, re.M | re.S)
    return match[1] if match else ""


def alphabet(source):
    exemplars = block(source, "exemplar_chars")
    return " ".join(
        dict.fromkeys(
            grouped or literal
            for key in ("base", "index")
            for grouped, literal in re.findall(
                r"\{([^}]+)\}|([^\s{}]+)", field(exemplars, key)
            )
        )
    )


def import_samples(checkout):
    samples = []
    for filename in (checkout / "Lib/gflanguages/data/languages").glob("*.textproto"):
        source = filename.read_text(encoding="utf-8")
        script = field(source, "script")
        if script not in {"Latn", "Cyrl", "Grek"}:
            continue
        name = field(source, "name")
        autonym = field(source, "autonym")
        phrases = block(source, "sample_text")
        sample = ""
        for key in ("tester", "styles", "specimen_48", "poster_sm"):
            candidate = field(phrases, key).strip()
            if candidate and len(candidate.encode("utf-16-le")) <= 1000:
                sample = candidate
                break
        kind = "phrase"
        if not sample:
            sample = alphabet(source)
            kind = "alphabet"
        if not sample or len(sample.encode("utf-16-le")) > 1000:
            sample = autonym
            kind = "name" if sample else "unavailable"
        if filename.stem in TECHNICAL_SAMPLES:
            sample = TECHNICAL_SAMPLES[filename.stem]
            kind = "technical"
        samples.append({
            "id": filename.stem,
            "script": script,
            "name": name,
            "autonym": autonym,
            "text": sample,
            "kind": kind,
        })
    return sorted(samples, key=lambda item: (item["name"].casefold(), item["id"]))


checkout = Path(sys.argv[1])
revision = subprocess.check_output(
    ["git", "-C", str(checkout), "rev-parse", "HEAD"], text=True
).strip()
samples = import_samples(checkout)
print('{\n  "sourceRevision": ' + json.dumps(revision) + ',\n  "samples": [')
print(",\n".join("    " + json.dumps(item, ensure_ascii=False) for item in samples))
print("  ]\n}")
