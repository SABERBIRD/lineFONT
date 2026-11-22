# Reference layout cases

[Cases](cases.json) pairs ordered font files with layout requests and their expected results. Run the same cases against an independent reader to check Unicode lookup, ranges, fallback and strokes.

Compare the selected font index, UTF-16 ranges, command letters, command order and missing clusters exactly. Compare coordinates, advances and caret positions using the recorded absolute tolerance in request units. These cases cover selected behavior shared with the reference layout API. The list can grow without changing the file format.
