use super::{code, svg_import, Result, BLOCKS};
use serde_json::{json, Map, Value};

pub(crate) fn svg_font(source: &str, options: &Value) -> Result<Value> {
    let doc = roxmltree::Document::parse_with_options(
        source,
        roxmltree::ParsingOptions {
            allow_dtd: true,
            nodes_limit: 100_000,
        },
    )
    .map_err(|error| error.to_string())?;
    let root = doc.root_element();
    if !root.has_tag_name(("http://www.w3.org/2000/svg", "svg")) {
        return Err("Expected an SVG document".into());
    }
    let mut fonts = root
        .descendants()
        .filter(|n| n.has_tag_name(("http://www.w3.org/2000/svg", "font")));
    let font = fonts.next().ok_or("No SVG 1.1 font found")?;
    if fonts.next().is_some() {
        return Err("Expected one SVG font per file".into());
    }
    let face = font
        .children()
        .find(|n| n.has_tag_name("font-face"))
        .ok_or("Missing font-face")?;
    let metric = |value: Option<&str>, name: &str| -> Result<f64> {
        value
            .and_then(|v| v.parse::<f64>().ok())
            .filter(|v| super::finite(*v))
            .ok_or_else(|| format!("Missing or invalid {name}").into())
    };
    let cap_height = match options["capHeight"].as_f64() {
        Some(value) => value,
        None => metric(
            face.attribute("cap-height"),
            "cap-height (supply a cap height override)",
        )?,
    };
    let baseline = metric(
        face.attribute("alphabetic").or(Some("0")),
        "alphabetic baseline",
    )?;
    let advance = metric(font.attribute("horiz-adv-x").or(Some("0")), "horiz-adv-x")?;
    let origin = metric(
        font.attribute("horiz-origin-x").or(Some("0")),
        "horiz-origin-x",
    )?;
    let vertical_origin = metric(
        font.attribute("horiz-origin-y").or(Some("0")),
        "horiz-origin-y",
    )?;
    let mut glyphs = Map::new();
    let mut warnings = Vec::new();
    let mut budget = 200_000usize;
    for node in font.children().filter(|n| n.is_element()) {
        let kind = node.tag_name().name();
        if kind != "glyph" {
            if matches!(kind, "hkern" | "vkern" | "missing-glyph")
                && !warnings.iter().any(|w| w == &format!("Ignored SVG {kind}"))
            {
                warnings.push(format!("Ignored SVG {kind}"));
            }
            continue;
        }
        let mapping = node.attribute("unicode").unwrap_or_default();
        let mut chars = mapping.chars();
        let Some(character) = chars.next().filter(|_| chars.next().is_none()) else {
            warnings.push(format!(
                "Skipped unmapped or multi-character glyph {:?}",
                node.attribute("glyph-name").unwrap_or(mapping)
            ));
            continue;
        };
        let key = code(character);
        if glyphs.contains_key(&key) {
            warnings.push(format!("Skipped alternate glyph U+{key}"));
            continue;
        }
        if node.children().any(|n| n.is_element()) || node.attribute("transform").is_some() {
            warnings.push(format!("Skipped unsupported SVG artwork in U+{key}"));
            continue;
        }
        let d = node.attribute("d").unwrap_or_default();
        let (commands, approximated) = svg_import::import_paths(vec![svg_import::SvgPath {
            d: d.to_owned(),
            transforms: vec![format!(
                "matrix(1 0 0 -1 {} {})",
                -origin,
                baseline + vertical_origin
            )],
        }])
        .map_err(|error| error.glyph(&key))?;
        budget = budget
            .checked_sub(commands.len())
            .ok_or("Expanded SVG font is too large")?;
        if approximated {
            warnings.push(format!("Approximated arcs in U+{key}"));
        }
        let width = match node.attribute("horiz-adv-x") {
            Some(value) => metric(Some(value), "glyph horiz-adv-x")?,
            None => advance,
        };
        let path = commands
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
        glyphs.insert(key, json!({"d":path,"advance":width}));
    }
    let name = face
        .attribute("font-family")
        .or(font.attribute("id"))
        .unwrap_or("Imported SVG font");
    let style = if face.attribute("font-style") == Some("italic") {
        "italic"
    } else {
        "upright"
    };
    let mut result = json!({
        "format":"linefont/1", "name":options["name"].as_str().unwrap_or(name),
        "id":options["id"].as_str().unwrap_or(name),
        "version":options["version"].as_str().unwrap_or("1"),
        "authors":[options["author"].as_str().unwrap_or("Unknown")], "style":style,
        "metrics":{"capHeight":cap_height,"baseline":0,"defaultAdvance":advance},
        "glyphs":glyphs
    });
    if let Some(license) = options["license"].as_str() {
        result["license"] = json!(license);
    }
    if let Some(source) = options["source"].as_object() {
        result["x-source"] = json!(source);
    }
    if let Some(metadata) = root
        .children()
        .find(|n| n.has_tag_name("metadata"))
        .and_then(|n| n.text())
    {
        result["x-svg-metadata"] = json!(metadata.trim());
    }
    Ok(import_result(result, warnings))
}

pub(crate) fn import_result(font: Value, warnings: Vec<String>) -> Value {
    let glyphs = font["glyphs"].as_object().unwrap();
    let blocks: Vec<_> = BLOCKS
        .iter()
        .filter_map(|(name, members)| {
            let (present, missing): (Vec<_>, Vec<_>) = members
                .chars()
                .partition(|c| glyphs.contains_key(&code(*c)));
            (!present.is_empty() && !missing.is_empty())
                .then(|| json!({"name":name,"present":present,"missing":missing}))
        })
        .collect();
    json!({"font":font,"warnings":warnings,"blocks":blocks})
}
