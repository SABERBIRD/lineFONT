function cubicAt(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return (
    u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
  );
}

function extrema(p0, p1, p2, p3) {
  const a = -p0 + 3 * p1 - 3 * p2 + p3;
  const b = 2 * (p0 - 2 * p1 + p2);
  const c = p1 - p0;
  if (Math.abs(a) < 1e-12) return Math.abs(b) < 1e-12 ? [] : [-c / b];
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  const root = Math.sqrt(discriminant);
  return [(-b - root) / (2 * a), (-b + root) / (2 * a)];
}

export function inkBounds(commands) {
  let current = [0, 0];
  const xs = [];
  const ys = [];
  for (const { code, values } of commands) {
    const end = values.slice(-2);
    if (code === "L" || code === "C") {
      xs.push(current[0], end[0]);
      ys.push(current[1], end[1]);
    }
    if (code === "C") {
      for (let axis = 0; axis < 2; axis++) {
        const points = [
          current[axis],
          values[axis],
          values[axis + 2],
          values[axis + 4],
        ];
        for (const t of extrema(...points)) {
          if (t > 0 && t < 1)
            (axis === 0 ? xs : ys).push(cubicAt(...points, t));
        }
      }
    }
    current = end;
  }
  if (!xs.length) return null;
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
