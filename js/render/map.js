// The level map (M2a §4), drawn from MAP_NODES and the run: a calm, dark forest background with
// faint tree clusters, winding dashed roads for every `next` link, and the nodes in their state
// (available, completed, locked, bypassed), with names, the hovered node, the Druid token and,
// in debug, node IDs and links. Visual only: reads the run, never changes it.

import * as C from '../config.js';
import { createRng } from '../rng.js';
import { mapNode, nodeState, nodeRadius } from '../run.js';
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

// Faint tree clusters, scattered once with MAP_DECOR_SEED and kept clear of the nodes and their names.
let clusters = null;
function mapClusters() {
  if (clusters) return clusters;
  const rng = createRng(C.MAP_DECOR_SEED);
  clusters = [];
  for (let i = 0; i < 150; i++) { // over the whole screen, minus the clearing
    const x = rng.range(0, C.STAGE_WIDTH);
    const y = rng.range(C.HUD_STRIP_HEIGHT, C.STAGE_HEIGHT);
    const blobs = Array.from({ length: rng.int(3, 7) }, () => ({ dx: rng.range(-34, 34), dy: rng.range(-18, 18), r: rng.range(10, 24) }));
    const clear = C.MAP_NODES.every((n) => Math.hypot(n.pos.x - x, n.pos.y + 20 - y) > C.MAP_NODE_RADIUS + 80);
    // M2e (revised): a natural clearing round the equipment, its edge ragged rather than a line.
    const e = C.EQUIP_CLEARING;
    const inClearing = Math.hypot((x - e.x) / e.rx, (y - e.y) / e.ry) < 1 + rng.range(-C.EQUIP_CLEARING_RAGGED, C.EQUIP_CLEARING_RAGGED);
    if (clear && !inClearing) clusters.push({ x, y, blobs });
  }
  return clusters;
}

// A road from node a up to node b: a gently winding line, the same every frame, starting and
// ending just outside the two circles. It bows towards the side a lies on (relative to b), so two
// roads into one node curve in from either side rather than overlapping (M2b §1.1).
function roadPoints(a, b) {
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const sign = Math.sign(nx * (a.pos.x - b.pos.x)) || 1;
  const gapA = (nodeRadius(a) + 10) / len; // each end just outside its own circle (a Boss node is larger)
  const gapB = (nodeRadius(b) + 10) / len;
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = gapA + (1 - gapA - gapB) * (i / 40);
    const sway = (Math.sin(t * Math.PI) * 1.0 + Math.sin(t * Math.PI * 3) * 0.35) * C.MAP_ROAD_WIGGLE * sign;
    pts.push({ x: a.pos.x + dx * t + nx * sway, y: a.pos.y + dy * t + ny * sway });
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
const NODE_ICONS = { wolfHead: drawWolfHead };

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
  ctx.fillStyle = COLORS.node;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = type.large ? COLORS.bossRim : COLORS.rim;
  ctx.lineWidth = type.large ? 6 : 4;
  ctx.stroke();
  // Icon per node type (M2c §1.1): the wolf's head, with red eyes for Fell Wilds and the Boss.
  NODE_ICONS[type.icon](ctx, x, y + r * 0.04, r * 0.62, COLORS.head, COLORS.node, { redEyes: type.redEyes });
  if (state === 'completed') {
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
  labelLines(ctx, node.name).forEach((line, i) => ctx.fillText(line, x, y + nodeRadius(node) + 8 + i * (C.MAP_LABEL_FONT_PX + 2)));
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
  const node = won.length ? mapNode(won[won.length - 1]) : mapNode(C.MAP_START_NODE);
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
  for (const c of mapClusters()) {
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
  for (const node of C.MAP_NODES) {
    for (const nextId of node.next) {
      const next = mapNode(nextId);
      const style = roadStyle(run, node, next);
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.width;
      ctx.beginPath();
      roadPoints(node, next).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
  }
  ctx.restore();

  for (const node of C.MAP_NODES) drawNode(ctx, node, nodeState(run, node.id), node.id === hoverId, t);
  drawDruidToken(ctx, run);

  if (debug) {
    ctx.save();
    ctx.font = '15px monospace';
    ctx.fillStyle = COLORS.debug;
    ctx.textBaseline = 'top';
    C.MAP_NODES.forEach((n, i) => {
      ctx.fillText(`${n.id} (${n.levelId}) → [${n.next.join(', ')}]  ${nodeState(run, n.id)}`, C.EQUIP_PANEL_WIDTH + 24, C.HUD_STRIP_HEIGHT + 16 + i * 20);
      ctx.fillText(n.id, n.pos.x - C.MAP_NODE_RADIUS, n.pos.y - C.MAP_NODE_RADIUS - 22);
    });
    ctx.restore();
  }
}
