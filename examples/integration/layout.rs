use linefont::{Engine, Font, LayoutRequest};
use std::{env, error::Error, fs};

fn main() -> Result<(), Box<dyn Error>> {
    let path = env::args().nth(1).ok_or("expected a .lint file")?;
    let font: Font = serde_json::from_slice(&fs::read(path)?)?;
    let engine = Engine::new(vec![font])?;
    let request: LayoutRequest = serde_json::from_value(serde_json::json!({
        "text": "Ґ", "height": 4, "lineHeight": 7.2, "top": 1.2
    }))?;
    let result = engine.layout(request)?;
    println!("glyphs={} missing={}", result.glyphs.len(), result.missing.len());
    Ok(())
}
