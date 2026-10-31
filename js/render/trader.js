// The Wandering Trader's scene art (M2n §4.2), placeholder and procedural, on the place scene
// template (placeScene.js): a cart with a hanging lantern and a small campfire behind, the
// hooded pedlar with his big pack (a colour variation per trader), the blanket his goods lie on,
// the Druid's satchel, and the balance scale in the centre.

import * as C from '../config.js';
import { drawPlaceScene } from './placeScene.js';
import { drawShadow } from './environment.js';

const COLORS = {
  wood: '#6a4a2c',
  woodDark: '#3e2a18',
  woodLight: '#8a6a40',
  canvas: '#c9b48a',
  canvasShade: '#a8936a',
  wheel: '#4a3420',
  iron: '#3a3632',
  lanternGlass: '#ffd98a',
  flame: ['#ffdd70', '#ff9a30', '#e2551e'],
  stone: '#5c574c',
  skin: '#d9b08c',
  shadowFace: '#1d140c',
  eye: '#ffe6a0',
  blanket: '#8c2f2a',
  blanketStripe: '#d7b25c',
  blanketEdge: '#5e1f1c',
  satchel: '#7a5432',
  satchelDark: '#53371f',
  strap: '#4a3220',
  brass: '#c9a23c',
  brassDark: '#8a6d24',
};

// The whole scene for the visit (game.visit). t: the visit's clock, s.
export function drawTraderScene(ctx, visit, t) {
  const look = C.TRADER_LOOKS[visit.trader.look % C.TRADER_LOOKS.length];
  const tip = scaleTip(visit);
  drawPlaceScene(ctx, {
    id: 'trader',
    drawProps: (c) => {
      drawCampfire(c, C.TRADER_SCENE.campfire.x, C.TRADER_SCENE.campfire.y, t);
      drawCart(c, C.TRADER_SCENE.cart.x, C.TRADER_SCENE.cart.y, t);
    },
    drawDruidExtras: (c, x, y) => drawSatchel(c, x, y),
    drawHost: (c, x, y) => drawPedlar(c, x, y, look, t),
    drawForeground: (c) => {
      drawBlanket(c, C.TRADER_SCENE.blanket);
      drawBalance(c, C.TRADER_SCENE.scale.x, C.TRADER_SCENE.scale.y, tip);
    },
  }, t);
}

// The scale's tilt after a trade (§4.3 step 5): it dips toward the trader, then settles with a
// small wobble. 0 at rest; positive tips right.
function scaleTip(visit) {
  const age = visit.time - visit.lastTradeAt;
  if (!(age >= 0 && age < C.TRADER_SCALE_TIP_TIME)) return 0;
  const k = age / C.TRADER_SCALE_TIP_TIME;
  return 0.28 * Math.sin(Math.min(1, k * 3) * Math.PI / 2) * (1 - k) * Math.cos(k * Math.PI * 3);
}

function drawCart(ctx, x, y, t) {
  ctx.save();
  drawShadow(ctx, x, y + 6, 150, 22);
  // Bed and canvas cover (a hooped tilt).
  ctx.fillStyle = COLORS.woodDark;
  ctx.fillRect(x - 140, y - 70, 280, 50);
  ctx.fillStyle = COLORS.wood;
  ctx.fillRect(x - 136, y - 66, 272, 42);
  ctx.strokeStyle = COLORS.woodDark;
  ctx.lineWidth = 2;
  for (let i = -100; i <= 100; i += 50) {
    ctx.beginPath();
    ctx.moveTo(x + i, y - 66);
    ctx.lineTo(x + i, y - 24);
    ctx.stroke();
  }
  ctx.fillStyle = COLORS.canvasShade;
  ctx.beginPath();
  ctx.moveTo(x - 130, y - 68);
  ctx.bezierCurveTo(x - 130, y - 200, x + 130, y - 200, x + 130, y - 68);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.canvas;
  ctx.beginPath();
  ctx.moveTo(x - 118, y - 68);
  ctx.bezierCurveTo(x - 118, y - 186, x + 118, y - 186, x + 118, y - 68);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COLORS.canvasShade;
  ctx.lineWidth = 3;
  for (const k of [-0.5, 0, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(x + k * 200, y - 68);
    ctx.quadraticCurveTo(x + k * 190, y - 150, x + k * 120, y - 170);
    ctx.stroke();
  }
  // Wheels.
  for (const wx of [x - 90, x + 90]) {
    ctx.strokeStyle = COLORS.wheel;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(wx, y - 14, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3;
    for (let a = 0; a < Math.PI; a += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(wx - Math.cos(a) * 32, y - 14 - Math.sin(a) * 32);
      ctx.lineTo(wx + Math.cos(a) * 32, y - 14 + Math.sin(a) * 32);
      ctx.stroke();
    }
  }
  // Shafts resting on the ground, and the lantern on a pole at the front corner.
  ctx.strokeStyle = COLORS.woodLight;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x - 136, y - 40);
  ctx.lineTo(x - 230, y + 4);
  ctx.stroke();
  ctx.strokeStyle = COLORS.woodDark;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 128, y - 66);
  ctx.lineTo(x - 128, y - 210);
  ctx.lineTo(x - 170, y - 210);
  ctx.stroke();
  drawLantern(ctx, x - 170, y - 208, t);
  ctx.restore();
}

// A lantern hanging from a hook, its glow breathing a little. (x, y): the hook.
function drawLantern(ctx, x, y, t) {
  const flicker = 0.85 + 0.1 * Math.sin(t * 7.3) + 0.05 * Math.sin(t * 13.1);
  ctx.save();
  const g = ctx.createRadialGradient(x, y + 30, 0, x, y + 30, 120 * flicker);
  g.addColorStop(0, 'rgba(255, 200, 110, 0.35)');
  g.addColorStop(1, 'rgba(255, 200, 110, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 130, y - 100, 260, 260);
  ctx.strokeStyle = COLORS.iron;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + 12);
  ctx.stroke();
  ctx.fillStyle = COLORS.iron;
  ctx.fillRect(x - 12, y + 12, 24, 5);
  ctx.fillRect(x - 12, y + 45, 24, 5);
  ctx.globalAlpha = flicker;
  ctx.fillStyle = COLORS.lanternGlass;
  ctx.fillRect(x - 10, y + 17, 20, 28);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = COLORS.iron;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 10, y + 17, 20, 28);
  ctx.beginPath();
  ctx.moveTo(x, y + 17);
  ctx.lineTo(x, y + 45);
  ctx.stroke();
  ctx.restore();
}

// A small campfire in a stone ring: three flickering flame tongues and a warm glow.
function drawCampfire(ctx, x, y, t) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y - 10, 0, x, y - 10, 140);
  g.addColorStop(0, 'rgba(255, 150, 60, 0.32)');
  g.addColorStop(1, 'rgba(255, 150, 60, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 150, y - 150, 300, 300);
  ctx.fillStyle = COLORS.stone;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * 30, y + Math.sin(a) * 10, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = COLORS.woodDark;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 20, y + 4);
  ctx.lineTo(x + 18, y - 6);
  ctx.moveTo(x + 20, y + 4);
  ctx.lineTo(x - 16, y - 6);
  ctx.stroke();
  COLORS.flame.forEach((color, i) => {
    const h = (40 - i * 10) * (0.85 + 0.15 * Math.sin(t * (9 + i * 3) + i));
    const w = 16 - i * 4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x - w * 0.6, y - h * 0.6, x + Math.sin(t * 5 + i) * 4, y - h);
    ctx.quadraticCurveTo(x + w * 0.6, y - h * 0.6, x + w, y);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

// The hooded pedlar (unscaled; feet at (x, y)): a big pack on his back, a cloak in his look's
// colours, a shadowed face with two glinting eyes, a hand raised now and then.
function drawPedlar(ctx, x, y, look, t) {
  ctx.save();
  drawShadow(ctx, x, y, 34, 9);
  // The pack behind him, with a rolled blanket and a pot tied on.
  ctx.fillStyle = look.pack;
  ctx.beginPath();
  ctx.ellipse(x + 22, y - 74, 34, 46, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.canvas;
  ctx.beginPath();
  ctx.ellipse(x + 26, y - 120, 30, 10, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.iron;
  ctx.beginPath();
  ctx.arc(x + 50, y - 56, 9, 0, Math.PI * 2);
  ctx.fill();
  // Cloak: a wide bell shape.
  ctx.fillStyle = look.cloak;
  ctx.beginPath();
  ctx.moveTo(x - 26, y);
  ctx.quadraticCurveTo(x - 24, y - 50, x - 10, y - 66);
  ctx.lineTo(x + 10, y - 66);
  ctx.quadraticCurveTo(x + 24, y - 50, x + 26, y);
  ctx.closePath();
  ctx.fill();
  // Hood, its lining, and the face in shadow.
  ctx.beginPath();
  ctx.ellipse(x, y - 76, 17, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = look.lining;
  ctx.beginPath();
  ctx.ellipse(x - 2, y - 73, 12, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.shadowFace;
  ctx.beginPath();
  ctx.ellipse(x - 3, y - 71, 9, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  const blink = (t % 4.3) < 0.12; // a blink every few seconds
  if (!blink) {
    ctx.fillStyle = COLORS.eye;
    for (const ex of [-7, 1]) {
      ctx.beginPath();
      ctx.arc(x + ex, y - 73, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Nose poking out, and a hand on a staff.
  ctx.fillStyle = COLORS.skin;
  ctx.beginPath();
  ctx.arc(x - 9, y - 68, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.woodLight;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 30, y + 2);
  ctx.lineTo(x - 26, y - 92);
  ctx.stroke();
  const raise = Math.max(0, Math.sin(t * 0.8)) * 4; // a slow beckoning lift
  ctx.fillStyle = COLORS.skin;
  ctx.beginPath();
  ctx.arc(x - 27, y - 46 - raise, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// The blanket the goods lie on: a striped red rug in perspective.
function drawBlanket(ctx, { x, y, rx, ry }) {
  ctx.save();
  ctx.fillStyle = COLORS.blanketEdge;
  ctx.beginPath();
  ctx.moveTo(x - rx * 0.85, y - ry);
  ctx.lineTo(x + rx * 0.85, y - ry);
  ctx.lineTo(x + rx, y + ry + 6);
  ctx.lineTo(x - rx, y + ry + 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.blanket;
  ctx.beginPath();
  ctx.moveTo(x - rx * 0.85, y - ry);
  ctx.lineTo(x + rx * 0.85, y - ry);
  ctx.lineTo(x + rx, y + ry);
  ctx.lineTo(x - rx, y + ry);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COLORS.blanketStripe;
  ctx.lineWidth = 4;
  for (const k of [-0.6, 0.6]) {
    ctx.beginPath();
    ctx.moveTo(x - rx * (0.85 + 0.15 * (k + 1) / 2), y + ry * k);
    ctx.lineTo(x + rx * (0.85 + 0.15 * (k + 1) / 2), y + ry * k);
    ctx.stroke();
  }
  ctx.restore();
}

// The Druid's satchel at his hip (unscaled; his feet at (x, y)).
function drawSatchel(ctx, x, y) {
  const r = C.DRUID_RADIUS;
  ctx.save();
  ctx.strokeStyle = COLORS.strap;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y - r * 2.1);
  ctx.lineTo(x + r * 0.75, y - r * 0.9);
  ctx.stroke();
  ctx.fillStyle = COLORS.satchel;
  ctx.beginPath();
  ctx.roundRect(x + r * 0.45, y - r * 1.05, r * 0.85, r * 0.7, 4);
  ctx.fill();
  ctx.fillStyle = COLORS.satchelDark;
  ctx.beginPath();
  ctx.roundRect(x + r * 0.45, y - r * 1.05, r * 0.85, r * 0.3, 4);
  ctx.fill();
  ctx.fillStyle = COLORS.brass;
  ctx.beginPath();
  ctx.arc(x + r * 0.87, y - r * 0.75, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// The balance scale (§4.2 centre): a post, a beam tilted by `tip` (radians, positive dips right,
// toward the trader) and two pans hanging level.
function drawBalance(ctx, x, y, tip) {
  ctx.save();
  drawShadow(ctx, x, y + 4, 60, 12);
  ctx.fillStyle = COLORS.brassDark;
  ctx.beginPath();
  ctx.ellipse(x, y, 40, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.brass;
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x, y - 4);
  ctx.lineTo(x, y - 150);
  ctx.stroke();
  const half = 110;
  const cos = Math.cos(tip);
  const sin = Math.sin(tip);
  const ends = [-1, 1].map((s) => ({ x: x + s * half * cos, y: y - 150 + s * half * sin }));
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(ends[0].x, ends[0].y);
  ctx.lineTo(ends[1].x, ends[1].y);
  ctx.stroke();
  ctx.fillStyle = COLORS.brass;
  ctx.beginPath();
  ctx.arc(x, y - 150, 9, 0, Math.PI * 2);
  ctx.fill();
  for (const e of ends) {
    ctx.strokeStyle = COLORS.brassDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x - 30, e.y + 60);
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x + 30, e.y + 60);
    ctx.stroke();
    ctx.fillStyle = COLORS.brass;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + 62, 38, 9, 0, 0, Math.PI);
    ctx.fill();
  }
  ctx.restore();
}
