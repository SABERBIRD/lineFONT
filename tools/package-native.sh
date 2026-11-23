#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
destination=$(realpath -m "${1:?Pass the destination directory}")
platform=$(uname -s)-$(uname -m)
if [[ "$platform" != Linux-x86_64 ]]; then
  echo "Packaging is supported on glibc Linux x86-64." >&2
  exit 1
fi
mkdir -p "$destination"
library="$root/core/target/release/liblinefont.so"
tar -czf "$destination/linefont-linux-x86_64.tar.gz" \
  -C "$root/core/target/release" liblinefont.so \
  -C "$root/core/include" linefont.h linefont.hpp \
  -C "$root/core/cmake" linefontConfig.cmake \
  -C "$root" LICENSE THIRD_PARTY.txt
python3 "$root/tools/package-wheel.py" "$root" "$library" "$destination"
