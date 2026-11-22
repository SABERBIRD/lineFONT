use super::{Command, Rect, Result};
use kurbo::{BezPath, Shape};

pub fn ink_bounds(commands: &[Command]) -> Result<Option<Rect>> {
    let mut path = BezPath::new();
    let mut ink = false;
    let mut started = false;
    for c in commands {
        if !c.values.iter().all(|n| n.is_finite()) {
            return Err("Non-finite coordinate".into());
        }
        match (c.code, c.values.as_slice()) {
            ('M', [x, y]) => {
                path.move_to((*x, *y));
                started = true;
            }
            ('L', [x, y]) if started => {
                path.line_to((*x, *y));
                ink = true;
            }
            ('C', [a, b, c, d, x, y]) if started => {
                path.curve_to((*a, *b), (*c, *d), (*x, *y));
                ink = true;
            }
            _ => return Err("Invalid placed command".into()),
        }
    }
    if !ink {
        return Ok(None);
    }
    // Only drawn segments contribute; isolated moves have no ink.
    let mut bounds: Option<kurbo::Rect> = None;
    for segment in path.segments() {
        let r = segment.bounding_box();
        bounds = Some(bounds.map_or(r, |old| old.union(r)));
    }
    Ok(bounds.map(|r| Rect {
        x: r.x0,
        y: r.y0,
        width: r.width(),
        height: r.height(),
    }))
}

pub fn arc_lines(
    start: [f64; 2],
    end: [f64; 2],
    radii: [f64; 2],
    rotation: f64,
    large: bool,
    sweep: bool,
    tolerance: f64,
    out: &mut Vec<Command>,
) -> Result<()> {
    let [mut rx, mut ry] = radii;
    if rx < 0. || ry < 0. {
        return Err("Negative arc radius".into());
    }
    if start == end {
        return Ok(());
    }
    if rx == 0. || ry == 0. {
        out.push(Command {
            code: 'L',
            values: end.to_vec(),
        });
        return Ok(());
    }
    let (sn, cs) = rotation.to_radians().sin_cos();
    let dx = (start[0] - end[0]) / 2.;
    let dy = (start[1] - end[1]) / 2.;
    let mut u = (cs * dx + sn * dy) / rx;
    let mut v = (-sn * dx + cs * dy) / ry;
    let norm = u.hypot(v);
    if !norm.is_finite() || norm == 0. {
        return Err("Unrepresentable arc".into());
    }
    if norm > 1. {
        rx *= norm;
        ry *= norm;
        u /= norm;
        v /= norm;
    }
    let n = u.hypot(v);
    let offset = (1. - n * n).max(0.).sqrt() * if large == sweep { -1. } else { 1. };
    let a = v / n * offset;
    let b = -u / n * offset;
    let angle = (v - b).atan2(u - a);
    let mut span = (-v - b).atan2(-u - a) - angle;
    if sweep && span < 0. {
        span += std::f64::consts::TAU;
    }
    if !sweep && span > 0. {
        span -= std::f64::consts::TAU;
    }
    // Linear interpolation error <= max |ellipse''| * step² / 8.
    let steps = (span.abs() * (rx.max(ry) / (8. * tolerance)).sqrt())
        .ceil()
        .max(1.);
    if !steps.is_finite() || steps > 10_000usize.saturating_sub(out.len()) as f64 {
        return Err("Arc exceeds command budget at requested tolerance".into());
    }
    for i in 1..=steps as usize {
        let t = angle + span * i as f64 / steps;
        let x = rx * (t.cos() + a);
        let y = ry * (t.sin() + b);
        let p = if i == steps as usize {
            end
        } else {
            [
                (start[0] + end[0]) / 2. + cs * x - sn * y,
                (start[1] + end[1]) / 2. + sn * x + cs * y,
            ]
        };
        if !p.iter().all(|v| super::finite(*v)) {
            return Err("Invalid arc geometry".into());
        }
        out.push(Command {
            code: 'L',
            values: p.to_vec(),
        });
    }
    Ok(())
}

pub fn lines(commands: &[Command], tolerance: f64, remaining: &mut usize) -> Result<Vec<Command>> {
    let mut out = Vec::new();
    let mut start = [0., 0.];
    for cmd in commands {
        if *remaining == 0 {
            return Err("Text geometry is too large".into());
        }
        let v = &cmd.values;
        if cmd.code == 'C' {
            let p = kurbo::CubicBez::new(
                (start[0], start[1]),
                (v[0], v[1]),
                (v[2], v[3]),
                (v[4], v[5]),
            );
            // Interpolation error bounded by the maximum second derivative.
            let curvature = (p.p2.to_vec2() - 2. * p.p1.to_vec2() + p.p0.to_vec2())
                .hypot()
                .max((p.p3.to_vec2() - 2. * p.p2.to_vec2() + p.p1.to_vec2()).hypot())
                * 6.;
            let steps = (curvature / (8. * tolerance)).sqrt().ceil().max(1.);
            if steps > *remaining as f64 {
                return Err("Curve exceeds output budget at requested tolerance".into());
            }
            use kurbo::ParamCurve;
            for i in 1..=steps as usize {
                let p = p.eval(i as f64 / steps);
                out.push(Command {
                    code: 'L',
                    values: vec![p.x, p.y],
                });
            }
            *remaining -= steps as usize;
        } else {
            out.push(cmd.clone());
            *remaining -= 1;
        }
        start = [v[v.len() - 2], v[v.len() - 1]];
    }
    Ok(out)
}
