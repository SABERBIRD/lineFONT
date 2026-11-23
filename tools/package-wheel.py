"""Build a platform wheel from the already compiled C ABI library."""
import base64
import hashlib
import json
from pathlib import Path
import sys
from zipfile import ZIP_DEFLATED, ZipFile

root, library, destination = map(Path, sys.argv[1:])
version = json.loads((root / "package.json").read_text())["version"]
distribution = f"linefont-{version}"
info = f"{distribution}.dist-info"
tag = "py3-none-linux_x86_64"
files = {
    "linefont/__init__.py": (root / "bindings/python/linefont/__init__.py").read_bytes(),
    "linefont/liblinefont.so": library.read_bytes(),
    f"{info}/licenses/LICENSE": (root / "LICENSE").read_bytes(),
    f"{info}/licenses/THIRD_PARTY.txt": (root / "THIRD_PARTY.txt").read_bytes(),
    f"{info}/METADATA": (
        f"Metadata-Version: 2.4\nName: linefont\nVersion: {version}\n"
        "Summary: Single-line vector font layout\nRequires-Python: >=3.9\n"
        "License-Expression: MIT\nLicense-File: LICENSE\nLicense-File: THIRD_PARTY.txt\n"
    ).encode(),
    f"{info}/WHEEL": f"Wheel-Version: 1.0\nRoot-Is-Purelib: false\nTag: {tag}\n".encode(),
}
record = []
with ZipFile(destination / f"{distribution}-{tag}.whl", "w", ZIP_DEFLATED) as wheel:
    for name, data in files.items():
        wheel.writestr(name, data)
        digest = base64.urlsafe_b64encode(hashlib.sha256(data).digest()).decode().rstrip("=")
        record.append(f"{name},sha256={digest},{len(data)}")
    wheel.writestr(f"{info}/RECORD", "\n".join([*record, f"{info}/RECORD,,", ""]))
