// Lane paths (spec §12.2): waypoints → smooth Catmull-Rom curve → dense polyline
// with cumulative arc length. Queries by distance s along the lane.

import * as C from './config.js';

// Uniform Catmull-Rom point between p1 and p2 at t ∈ [0, 1].
function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a, b, c, d) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
}

// Returns { points, length, pointAt(s), tangentAt(s), normalAt(s), distanceTo(p) }.
// points: [{ x, y, s }], the sampled centreline from spawn (s = 0) to the lane end.
export function createLanePath(waypoints) {
  const n = waypoints.length;
  const wp = (i) => waypoints[Math.max(0, Math.min(n - 1, i))]; // clamp: endpoints repeat
  const points = [];

  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < C.LANE_SAMPLES_PER_SEGMENT; k++) {
      const t = k / C.LANE_SAMPLES_PER_SEGMENT;
      points.push(catmullRom(wp(i - 1), wp(i), wp(i + 1), wp(i + 2), t));
    }
  }
  points.push({ x: waypoints[n - 1].x, y: waypoints[n - 1].y });

  let s = 0;
  points[0].s = 0;
  for (let i = 1; i < points.length; i++) {
    s += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    points[i].s = s;
  }
  const length = s;

  // Index i of the segment [points[i], points[i + 1]] containing distance s (binary search).
  function segmentAt(dist) {
    let lo = 0;
    let hi = points.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (points[mid].s <= dist) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  function pointAt(dist) {
    const d = Math.max(0, Math.min(length, dist));
    const i = segmentAt(d);
    const a = points[i];
    const b = points[i + 1];
    const span = b.s - a.s;
    const t = span > 0 ? (d - a.s) / span : 0;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function tangentAt(dist) {
    const i = segmentAt(Math.max(0, Math.min(length, dist)));
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  }

  // Unit normal, 90° clockwise on screen from the direction of travel (points to the walker's right).
  function normalAt(dist) {
    const t = tangentAt(dist);
    return { x: -t.y, y: t.x };
  }

  // Shortest distance from point p to the centreline.
  function distanceTo(p) {
    let best = Infinity;
    for (let i = 0; i < points.length - 1; i++) {
      best = Math.min(best, distanceToSegment(p, points[i], points[i + 1]));
    }
    return best;
  }

  return { points, length, pointAt, tangentAt, normalAt, distanceTo };
}

function distanceToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}
