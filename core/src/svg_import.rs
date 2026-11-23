use super::{finite, Command, Result};
use kurbo::{Affine, Point};
use serde::Deserialize;
use svgtypes::{
    PathParser, PathSegment, SimplePathSegment, SimplifyingPathParser, TransformListParser,
    TransformListToken,
};

#[derive(Deserialize)]
pub(crate) struct SvgPath {
    pub(crate) d: String,
    pub(crate) transforms: Vec<String>,
}

pub(crate) fn import_paths(paths: Vec<SvgPath>) -> Result<(Vec<Command>, bool)> {
    let mut commands = Vec::new();
    let mut approximated = false;
    for path in paths {
        let mut matrix = Affine::IDENTITY;
        for transforms in &path.transforms {
            for token in TransformListParser::from(transforms.as_str()) {
                use TransformListToken::*;
                matrix *= match token.map_err(|e| e.to_string())? {
                    Matrix { a, b, c, d, e, f } => Affine::new([a, b, c, d, e, f]),
                    Translate { tx, ty } => Affine::translate((tx, ty)),
                    Scale { sx, sy } => Affine::scale_non_uniform(sx, sy),
                    Rotate { angle } => Affine::rotate(angle.to_radians()),
                    SkewX { angle } => Affine::skew(angle.to_radians().tan(), 0.),
                    SkewY { angle } => Affine::skew(0., angle.to_radians().tan()),
                };
            }
        }
        approximated |= PathParser::from(path.d.as_str())
            .any(|s| matches!(s, Ok(PathSegment::EllipticalArc { .. })));
        let mut current = Point::ZERO;
        let mut start = Point::ZERO;
        for segment in SimplifyingPathParser::from(path.d.as_str()) {
            use SimplePathSegment::*;
            let (code, points) = match segment.map_err(|e| e.to_string())? {
                MoveTo { x, y } => {
                    start = Point::new(x, y);
                    ('M', vec![start])
                }
                LineTo { x, y } => ('L', vec![Point::new(x, y)]),
                CurveTo {
                    x1,
                    y1,
                    x2,
                    y2,
                    x,
                    y,
                } => (
                    'C',
                    vec![Point::new(x1, y1), Point::new(x2, y2), Point::new(x, y)],
                ),
                Quadratic { x1, y1, x, y } => {
                    let control = Point::new(x1, y1);
                    let end = Point::new(x, y);
                    (
                        'C',
                        vec![
                            current.lerp(control, 2. / 3.),
                            end.lerp(control, 2. / 3.),
                            end,
                        ],
                    )
                }
                ClosePath => {
                    if current == start {
                        continue;
                    }
                    ('L', vec![start])
                }
            };
            current = *points.last().unwrap();
            let values: Vec<_> = points
                .into_iter()
                .flat_map(|p| {
                    let p = matrix * p;
                    [p.x, p.y]
                })
                .collect();
            if commands.len() >= 10_000 || values.iter().any(|&v| !finite(v)) {
                return Err("Imported path exceeds geometry limits".into());
            }
            commands.push(Command { code, values });
        }
    }
    Ok((commands, approximated))
}
