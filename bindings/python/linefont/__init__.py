"""Python adapter for the lineFONT C ABI."""
import ctypes
import json
from pathlib import Path


class LinefontError(ValueError):
    def __init__(self, message, diagnostic):
        super().__init__(message)
        self.diagnostic = diagnostic


class _Buffer(ctypes.Structure):
    _fields_ = [("pointer", ctypes.c_void_p), ("length", ctypes.c_size_t)]


_core = ctypes.CDLL(str(Path(__file__).with_name("liblinefont.so")))
_core.lint_call.argtypes = (ctypes.c_char_p, ctypes.c_size_t)
_core.lint_call.restype = _Buffer
_core.lint_free.argtypes = (ctypes.c_void_p, ctypes.c_size_t)
_core.lint_free.restype = None


def _call(request):
    payload = json.dumps(request, ensure_ascii=False, allow_nan=False).encode("utf-8")
    result = _core.lint_call(payload, len(payload))
    try:
        response = json.loads(ctypes.string_at(result.pointer, result.length))
    finally:
        _core.lint_free(result.pointer, result.length)
    if "error" in response:
        raise LinefontError(response["error"], response.get("diagnostic"))
    return response["ok"]


class Engine:
    """An ordered, validated font stack that can be used from any calling thread."""

    def __init__(self, fonts):
        self._fonts = [entry["font"] for entry in _call({"op": "fonts", "fonts": list(fonts)})["fonts"]]

    @classmethod
    def from_files(cls, *paths):
        return cls(json.loads(Path(path).read_text(encoding="utf-8")) for path in paths)

    def layout(self, text, height, *, line_height=None, top=0, wrap_width=None):
        # A second Engine can have replaced the ABI's thread-local font stack.
        _call({"op": "fonts", "fonts": self._fonts})
        request = {"op": "layout", "text": text, "height": height, "top": top,
                   "lineHeight": height * 1.8 if line_height is None else line_height}
        if wrap_width is not None:
            request["wrapWidth"] = wrap_width
        return _call(request)
