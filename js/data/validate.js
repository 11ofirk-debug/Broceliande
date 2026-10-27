// Reference and completeness checks on the loaded tabs (M2j §4.2), before the data is applied.
// Adds { tab, row, column, message } problems to problems.errors / problems.warnings. The existing
// per-level start-up checks (candidates, corridors, zones, Ogre widths…) run later, on the applied
// data, as before.

import { RESOURCE_IDS, SUMMON_KINDS, SLOT_TYPES, NODE_TYPES, LEVEL_GEOMETRY } from '../config.js';
import { GLOBAL_TYPES, DRUID_KEYS } from './schema.js';
import { STAT_KEYS } from '../stats.js';

export function validateTables(t, problems) {
  const err = (tab, row, column, message) => problems.errors.push({ tab, row: row?._row ?? row ?? '', column, message });
  const warn = (tab, row, column, message) => problems.warnings.push({ tab, row: row?._row ?? row ?? '', column, message });

  // IDs unique within a tab; returns the set.
  const ids = (tab, col = 'id') => {
    const seen = new Set();
    for (const r of t[tab]) {
      if (r[col] === undefined) continue;
      if (seen.has(r[col])) err(tab, r, col, `duplicate ${col} "${r[col]}"`);
      seen.add(r[col]);
    }
    return seen;
  };
  const known = (tab, r, col, set, what) => {
    if (r[col] !== undefined && !set.has(r[col])) err(tab, r, col, `unknown ${what} "${r[col]}"`);
  };

  // globals and druid: every key present.
  for (const [tab, keys] of [['globals', GLOBAL_TYPES], ['druid', DRUID_KEYS]]) {
    const present = ids(tab, 'key');
    for (const k of Object.keys(keys)) if (!present.has(k)) err(tab, '', 'key', `missing setting ${k}`);
  }

  // resources: exactly the ones the game draws (icons, HUD).
  const resources = ids('resources');
  for (const id of RESOURCE_IDS) if (!resources.has(id)) err('resources', '', 'id', `missing resource ${id}`);
  for (const r of t.resources) if (!RESOURCE_IDS.includes(r.id)) err('resources', r, 'id', `unknown resource "${r.id}" (the game only draws ${RESOURCE_IDS.join(', ')})`);
  const resourceColumns = (tab, r, prefix, suffixes) => {
    for (const col of Object.keys(r)) {
      const m = col.match(new RegExp(`^${prefix}([a-zA-Z0-9]+)${suffixes}$`));
      if (m && !resources.has(m[1])) err(tab, r, col, `unknown resource "${m[1]}" in the column name`);
    }
  };

  // features
  const features = ids('features');
  for (const r of t.features) {
    known('features', r, 'mainResource', resources, 'resource');
    resourceColumns('features', r, '', '_(min|max)');
    for (const res of resources) {
      const lo = r[`${res}_min`];
      const hi = r[`${res}_max`];
      if ((lo === undefined) !== (hi === undefined)) err('features', r, `${res}_min`, `${res}_min and ${res}_max must both be set or both blank`);
      else if (lo > hi) err('features', r, `${res}_min`, `${res}_min is more than ${res}_max`);
    }
  }

  // enemies and drops
  const enemies = ids('enemies');
  for (const r of t.drops) {
    known('drops', r, 'enemy', enemies, 'enemy');
    known('drops', r, 'resource', resources, 'resource');
    if (r.chance < 0 || r.chance > 1) err('drops', r, 'chance', 'chance must be between 0 and 1');
    if (r.min > r.max) err('drops', r, 'min', 'min is more than max');
  }
  for (const r of t.enemies) if (r.flying && r.flyHeight === undefined) err('enemies', r, 'flyHeight', 'a flying enemy needs flyHeight');

  // turrets: levels 1, 2, 3… per turret; cloud attacks need their cloud values.
  const turretLevels = {};
  for (const r of t.turrets) {
    resourceColumns('turrets', r, 'cost_', '');
    (turretLevels[r.turret] ??= []).push(r);
    if (r.attack !== 'projectile' && r.attack !== 'cloud') err('turrets', r, 'attack', `attack must be projectile or cloud, not "${r.attack}"`);
    if (r.attack === 'cloud') {
      for (const c of ['cloudRadius', 'cloudDuration', 'cloudTick', 'cloudTickDamage']) if (r[c] === undefined) err('turrets', r, c, 'a cloud turret needs a value');
    }
  }
  for (const [id, rows] of Object.entries(turretLevels)) {
    rows.forEach((r, i) => { if (r.level !== i + 1) err('turrets', r, 'level', `${id}'s levels must be 1, 2, 3… in order`); });
  }
  if (!turretLevels.sprinkler) err('turrets', '', 'turret', 'missing the sprinkler (its range sets lane coverage)');

  // summons: the kinds the game has.
  const summons = ids('summons');
  for (const k of SUMMON_KINDS) if (!summons.has(k)) err('summons', '', 'id', `missing summon ${k}`);
  for (const r of t.summons) {
    if (!SUMMON_KINDS.includes(r.id)) err('summons', r, 'id', `unknown summon "${r.id}" (the game has ${SUMMON_KINDS.join(', ')})`);
    if (r.key !== undefined && r.key.length !== 1) err('summons', r, 'key', 'key must be a single character');
    resourceColumns('summons', r, 'cost_', '');
  }

  // stats and items
  const stats = ids('stats', 'stat');
  for (const r of t.stats) if (!STAT_KEYS.includes(r.stat)) err('stats', r, 'stat', `unknown stat "${r.stat}" (the game has ${STAT_KEYS.join(', ')})`);
  ids('items');
  for (const r of t.items) {
    if (!SLOT_TYPES[r.slot]) err('items', r, 'slot', `unknown slot "${r.slot}"`);
    for (const col of Object.keys(r)) {
      const m = col.match(/^effect(\d+)_stat$/);
      if (!m) continue;
      const n = m[1];
      if (!stats.has(r[col])) err('items', r, col, `unknown stat "${r[col]}" (see the stats tab)`);
      if (r[`effect${n}_op`] !== 'add' && r[`effect${n}_op`] !== 'mult') err('items', r, `effect${n}_op`, 'op must be add or mult');
      if (r[`effect${n}_value`] === undefined) err('items', r, `effect${n}_value`, 'a value is required');
    }
  }

  // levels: each has its geometry in code, and vice versa; candidates, a palette, waves.
  const levels = ids('levels');
  for (const r of t.levels) {
    if (!LEVEL_GEOMETRY[r.id]) err('levels', r, 'id', `no level "${r.id}" in the code (lanes and decoration live in config.js LEVEL_GEOMETRY)`);
    if (!NODE_TYPES[r.nodeType]) err('levels', r, 'nodeType', `unknown node type "${r.nodeType}" (${Object.keys(NODE_TYPES).join(', ')})`);
    for (const col of Object.keys(r)) {
      const m = col.match(/^mix_(.+)$/);
      if (m && !features.has(m[1])) err('levels', r, col, `unknown feature "${m[1]}" in the column name`);
    }
  }
  for (const id of Object.keys(LEVEL_GEOMETRY)) if (!levels.has(id)) err('levels', '', 'id', `missing level ${id}`);
  const laneIds = (level) => new Set((LEVEL_GEOMETRY[level]?.lanes ?? []).map((l) => l.id));

  // waves and spawns
  const waveKeys = new Set();
  const waveCounts = {};
  for (const r of t.waves) {
    known('waves', r, 'level', levels, 'level');
    const key = `${r.level}:${r.wave}`;
    if (waveKeys.has(key)) err('waves', r, 'wave', `duplicate wave ${r.wave} of ${r.level}`);
    waveKeys.add(key);
    waveCounts[r.level] = (waveCounts[r.level] ?? 0) + 1;
    if (r.wave !== waveCounts[r.level]) err('waves', r, 'wave', `${r.level}'s waves must be numbered 1, 2, 3… in order`);
  }
  const spawned = new Set();
  for (const r of t.spawns) {
    known('spawns', r, 'level', levels, 'level');
    known('spawns', r, 'type', enemies, 'enemy');
    if (r.level !== undefined && r.wave !== undefined && !waveKeys.has(`${r.level}:${r.wave}`)) err('spawns', r, 'wave', `${r.level} has no wave ${r.wave} in the waves tab`);
    if (r.lane !== undefined && r.lane !== 'random' && levels.has(r.level) && !laneIds(r.level).has(r.lane)) {
      err('spawns', r, 'lane', `unknown lane "${r.lane}" in ${r.level} (${[...laneIds(r.level)].join(', ')} or random)`);
    }
    if (r.count < 1) err('spawns', r, 'count', 'count must be at least 1');
    if (r.t < 0) err('spawns', r, 't', 't must be 0 or more');
    spawned.add(`${r.level}:${r.wave}`);
  }
  for (const r of t.waves) if (!spawned.has(`${r.level}:${r.wave}`)) err('waves', r, 'wave', `wave ${r.wave} of ${r.level} has no spawns`);

  // candidates: indices 0, 1, 2… per level
  const candidateCounts = {};
  for (const r of t.candidates) {
    known('candidates', r, 'level', levels, 'level');
    candidateCounts[r.level] = (candidateCounts[r.level] ?? 0) + 1;
    if (r.index !== candidateCounts[r.level] - 1) err('candidates', r, 'index', `${r.level}'s candidates must be indexed 0, 1, 2… in order`);
  }

  // palettes
  const palettes = ids('palettes', 'level');
  for (const r of t.palettes) known('palettes', r, 'level', levels, 'level');

  ids('sounds');

  for (const r of t.levels) {
    if (!waveCounts[r.id]) err('levels', r, 'id', `${r.id} has no waves`);
    if (!candidateCounts[r.id]) err('levels', r, 'id', `${r.id} has no candidates`);
    if (!palettes.has(r.id)) err('levels', r, 'id', `${r.id} has no palette`);
  }
  return problems;
}
