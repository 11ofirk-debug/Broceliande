// Battlefield zones (M1j §2): three sectors around a level's Druid, one per lane, each split into
// near and far by the level's nearRadius, giving six zones. Each candidate location carries an
// explicit `zone` label in its level; the label decides its zone, the geometry here is only for
// start-up checks and the debug overlay. `level` is a LEVELS entry (M2a §5.1).

// The level's zone IDs: near and far for each sector, e.g. nNW, fNW, nE, fE, nSW, fSW.
export function zoneIds(level) {
  return level.sectorNames.flatMap((s) => [`n${s}`, `f${s}`]);
}

// Angle of p around the level's Druid in degrees, 0° = east, clockwise (screen y points down).
export function angleFromDruid(level, p) {
  const d = level.druidPos;
  const a = Math.atan2(p.y - d.y, p.x - d.x) * 180 / Math.PI;
  return (a + 360) % 360;
}

// Sector i runs clockwise from sectorBoundaryAngles[i] to the next boundary (wrapping).
export function sectorOf(level, p) {
  const a = angleFromDruid(level, p);
  const B = level.sectorBoundaryAngles;
  for (let i = 0; i < B.length; i++) {
    const from = B[i];
    const to = B[(i + 1) % B.length];
    const inside = from < to ? a >= from && a < to : a >= from || a < to;
    if (inside) return level.sectorNames[i];
  }
  return level.sectorNames[0];
}

// The zone p falls in by geometry: 'n' or 'f' plus its sector, e.g. 'fSW'.
export function geometricZone(level, p) {
  const d = level.druidPos;
  const near = Math.hypot(p.x - d.x, p.y - d.y) <= level.nearRadius;
  return (near ? 'n' : 'f') + sectorOf(level, p);
}

export const isNearZone = (zone) => zone[0] === 'n';

// A zone's quota (M1j §2.3): { turret, feature, vacant } from the level's zoneQuotas, with any
// zoneQuotaOverrides entry for that zone; vacant is what is left of its candidates.
export function zoneQuota(level, zone) {
  const base = level.zoneQuotas[isNearZone(zone) ? 'near' : 'far'];
  const q = { ...base, ...(level.zoneQuotaOverrides[zone] ?? {}) };
  return { turret: q.turret, feature: q.feature, vacant: zoneCandidates(level, zone).length - q.turret - q.feature };
}

// Indices of the level's candidates labelled with this zone.
export function zoneCandidates(level, zone) {
  return level.candidateLocations.map((c, i) => (c.zone === zone ? i : -1)).filter((i) => i >= 0);
}

// Totals derived from the quotas (M1j §2.3).
export function quotaTotals(level) {
  return zoneIds(level).reduce((t, z) => {
    const q = zoneQuota(level, z);
    return { candidates: t.candidates + zoneCandidates(level, z).length, turret: t.turret + q.turret, feature: t.feature + q.feature, vacant: t.vacant + q.vacant };
  }, { candidates: 0, turret: 0, feature: 0, vacant: 0 });
}

