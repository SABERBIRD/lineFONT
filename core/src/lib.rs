use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use unicode_normalization::UnicodeNormalization;
use unicode_segmentation::UnicodeSegmentation;

pub const BLOCKS: [(&str, &str); 5] = [
    ("digits", "0123456789"),
    ("punctuation", ".,:;…!?-–—"),
    ("brackets", "()[]{}"),
    ("quotes", "'\"«»‘’‚“”„"),
    ("mathematics-technical", "+−×÷=<>≤≥≠≈±∓*/%‰°′″⌀"),
];
type Result<T> = std::result::Result<T, String>;
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Metrics {
    pub cap_height: f64,
    pub baseline: f64,
    pub default_advance: f64,
    #[serde(flatten)]
    pub extra: BTreeMap<String, Value>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Anchor {
    pub x: f64,
    pub y: f64,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Part {
    pub code: String,
    #[serde(default)]
    pub x: f64,
    #[serde(default)]
    pub y: f64,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Glyph {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub d: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alias: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub composite: Option<Vec<Part>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub advance: Option<f64>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub anchors: BTreeMap<String, Anchor>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attach: Option<Anchor>,
    #[serde(flatten)]
    pub extra: BTreeMap<String, Value>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Font {
    pub format: String,
    pub id: String,
    pub name: String,
    pub version: String,
    pub authors: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,
    pub style: String,
    pub metrics: Metrics,
    pub glyphs: BTreeMap<String, Glyph>,
    #[serde(flatten)]
    pub extra: BTreeMap<String, Value>,
}
#[derive(Clone, Debug, Serialize)]
pub struct Command {
    pub code: char,
    pub values: Vec<f64>,
}
#[derive(Clone)]
struct Shape {
    commands: Vec<Command>,
    advance: f64,
    anchors: BTreeMap<String, Anchor>,
    attach: Option<Anchor>,
}
#[derive(Clone)]
struct Loaded {
    font: Font,
    shapes: BTreeMap<char, Shape>,
    fingerprint: String,
}
pub struct Engine {
    fonts: Vec<Loaded>,
}
fn code(c: char) -> String {
    format!("{:04X}", c as u32)
}
fn scalar(s: &str) -> Result<char> {
    let n = u32::from_str_radix(s, 16).map_err(|_| format!("Invalid Unicode key: {s}"))?;
    let c = char::from_u32(n).ok_or_else(|| format!("Invalid Unicode scalar: {s}"))?;
    if code(c) != s {
        return Err(format!("Use canonical uppercase Unicode key: {}", code(c)));
    }
    Ok(c)
}
fn finite(n: f64) -> bool {
    n.is_finite() && n.abs() <= 1_000_000.0
}
fn parse_path(d: &str) -> Result<Vec<Command>> {
    if d.len() > 200_000 {
        return Err("Glyph path is too large".into());
    }
    let mut commands = Vec::new();
    for segment in svgtypes::PathParser::from(d) {
        use svgtypes::PathSegment::*;
        let (code, values) = match segment.map_err(|e| e.to_string())? {
            MoveTo { abs: true, x, y } => ('M', vec![x, y]),
            LineTo { abs: true, x, y } => ('L', vec![x, y]),
            CurveTo {
                abs: true,
                x1,
                y1,
                x2,
                y2,
                x,
                y,
            } => ('C', vec![x1, y1, x2, y2, x, y]),
            _ => return Err("Only absolute M, L, C paths are allowed".into()),
        };
        if commands.is_empty() && code != 'M' {
            return Err("Path must begin with M".into());
        }
        if !values.iter().all(|n| finite(*n)) {
            return Err("Invalid path coordinate".into());
        }
        commands.push(Command { code, values });
        if commands.len() > 10_000 {
            return Err("Too many path commands".into());
        }
    }
    Ok(commands)
}
fn shifted(commands: &[Command], x: f64, y: f64, scale: f64) -> Vec<Command> {
    commands
        .iter()
        .map(|c| Command {
            code: c.code,
            values: c
                .values
                .iter()
                .enumerate()
                .map(|(i, v)| v * scale + if i % 2 == 0 { x } else { y })
                .collect(),
        })
        .collect()
}
fn resolve(font: &Font, key: &str, stack: &mut Vec<String>, budget: &mut usize) -> Result<Shape> {
    *budget += 1;
    if *budget > 200_000 {
        return Err("Too many glyph references".into());
    }
    if stack.len() >= 32 || stack.iter().any(|s| s == key) {
        return Err(format!("Cyclic or deep glyph reference: {key}"));
    }
    let g = font
        .glyphs
        .get(key)
        .ok_or_else(|| format!("Missing glyph reference: {key}"))?;
    let modes = g.d.is_some() as u8 + g.alias.is_some() as u8 + g.composite.is_some() as u8;
    if modes != 1 {
        return Err(format!(
            "Glyph {key} needs exactly one of d, alias, composite"
        ));
    }
    stack.push(key.into());
    let mut shape = if let Some(d) = &g.d {
        Shape {
            commands: parse_path(d)?,
            advance: font.metrics.default_advance,
            anchors: BTreeMap::new(),
            attach: None,
        }
    } else if let Some(alias) = &g.alias {
        scalar(alias)?;
        resolve(font, alias, stack, budget)?
    } else {
        let parts = g.composite.as_ref().unwrap();
        if parts.is_empty() || parts.len() > 32 {
            return Err("Composite needs 1–32 parts".into());
        }
        let mut base = resolve(font, &parts[0].code, stack, budget)?;
        let mut all = Vec::new();
        for part in parts {
            scalar(&part.code)?;
            if !finite(part.x) || !finite(part.y) {
                return Err("Invalid composite offset".into());
            }
            let child = resolve(font, &part.code, stack, budget)?;
            all.extend(shifted(&child.commands, part.x, part.y, 1.0));
            if all.len() > 10_000 {
                return Err("Expanded glyph is too large".into());
            }
        }
        base.commands = all;
        base
    };
    stack.pop();
    if let Some(a) = g.advance {
        shape.advance = a;
    }
    if !finite(shape.advance) || shape.advance < 0.0 {
        return Err("Invalid advance".into());
    }
    for a in g.anchors.values().chain(g.attach.iter()) {
        if !finite(a.x) || !finite(a.y) {
            return Err("Invalid anchor".into());
        }
    }
    shape.anchors.extend(g.anchors.clone());
    if g.attach.is_some() {
        shape.attach = g.attach.clone();
    }
    Ok(shape)
}
fn load(font: Font) -> Result<Loaded> {
    if font.format != "linefont/1" {
        return Err("Unsupported Linefont format".into());
    }
    for field in [&font.id, &font.name, &font.version] {
        if field.trim().is_empty() || field.len() > 200 {
            return Err("Invalid font metadata".into());
        }
    }
    if font.authors.is_empty()
        || font.authors.len() > 100
        || font
            .authors
            .iter()
            .any(|a| a.trim().is_empty() || a.len() > 200)
    {
        return Err("Invalid authors".into());
    }
    if !["upright", "italic"].contains(&font.style.as_str()) {
        return Err("Invalid font style".into());
    }
    let m = &font.metrics;
    if !finite(m.cap_height)
        || m.cap_height <= 0.0
        || !finite(m.baseline)
        || !finite(m.default_advance)
        || m.default_advance < 0.0
    {
        return Err("Invalid font metrics".into());
    }
    if font.glyphs.len() > 20_000 {
        return Err("Too many glyphs".into());
    }
    let mut shapes = BTreeMap::new();
    let mut total = 0;
    let mut budget = 0;
    for key in font.glyphs.keys() {
        let c = scalar(key)?;
        let shape = resolve(&font, key, &mut Vec::new(), &mut budget)?;
        total += shape.commands.len();
        if total > 200_000 {
            return Err("Expanded font is too large".into());
        }
        shapes.insert(c, shape);
    }
    for (name, chars) in BLOCKS {
        let count = chars.chars().filter(|c| shapes.contains_key(c)).count();
        if count != 0 && count != chars.chars().count() {
            let missing: String = chars.chars().filter(|c| !shapes.contains_key(c)).collect();
            return Err(format!("Incomplete {name} block; missing: {missing}"));
        }
    }
    let canonical = serde_json::to_vec(&font).map_err(|e| e.to_string())?;
    let fingerprint = format!("{:x}", Sha256::digest(canonical));
    Ok(Loaded {
        font,
        shapes,
        fingerprint,
    })
}
fn composed(font: &Loaded, text: &str) -> Option<Shape> {
    let mut chars = text.chars();
    let first = chars.next()?;
    if chars.next().is_none() {
        if let Some(shape) = font.shapes.get(&first) {
            return Some(shape.clone());
        }
    }
    let nfd: Vec<char> = text.nfd().collect();
    if nfd.len() < 2 || nfd.len() > 32 {
        return None;
    }
    let mut base = font.shapes.get(&nfd[0])?.clone();
    let mut anchors = base.anchors.clone();
    for mark in &nfd[1..] {
        let shape = font.shapes.get(mark)?;
        let attach = shape.attach.as_ref()?;
        let class = unicode_normalization::char::canonical_combining_class(*mark);
        let name = match class {
            220 | 202 => "bottom",
            230 => "top",
            _ => return None,
        };
        let anchor = anchors.get(name)?;
        let dx = anchor.x - attach.x;
        let dy = anchor.y - attach.y;
        base.commands.extend(shifted(&shape.commands, dx, dy, 1.0));
        for (key, value) in &shape.anchors {
            anchors.insert(
                key.clone(),
                Anchor {
                    x: value.x + dx,
                    y: value.y + dy,
                },
            );
        }
    }
    Some(base)
}
impl Engine {
    pub fn new(fonts: Vec<Font>) -> Result<Self> {
        if fonts.is_empty() || fonts.len() > 64 {
            return Err("Need 1–64 fonts".into());
        }
        Ok(Self {
            fonts: fonts.into_iter().map(load).collect::<Result<_>>()?,
        })
    }
    fn select(&self, text: &str) -> Option<(usize, Shape)> {
        for (i, font) in self.fonts.iter().enumerate() {
            if let Some(shape) = composed(font, text) {
                return Some((i, shape));
            }
        }
        None
    }
    fn styled(&self, text: &str, style: &str) -> Option<(usize, Shape)> {
        let (index, shape) = self.select(text)?;
        let font = &self.fonts[index];
        if font.font.style == style {
            return Some((index, shape));
        }
        if let Some(family) = font.font.extra.get("family").and_then(Value::as_str) {
            for (i, candidate) in self.fonts.iter().enumerate() {
                if candidate.font.style == style
                    && candidate.font.extra.get("family").and_then(Value::as_str) == Some(family)
                {
                    if let Some(other) = composed(candidate, text) {
                        return Some((i, other));
                    }
                }
            }
        }
        Some((index, shape))
    }
    pub fn rank(&self, text: &str) -> Vec<usize> {
        let mut remaining: BTreeMap<String, usize> = BTreeMap::new();
        for cluster in text.graphemes(true).filter(|s| *s != "\n") {
            *remaining.entry(cluster.nfc().collect()).or_default() += 1;
        }
        let mut available: Vec<usize> = (0..self.fonts.len()).collect();
        let mut order = Vec::new();
        while !available.is_empty() {
            let best = available
                .iter()
                .enumerate()
                .max_by_key(|(pos, i)| {
                    let count: usize = remaining
                        .iter()
                        .filter(|(s, _)| composed(&self.fonts[**i], s).is_some())
                        .map(|(_, n)| *n)
                        .sum();
                    (count, usize::MAX - pos)
                })
                .unwrap()
                .0;
            let i = available.remove(best);
            remaining.retain(|s, _| composed(&self.fonts[i], s).is_none());
            order.push(i);
        }
        order
    }
    pub fn layout(&self, request: LayoutRequest) -> Result<Layout> {
        let r = request;
        if r.text.len() > 400_000 || r.text.encode_utf16().count() > 100_000 {
            return Err("Text is too long".into());
        }
        if !finite(r.height)
            || r.height <= 0.0
            || !finite(r.line_height)
            || r.line_height <= 0.0
            || !finite(r.top)
            || !finite(r.letter_spacing)
            || r.letter_spacing < 0.0
            || !["upright", "italic"].contains(&r.style.as_str())
            || !["left", "center", "right", "justify"].contains(&r.alignment.as_str())
        {
            return Err("Invalid text size".into());
        }
        if let Some(w) = r.wrap_width {
            if !finite(w) || w <= 0.0 {
                return Err("Invalid wrap width".into());
            }
        }
        let normalized = r.text.replace("\r\n", "\n").replace('\r', "\n");
        let text_len = normalized.encode_utf16().count();
        if r.style_runs.len() > 10_000 {
            return Err("Too many style runs".into());
        }
        let mut previous_end = 0;
        for run in &r.style_runs {
            if run.start < previous_end
                || run.start >= run.end
                || run.end > text_len
                || !["upright", "italic"].contains(&run.style.as_str())
            {
                return Err("Invalid text style run".into());
            }
            previous_end = run.end;
        }
        let mut source_offset = 0;
        let mut run_index = 0;
        let mut tokens = Vec::new();
        let mut command_count = 0_usize;
        for (byte, cluster) in normalized.grapheme_indices(true) {
            let nfc: String = cluster.nfc().collect();
            while run_index < r.style_runs.len() && r.style_runs[run_index].end <= source_offset {
                run_index += 1;
            }
            let style = r
                .style_runs
                .get(run_index)
                .filter(|run| run.start <= source_offset)
                .map(|run| run.style.as_str())
                .unwrap_or(&r.style)
                .to_owned();
            let selected = self.styled(&nfc, &style);
            source_offset += cluster.encode_utf16().count();
            let advance = if cluster == "\n" {
                0.0
            } else {
                selected
                    .as_ref()
                    .map(|(i, s)| s.advance * r.height / self.fonts[*i].font.metrics.cap_height)
                    .unwrap_or(r.height * 0.8)
            };
            command_count += selected
                .as_ref()
                .map(|(_, s)| s.commands.len())
                .unwrap_or(5);
            if command_count > 2_000_000 {
                return Err("Text geometry is too large".into());
            }
            tokens.push((byte, cluster, nfc, selected, advance, style));
        }
        let mut left_inset = 0.0_f64;
        let mut right_inset = 0.0_f64;
        if r.wrap_width.is_some() {
            for (_, _, _, selected, advance, style) in &tokens {
                if let Some((fi, shape)) = selected {
                    let font = &self.fonts[*fi].font;
                    let scale = r.height / font.metrics.cap_height;
                    let shear = if style == "italic" && font.style != "italic" {
                        15.0_f64.to_radians().tan()
                    } else {
                        0.0
                    };
                    for command in &shape.commands {
                        for point in command.values.chunks_exact(2) {
                            let x = scale * (point[0] + shear * (font.metrics.baseline - point[1]));
                            left_inset = left_inset.max(-x);
                            right_inset = right_inset.max(x - advance);
                        }
                    }
                }
            }
        }
        if let Some(width) = r.wrap_width {
            let insets = left_inset + right_inset;
            if insets > width * 0.5 {
                left_inset *= width * 0.5 / insets;
                right_inset *= width * 0.5 / insets;
            }
        }
        let content_limit = r.wrap_width.map(|width| width - left_inset - right_inset);
        let mut word_width = vec![0.0; tokens.len()];
        let mut run = 0.0;
        let mut in_word = false;
        for i in (0..tokens.len()).rev() {
            if tokens[i].1.chars().all(char::is_whitespace) {
                run = 0.0;
                in_word = false;
            } else {
                run = tokens[i].4 + if in_word { r.letter_spacing + run } else { 0.0 };
                in_word = true;
            }
            word_width[i] = run;
        }
        let mut carets = vec![Position { x: 0.0, y: 0.0 }; normalized.encode_utf16().count() + 1];
        let mut glyphs = Vec::new();
        let mut missing = BTreeSet::new();
        let (mut x, mut line, mut widest, mut offset) = (0.0_f64, 0_usize, 0.0_f64, 0_usize);
        let mut line_widths = Vec::new();
        let mut soft_wraps = Vec::new();
        let mut line_start = true;
        for (i, (_, cluster, nfc, selected, advance, style)) in tokens.iter().enumerate() {
            let gap = if line_start { 0.0 } else { r.letter_spacing };
            if let Some(limit) = content_limit {
                let word_start = i == 0 || tokens[i - 1].1.chars().all(char::is_whitespace);
                if *cluster != "\n"
                    && !line_start
                    && (x + gap + advance > limit + 1e-9
                        || (word_start
                            && word_width[i] <= limit
                            && x + gap + word_width[i] > limit + 1e-9))
                {
                    widest = widest.max(x);
                    line_widths.push(x);
                    soft_wraps.push(true);
                    x = 0.0;
                    line += 1;
                    line_start = true;
                }
            }
            if *cluster != "\n" && !line_start {
                x += r.letter_spacing;
            }
            let start = offset;
            let len = cluster.encode_utf16().count();
            for caret in carets.iter_mut().skip(offset).take(len) {
                *caret = Position {
                    x,
                    y: line as f64 * r.line_height,
                };
            }
            offset += len;
            if *cluster == "\n" {
                widest = widest.max(x);
                line_widths.push(x);
                soft_wraps.push(false);
                x = 0.0;
                line += 1;
                line_start = true;
            } else {
                let y = line as f64 * r.line_height + r.top;
                let (font_index, commands) = if let Some((fi, shape)) = selected {
                    let scale = r.height / self.fonts[*fi].font.metrics.cap_height;
                    let baseline = self.fonts[*fi].font.metrics.baseline;
                    let mut commands =
                        shifted(&shape.commands, x, y + r.height - baseline * scale, scale);
                    if style == "italic" && self.fonts[*fi].font.style != "italic" {
                        let shear = 15.0_f64.to_radians().tan();
                        for command in &mut commands {
                            for point in command.values.chunks_exact_mut(2) {
                                point[0] += shear * (y + r.height - point[1]);
                            }
                        }
                    }
                    (Some(*fi), commands)
                } else {
                    missing.insert(nfc.clone());
                    let w = advance * 0.75;
                    (
                        None,
                        vec![
                            Command {
                                code: 'M',
                                values: vec![x, y],
                            },
                            Command {
                                code: 'L',
                                values: vec![x + w, y],
                            },
                            Command {
                                code: 'L',
                                values: vec![x + w, y + r.height],
                            },
                            Command {
                                code: 'L',
                                values: vec![x, y + r.height],
                            },
                            Command {
                                code: 'L',
                                values: vec![x, y],
                            },
                        ],
                    )
                };
                glyphs.push(Placed {
                    char: nfc.clone(),
                    x,
                    y,
                    start,
                    end: offset,
                    advance: *advance,
                    font_index,
                    style: style.clone(),
                    line,
                    commands,
                });
                x += advance;
                line_start = false;
            }
        }
        carets[offset] = Position {
            x,
            y: line as f64 * r.line_height,
        };
        widest = widest.max(x);
        let width = r.wrap_width.unwrap_or(widest).max(2.0);
        let height = (line + 1) as f64 * r.line_height;
        line_widths.push(x);
        soft_wraps.push(false);
        let mut spaces = vec![Vec::new(); line + 1];
        let mut first_ink = vec![usize::MAX; line + 1];
        let mut last_ink = vec![0; line + 1];
        let mut ink_ends = vec![0.0_f64; line + 1];
        for glyph in &glyphs {
            if !glyph.char.chars().all(char::is_whitespace) {
                first_ink[glyph.line] = first_ink[glyph.line].min(glyph.start);
                last_ink[glyph.line] = last_ink[glyph.line].max(glyph.end);
                ink_ends[glyph.line] = glyph.x + glyph.advance;
            }
        }
        for glyph in &glyphs {
            if glyph.char == " "
                && glyph.start > first_ink[glyph.line]
                && glyph.end < last_ink[glyph.line]
            {
                spaces[glyph.line].push(glyph.end);
            }
        }
        let adjustments: Vec<(f64, f64)> = line_widths
            .iter()
            .enumerate()
            .map(|(row, used)| {
                let free = (width
                    - left_inset
                    - right_inset
                    - if r.alignment == "justify" {
                        ink_ends[row]
                    } else {
                        *used
                    })
                .max(0.0);
                match r.alignment.as_str() {
                    "center" => (free / 2.0, 0.0),
                    "right" => (free, 0.0),
                    "justify"
                        if r.wrap_width.is_some() && soft_wraps[row] && !spaces[row].is_empty() =>
                    {
                        (0.0, free / spaces[row].len() as f64)
                    }
                    _ => (0.0, 0.0),
                }
            })
            .collect();
        for glyph in &mut glyphs {
            let (offset, extra) = adjustments[glyph.line];
            let shift = left_inset
                + offset
                + extra * spaces[glyph.line].partition_point(|end| *end <= glyph.start) as f64;
            glyph.x += shift;
            for command in &mut glyph.commands {
                for point in command.values.chunks_exact_mut(2) {
                    point[0] += shift;
                }
            }
        }
        for (index, caret) in carets.iter_mut().enumerate() {
            let row = (caret.y / r.line_height).round() as usize;
            let (offset, extra) = adjustments[row];
            caret.x += left_inset
                + offset
                + extra * spaces[row].partition_point(|end| *end <= index) as f64;
        }
        if let Some(limit) = r.wrap_width {
            let mut extents = vec![(0.0_f64, 0.0_f64); line + 1];
            for glyph in &glyphs {
                for command in &glyph.commands {
                    for point in command.values.chunks_exact(2) {
                        extents[glyph.line].0 = extents[glyph.line].0.min(point[0]);
                        extents[glyph.line].1 = extents[glyph.line].1.max(point[0]);
                    }
                }
            }
            let transforms: Vec<_> = extents
                .iter()
                .map(|(left, right)| {
                    let span = right - left;
                    let scale = if span > limit { limit / span } else { 1.0 };
                    let shift = if *left < 0.0 { -left * scale } else { 0.0 };
                    (scale, shift)
                })
                .collect();
            for glyph in &mut glyphs {
                let (scale, shift) = transforms[glyph.line];
                glyph.x = glyph.x * scale + shift;
                glyph.advance *= scale;
                for command in &mut glyph.commands {
                    for point in command.values.chunks_exact_mut(2) {
                        point[0] = point[0] * scale + shift;
                    }
                }
            }
            for caret in &mut carets {
                let row = (caret.y / r.line_height).round() as usize;
                let (scale, shift) = transforms[row];
                caret.x = caret.x * scale + shift;
            }
        }
        let (mut min_x, mut min_y, mut max_x, mut max_y) = (0.0_f64, 0.0_f64, width, height);
        for glyph in &glyphs {
            for command in &glyph.commands {
                for point in command.values.chunks_exact(2) {
                    min_x = min_x.min(point[0]);
                    min_y = min_y.min(point[1]);
                    max_x = max_x.max(point[0]);
                    max_y = max_y.max(point[1]);
                }
            }
        }
        Ok(Layout {
            bounds: Rect {
                x: min_x,
                y: min_y,
                width: max_x - min_x,
                height: max_y - min_y,
            },
            glyphs,
            carets,
            width,
            height,
            lines: line + 1,
            missing: missing.into_iter().collect(),
        })
    }
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayoutRequest {
    pub text: String,
    pub height: f64,
    pub line_height: f64,
    pub top: f64,
    pub wrap_width: Option<f64>,
    #[serde(default)]
    pub letter_spacing: f64,
    #[serde(default = "default_style")]
    pub style: String,
    #[serde(default = "default_alignment")]
    pub alignment: String,
    #[serde(default)]
    pub style_runs: Vec<StyleRun>,
}
fn default_alignment() -> String {
    "left".into()
}
#[derive(Deserialize)]
pub struct StyleRun {
    pub start: usize,
    pub end: usize,
    pub style: String,
}
fn default_style() -> String {
    "upright".into()
}
#[derive(Clone, Serialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Placed {
    pub char: String,
    pub x: f64,
    pub y: f64,
    pub start: usize,
    pub end: usize,
    pub advance: f64,
    pub font_index: Option<usize>,
    pub style: String,
    pub line: usize,
    pub commands: Vec<Command>,
}
#[derive(Serialize)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}
#[derive(Serialize)]
pub struct Layout {
    pub bounds: Rect,
    pub glyphs: Vec<Placed>,
    pub carets: Vec<Position>,
    pub width: f64,
    pub height: f64,
    pub lines: usize,
    pub missing: Vec<String>,
}
thread_local! { static ENGINE: std::cell::RefCell<Option<Engine>> = const { std::cell::RefCell::new(None) }; }
fn request(value: Value) -> Result<Value> {
    match value["op"].as_str() {
        Some("fonts") => {
            let fonts: Vec<Font> =
                serde_json::from_value(value["fonts"].clone()).map_err(|e| e.to_string())?;
            let engine = Engine::new(fonts)?;
            let result = json!({"fonts":engine.fonts.iter().map(|f|json!({"font":f.font,"fingerprint":f.fingerprint})).collect::<Vec<_>>()});
            ENGINE.with(|e| *e.borrow_mut() = Some(engine));
            Ok(result)
        }
        Some("layout") => ENGINE.with(|e| {
            let e = e.borrow();
            let engine = e.as_ref().ok_or("Fonts are not loaded")?;
            serde_json::to_value(
                engine.layout(serde_json::from_value(value).map_err(|e| e.to_string())?)?,
            )
            .map_err(|e| e.to_string())
        }),
        Some("rank") => ENGINE.with(|e| {
            let e = e.borrow();
            let engine = e.as_ref().ok_or("Fonts are not loaded")?;
            let text = value["text"].as_str().ok_or("Missing text")?;
            if text.len() > 400_000 {
                return Err("Text is too long".into());
            }
            Ok(json!(engine.rank(text)))
        }),
        _ => Err("Unknown Linefont operation".into()),
    }
}
#[no_mangle]
pub extern "C" fn lint_alloc(len: usize) -> *mut u8 {
    let mut bytes = vec![0_u8; len].into_boxed_slice();
    let ptr = bytes.as_mut_ptr();
    std::mem::forget(bytes);
    ptr
}
#[no_mangle]
pub unsafe extern "C" fn lint_free(ptr: *mut u8, len: usize) {
    drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(ptr, len)));
}
#[repr(C)]
pub struct LintBuffer {
    pub pointer: *mut u8,
    pub length: usize,
}
#[no_mangle]
pub unsafe extern "C" fn lint_call(ptr: *const u8, len: usize) -> LintBuffer {
    let bytes = std::slice::from_raw_parts(ptr, len);
    let response = if len > 16_000_000 {
        Err("Request is too large".into())
    } else {
        serde_json::from_slice(bytes)
            .map_err(|e| e.to_string())
            .and_then(request)
    };
    let output = serde_json::to_vec(&match response {
        Ok(value) => json!({"ok":value}),
        Err(error) => json!({"error":error}),
    })
    .unwrap();
    let len = output.len();
    let ptr = lint_alloc(len);
    std::ptr::copy_nonoverlapping(output.as_ptr(), ptr, len);
    LintBuffer {
        pointer: ptr,
        length: len,
    }
}
#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub unsafe extern "C" fn lint_request(ptr: *const u8, len: usize) -> u64 {
    let output = lint_call(ptr, len);
    ((output.length as u64) << 32) | (output.pointer as u64)
}
