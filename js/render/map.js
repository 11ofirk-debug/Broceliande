// The level map (M2a §4), drawn from the run's generated map (M2g): a calm, dark forest background
// with faint tree clusters, gently curved dashed roads for every `next` link, and the nodes in their state
// (available, completed, locked, bypassed), with names, the hovered node, the Druid token and,
// in debug, node IDs and links. Visual only: reads the run, never changes it.

import * as C from '../config.js';
import { createRng } from '../rng.js';
import { mapNode, nodeState, nodeRadius } from '../run.js';
import { roadCurve, curvePoint, nodeDegrees, pathTotal } from '../mapGen.js';
import { drawWolfHead, drawDruid, DRUID_REST_POSE } from './entities.js';

const COLORS = {
  ground: '#232a1d',
  groundLight: '#33392a',
  cluster: 'rgba(14, 22, 12, 0.55)',
  clusterLight: 'rgba(60, 74, 44, 0.35)',
  road: 'rgba(196, 178, 128, 0.38)',
  roadLit: 'rgba(240, 222, 168, 0.95)',
  roadBypassed: 'rgba(110, 110, 100, 0.28)',
  node: '#4a3221',
  rim: '#dcc99a',
  head: '#ece0c2',
  glow: '255, 233, 168',
  victory: '#d6302a',
  bossRim: '#8e1f1a',
  bossGlow: '200, 30, 20',
  label: '#f1e8cc',
  debug: 'rgba(120, 220, 255, 0.95)',
};

// Faint tree clusters, scattered with MAP_DECOR_SEED and kept clear of the nodes and their names;
// once per map, since the nodes move with each run's map (M2g).
const clustersByMap = new WeakMap();
function mapClusters(map) {
  if (clustersByMap.has(map)) return clustersByMap.get(map);
  const rng = createRng(C.MAP_DECOR_SEED);
  const clusters = [];
  for (let i = 0; i < 150; i++) { // over the whole screen, minus the clearing
    const x = rng.range(0, C.STAGE_WIDTH);
    const y = rng.range(C.HUD_STRIP_HEIGHT, C.STAGE_HEIGHT);
    const blobs = Array.from({ length: rng.int(3, 7) }, () => ({ dx: rng.range(-34, 34), dy: rng.range(-18, 18), r: rng.range(10, 24) }));
    const clear = map.nodes.every((n) => Math.hypot(n.pos.x - x, n.pos.y + 20 - y) > C.MAP_NODE_RADIUS + 80);
    // M2e (revised): a natural clearing round the equipment, its edge ragged rather than a line.
    const e = C.EQUIP_CLEARING;
    const inClearing = Math.hypot((x - e.x) / e.rx, (y - e.y) / e.ry) < 1 + rng.range(-C.EQUIP_CLEARING_RAGGED, C.EQUIP_CLEARING_RAGGED);
    if (clear && !inClearing) clusters.push({ x, y, blobs });
  }
  clustersByMap.set(map, clusters);
  return clusters;
}

// A road from node a up to node b (M2g §2.4): its quadratic curve, bowing `bend` px sideways,
// starting and ending just outside the two circles.
function roadPoints(a, b, bend) {
  const curve = roadCurve(a, b, bend);
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const p = curvePoint(curve, i / 40);
    if (Math.hypot(p.x - a.pos.x, p.y - a.pos.y) > nodeRadius(a) + 10 && Math.hypot(p.x - b.pos.x, p.y - b.pos.y) > nodeRadius(b) + 10) pts.push(p);
  }
  return pts;
}

// Road style (§4.3): lit from a won node to its available children; greyed to a bypassed node;
// faint otherwise.
function roadStyle(run, from, to) {
  const toState = nodeState(run, to.id);
  if (toState === 'bypassed') return { color: COLORS.roadBypassed, width: 4 };
  if (nodeState(run, from.id) === 'completed' && toState !== 'locked') return { color: COLORS.roadLit, width: 6 };
  return { color: COLORS.road, width: 4 };
}

// Icon draw functions named by NODE_TYPES (M2c §1.1).
const NODE_ICONS = { wolfHead: drawWolfHead, lantern: drawLanternIcon };

const STATE_ALPHA = { available: 1, completed: 1, locked: 0.5, bypassed: 0.3 };

function drawNode(ctx, node, state, hovered, t) {
  const type = C.NODE_TYPES[node.type];
  const r = nodeRadius(node) * (hovered ? C.MAP_HOVER_SCALE : 1);
  const { x, y } = node.pos;
  ctx.save();
  ctx.globalAlpha = STATE_ALPHA[state];
  if (state === 'available') {
    const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * C.MAP_PULSE_HZ);
    const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r + 22);
    g.addColorStop(0, `rgba(${COLORS.glow}, ${0.35 + 0.35 * pulse})`);
    g.addColorStop(1, `rgba(${COLORS.glow}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r + 22, 0, Math.PI * 2);
    ctx.fill();
  }
  if (type.large) drawBossPulse(ctx, x, y, r, t); // M2f §2: a slow, faint red pulse round the Boss
  ctx.fillStyle = type.fill ?? COLORS.node;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = type.rim ?? (type.large ? COLORS.bossRim : COLORS.rim);
  ctx.lineWidth = type.large ? 6 : 4;
  ctx.stroke();
  // Icon per node type (M2c §1.1): the wolf's head, with red eyes for Fell Wilds and the Boss.
  NODE_ICONS[type.icon](ctx, x, y + r * 0.04, r * 0.62, COLORS.head, type.fill ?? COLORS.node, { redEyes: type.redEyes });
  if (state === 'completed' && type.completedMark === 'coin') {
    drawCoinMark(ctx, x + r * 0.55, y + r * 0.5, r * 0.42); // M2n §2.2: a visited Trader
  } else if (state === 'completed') {
    // A bold red V over the circle.
    ctx.strokeStyle = COLORS.victory;
    ctx.lineWidth = r * 0.23; // scales with the node (M2e §4.6)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.62, y - r * 0.5);
    ctx.lineTo(x - r * 0.05, y + r * 0.62);
    ctx.lineTo(x + r * 0.7, y - r * 0.78);
    ctx.stroke();
  }
  ctx.font = `italic ${C.MAP_LABEL_FONT_PX}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = COLORS.label;
  const lines = labelLines(ctx, node.name);
  const lineY = (i) => y + nodeRadius(node) + 8 + i * (C.MAP_LABEL_FONT_PX + 2);
  // A soft dark pill behind each line, so roads pass behind the name and it stays readable.
  const pill = C.MAP_LABEL_PILL;
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.fillStyle = pill.color;
  lines.forEach((line, i) => {
    const w = ctx.measureText(line).width + pill.padX * 2;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, lineY(i) - pill.padY, w, C.MAP_LABEL_FONT_PX + pill.padY * 2 + 1, pill.radius);
    ctx.fill();
  });
  ctx.restore();
  lines.forEach((line, i) => ctx.fillText(line, x, lineY(i)));
  ctx.restore();
}

// The Trader node's icon (M2n §2.2): a lantern silhouette with a warm glowing pane. Same
// signature as the other node icons; size: about its half-height.
function drawLanternIcon(ctx, x, y, size, color, cutColor) {
  const s = size;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.12;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.78, s * 0.2, Math.PI, 0); // the ring on top
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.42, y - s * 0.5);       // the cap
  ctx.lineTo(x + s * 0.42, y - s * 0.5);
  ctx.lineTo(x + s * 0.22, y - s * 0.72);
  ctx.lineTo(x - s * 0.22, y - s * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - s * 0.5, y + s * 0.5, s, s * 0.16); // the base
  ctx.fillStyle = '#ffd77a';                   // the glowing pane
  ctx.shadowColor = 'rgba(255, 200, 90, 0.9)';
  ctx.shadowBlur = s * 0.5;
  ctx.fillRect(x - s * 0.34, y - s * 0.5, s * 0.68, s);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = cutColor;                  // the frame bars
  ctx.lineWidth = s * 0.08;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.5);
  ctx.lineTo(x, y + s * 0.5);
  ctx.stroke();
  ctx.restore();
}

// A visited Trader's mark (M2n §2.2), in place of the red V: a small gold coin.
function drawCoinMark(ctx, x, y, r) {
  ctx.save();
  ctx.fillStyle = '#e8b830';
  ctx.strokeStyle = '#8a6414';
  ctx.lineWidth = r * 0.18;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#fff0b0';
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.6, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
  ctx.restore();
}

// The Boss node's slow, faint red pulse (M2f §2), in every state.
function drawBossPulse(ctx, x, y, r, t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * C.MAP_BOSS_PULSE_HZ);
  const g = ctx.createRadialGradient(x, y, r * 0.9, x, y, r + 30);
  g.addColorStop(0, `rgba(${COLORS.bossGlow}, ${0.18 + 0.22 * pulse})`);
  g.addColorStop(1, `rgba(${COLORS.bossGlow}, 0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r + 30, 0, Math.PI * 2);
  ctx.fill();
}

// A node name in one line, or two if wider than MAP_LABEL_MAX_WIDTH (split at the space nearest
// the middle; M2e §4.6). ctx must have the label font set.
function labelLines(ctx, name) {
  if (ctx.measureText(name).width <= C.MAP_LABEL_MAX_WIDTH || !name.includes(' ')) return [name];
  const spaces = [...name.matchAll(/ /g)].map((m) => m.index);
  const cut = spaces.reduce((a, b) => (Math.abs(b - name.length / 2) < Math.abs(a - name.length / 2) ? b : a));
  return [name.slice(0, cut), name.slice(cut + 1)];
}

// The Druid token (§4.3 SHOULD): beside the node he last won, or beside the start node (M2e:
// the smaller map leaves no room below it).
function drawDruidToken(ctx, run) {
  const won = run.completedNodeIds;
  const node = mapNode(run, won.length ? won[won.length - 1] : C.MAP_START_NODE);
  const at = won.length
    ? { x: node.pos.x + nodeRadius(node) + 34, y: node.pos.y + 6 }    // beside it
    : { x: node.pos.x - C.MAP_NODE_RADIUS - 34, y: node.pos.y + 6 };   // beside the start node, on its left
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(0.6, 0.6);
  drawDruid(ctx, 0, 0, false, 0, DRUID_REST_POSE);
  ctx.restore();
}

// hoverId: the available node under the pointer, or null. t: s (real time) for the pulse.
export function drawMap(ctx, run, hoverId, t, debug) {
  const mx = C.STAGE_WIDTH / 2; // the ground runs across the whole screen (M2e, revised)
  const g = ctx.createRadialGradient(mx, C.STAGE_HEIGHT * 0.6, 100, mx, C.STAGE_HEIGHT * 0.6, C.STAGE_WIDTH * 0.6);
  g.addColorStop(0, COLORS.groundLight);
  g.addColorStop(1, COLORS.ground);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, C.STAGE_WIDTH, C.STAGE_HEIGHT);
  const map = run.map;
  for (const c of mapClusters(map)) {
    for (const [fill, k] of [[COLORS.cluster, 1], [COLORS.clusterLight, 0.45]]) {
      ctx.fillStyle = fill;
      for (const b of c.blobs) {
        ctx.beginPath();
        ctx.arc(c.x + b.dx - (1 - k) * 4, c.y + b.dy - (1 - k) * 6, b.r * k, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.setLineDash([16, 12]);
  for (const road of map.roads) {
    const node = mapNode(run, road.from);
    const next = mapNode(run, road.to);
    const style = roadStyle(run, node, next);
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.beginPath();
    roadPoints(node, next, road.bend ?? 0).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.restore();

  for (const node of map.nodes) drawNode(ctx, node, nodeState(run, node.id), node.id === hoverId, t);
  drawDruidToken(ctx, run);

  if (debug) {
    ctx.save();
    ctx.font = '15px monospace';
    ctx.fillStyle = COLORS.debug;
    ctx.textBaseline = 'top';
    // M2g §4: each node's in / out degree, the attempts used and the check that failed most.
    const deg = nodeDegrees(map);
    const counts = Object.entries(map.failCounts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    const head = [
      `Map: ${map.attempts}/${C.MAP_MAX_ATTEMPTS} attempts  paths ${pathTotal(map)}${map.failed.length ? `  FAILS: ${map.failed.join(', ')}` : ''}${C.MAP_RANDOMISE ? '' : `  FIXED (seed ${C.MAP_FIXED_SEED})`}  (L = new map)`,
      `Failed most: ${counts.length ? counts.map(([c, n]) => `${c} ${n}`).join(', ') : 'none'}`,
      `Traders in rows: ${map.traderRows.map((i) => map.rows[i][0].row).join(', ') || 'none'}${map.movedTrader ? ' (moved: its first row never passed)' : ''}`,
    ];
    head.forEach((line, i) => ctx.fillText(line, C.EQUIP_PANEL_WIDTH + 24, C.HUD_STRIP_HEIGHT + 16 + i * 20));
    map.nodes.forEach((n, i) => {
      ctx.fillText(`${n.id} (${n.levelId ?? n.type}) → [${n.next.join(', ')}]  ${nodeState(run, n.id)}`, C.EQUIP_PANEL_WIDTH + 24, C.HUD_STRIP_HEIGHT + 80 + i * 20);
      ctx.fillText(`${n.id}  in ${deg[n.id].in} / out ${deg[n.id].out}`, n.pos.x - C.MAP_NODE_RADIUS, n.pos.y - C.MAP_NODE_RADIUS - 22);
    });
    ctx.restore();
  }
}
