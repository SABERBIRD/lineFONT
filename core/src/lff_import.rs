use super::{code, font_import::import_result, ink_bounds, svg_import, Command, Result};
use serde_json::{json, Map, Value};
use std::collections::{BTreeMap, BTreeSet};

enum Stroke {
    Path(String),
    Reference(char),
}

fn scalar(value: &str) -> Result<char> {
    u32::from_str_radix(value.trim(), 16)
        .ok()
        .and_then(char::from_u32)
        .ok_or_else(|| format!("Invalid LFF Unicode code {value:?}").into())
}

fn number(value: &str) -> Result<f64> {
    value
        .trim()
        .parse::<f64>()
        .ok()
        .filter(|v| super::finite(*v))
        .ok_or_else(|| format!("Invalid LFF number {value:?}").into())
}

fn polyline(line: &str, has_arc: &mut bool) -> Result<String> {
    let mut points = Vec::new();
    for vertex in line.split(';').filter(|point| !point.trim().is_empty()) {
        let fields: Vec<_> = vertex.split(',').map(str::trim).collect();
        if fields.len() > 3 || fields[0].is_empty() {
            return Err("Invalid LFF polyline vertex".into());
        }
        let x = number(fields[0])?;
        let y = number(fields.get(1).copied().unwrap_or("0"))?;
        let bulge = match fields.get(2) {
            Some(value) => number(value.strip_prefix('A').ok_or("Expected LFF arc bulge")?)?,
            None => 0.,
        };
        points.push((x, y, bulge));
    }
    let Some(&(x, y, first_bulge)) = points.first() else {
        return Err("Empty LFF polyline".into());
    };
    if first_bulge != 0. {
        return Err("LFF arc requires a preceding vertex".into());
    }
    let mut path = format!("M{x} {y}");
    for pair in points.windows(2) {
        use std::fmt::Write;
        let [(from_x, from_y, _), (x, y, bulge)] = pair else {
            unreachable!()
        };
        if *bulge == 0. || (from_x == x && from_y == y) {
            write!(path, "L{x} {y}").unwrap();
        } else {
            *has_arc = true;
            let abs = bulge.abs();
            let radius = (x - from_x).hypot(y - from_y) * (abs + 1. / abs) / 4.;
            write!(
                path,
                "A{radius} {radius} 0 {} {} {x} {y}",
                u8::from(abs > 1.),
                u8::from(*bulge > 0.)
            )
            .unwrap();
        }
    }
    Ok(path)
}

fn expand<'a>(
    key: char,
    glyphs: &'a BTreeMap<char, Vec<Stroke>>,
    active: &mut BTreeSet<char>,
    paths: &mut Vec<svg_import::SvgPath>,
    bytes: &mut usize,
) -> Result<()> {
    *bytes += 1;
    if *bytes > 1_000_000 {
        return Err("Expanded LFF glyph is too large".into());
    }
    if active.len() >= 32 || !active.insert(key) {
        return Err("Cyclic or excessively deep LFF reference".into());
    }
    for stroke in glyphs.get(&key).ok_or("Missing LFF glyph reference")? {
        match stroke {
            Stroke::Reference(reference) => expand(*reference, glyphs, active, paths, bytes)?,
            Stroke::Path(d) => {
                *bytes += d.len();
                if paths.len() >= 10_000 || *bytes > 1_000_000 {
                    return Err("Expanded LFF glyph is too large".into());
                }
                paths.push(svg_import::SvgPath {
                    d: d.clone(),
                    transforms: vec!["scale(1 -1)".into()],
                });
            }
        }
    }
    active.remove(&key);
    Ok(())
}

pub(crate) fn lff_font(source: &str, options: &Value) -> Result<Value> {
    let mut metadata = BTreeMap::new();
    let mut records = BTreeMap::<char, Vec<Stroke>>::new();
    let mut current = None;
    let mut has_arc = false;
    for line in source
        .trim_start_matches('\u{feff}')
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
    {
        if let Some(comment) = line.strip_prefix('#') {
            if let Some((name, value)) = comment.split_once(':') {
                metadata.insert(name.trim().to_ascii_lowercase(), value.trim());
            }
        } else if let Some(header) = line.strip_prefix('[') {
            let key = scalar(header.split_once(']').ok_or("Invalid LFF glyph header")?.0)?;
            if records.insert(key, Vec::new()).is_some() {
                return Err("Duplicate LFF glyph".into());
            }
            current = Some(key);
        } else {
            let strokes = records
                .get_mut(&current.ok_or("Expected an LFF glyph header")?)
                .unwrap();
            let stroke = if let Some(reference) = line.strip_prefix('C') {
                Stroke::Reference(scalar(reference)?)
            } else {
                Stroke::Path(polyline(line, &mut has_arc)?)
            };
            strokes.push(stroke);
        }
    }
    if records.is_empty() || records.len() > 20_000 {
        return Err("Invalid LFF glyph count".into());
    }
    let default_advance = number(metadata.get("letterspacing").copied().unwrap_or("3"))?;
    let word_advance = number(metadata.get("wordspacing").copied().unwrap_or("6.75"))?;
    let cap_height = options["capHeight"].as_f64().unwrap_or(9.);
    let mut glyphs = Map::new();
    let mut budget = 200_000usize;
    for &key in records.keys() {
        let convert = || -> Result<Vec<Command>> {
            let mut paths = Vec::new();
            expand(key, &records, &mut BTreeSet::new(), &mut paths, &mut 0)?;
            Ok(svg_import::import_paths(paths)?.0)
        };
        let commands = convert().map_err(|error| error.glyph(&code(key)))?;
        budget = budget
            .checked_sub(commands.len())
            .ok_or("Expanded LFF font is too large")?;
        let right = ink_bounds(&commands)?.map_or(0., |bounds| bounds.x + bounds.width);
        let advance = if key == ' ' {
            word_advance
        } else {
            (right + default_advance).max(0.)
        };
        let d = commands
            .iter()
            .map(|command| {
                format!(
                    "{}{}",
                    command.code,
                    command
                        .values
                        .iter()
                        .map(f64::to_string)
                        .collect::<Vec<_>>()
                        .join(" ")
                )
            })
            .collect::<Vec<_>>()
            .join(" ");
        glyphs.insert(code(key), json!({"d": d,"advance": advance}));
    }
    glyphs
        .entry("0020")
        .or_insert_with(|| json!({"d":"", "advance":word_advance}));
    let name = options["name"]
        .as_str()
        .or(metadata.get("name").copied())
        .unwrap_or("Imported LFF font");
    let mut font = json!({
        "format":"linefont/1", "name":name, "id":options["id"].as_str().unwrap_or(name),
        "authors":[options["author"].as_str().or(metadata.get("author").copied()).unwrap_or("Unknown")],
        "version":options["version"].as_str().or(metadata.get("version").copied()).unwrap_or("1"),
        "style":"upright", "metrics":{"capHeight":cap_height,"baseline":0,"defaultAdvance":default_advance},
        "glyphs":glyphs, "x-lff-metadata":metadata,
    });
    if let Some(license) = options["license"].as_str() {
        font["license"] = json!(license);
    }
    if options["source"].is_object() {
        font["x-source"] = options["source"].clone();
    }
    let mut warnings =
        vec!["Converted LFF rightmost ink plus letter spacing to glyph advances".into()];
    if has_arc {
        warnings.push("Approximated LFF circular arcs as cubics".into());
    }
    Ok(import_result(font, warnings))
}
