// Equipment area drawing (M2e §4.2, as revised): a large, static Druid facing the viewer, his staff
// in his right hand (on the viewer's left), his hood pulled down over his eyes. Placeholder art in
// the Druid's colours; it never changes with equipment.
// Drawn in panel coordinates (the panel's own canvas).

import * as C from '../config.js';

const P = {
  robe: '#3d6b4a',
  robeDark: '#2b4f36',
  robeLight: '#4f8560',
  hood: '#4c7f58',
  skin: '#d9b48f',
  skinShade: '#c39a74',
  beard: '#e8e4d8',
  beardShade: '#c9c4b6',
  hoodShadow: 'rgba(20, 30, 22, 0.92)',
  belt: '#6b4a2c',
  boot: '#4a3324',
  staff: '#7a5530',
  staffDark: '#5a3d22',
  gem: '#9fe8a8',
};

export function drawEquipmentPortrait(ctx) {
  const { x, y, w, h } = C.EQUIP_PORTRAIT;
  ctx.save();
  const cx = x + w * 0.5 + 12; // body centre, a little right of the box centre (the staff is on the left)
  // Feet (boots), under the robe hem.
  ctx.fillStyle = P.boot;
  for (const dx of [-30, 30]) {
    ctx.beginPath();
    ctx.ellipse(cx + dx, y + h - 22, 26, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Robe: a long flaring trapezoid with a shaded fold down the middle.
  ctx.fillStyle = P.robe;
  ctx.beginPath();
  ctx.moveTo(cx - 52, y + 150);
  ctx.quadraticCurveTo(cx - 70, y + 260, cx - 92, y + h - 28);
  ctx.lineTo(cx + 92, y + h - 28);
  ctx.quadraticCurveTo(cx + 70, y + 260, cx + 52, y + 150);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.robeDark;
  ctx.beginPath();
  ctx.moveTo(cx - 6, y + 250);
  ctx.lineTo(cx - 22, y + h - 28);
  ctx.lineTo(cx + 22, y + h - 28);
  ctx.lineTo(cx + 6, y + 250);
  ctx.closePath();
  ctx.fill();
  // Shoulders and sleeves.
  ctx.fillStyle = P.robeLight;
  ctx.beginPath();
  ctx.ellipse(cx, y + 168, 66, 30, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  // Belt with a buckle at the waist.
  ctx.fillStyle = P.belt;
  ctx.fillRect(cx - 62, y + 236, 124, 16);
  ctx.strokeStyle = '#c8b27a';
  ctx.lineWidth = 3;
  ctx.strokeRect(cx - 9, y + 235, 18, 18);
  // Left arm (his left, viewer's right) hanging down.
  ctx.fillStyle = P.robe;
  ctx.beginPath();
  ctx.ellipse(cx + 62, y + 220, 18, 62, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.skin;
  ctx.beginPath();
  ctx.arc(cx + 70, y + 282, 12, 0, Math.PI * 2);
  ctx.fill();
  // Staff, held upright on the viewer's left, with its gem on top.
  const sx = C.EQUIP_SLOT_ANCHOR.grip.x;
  ctx.fillStyle = P.staff;
  ctx.fillRect(sx - 6, y + 28, 12, h - 36);
  ctx.fillStyle = P.staffDark;
  ctx.fillRect(sx + 2, y + 28, 4, h - 36);
  ctx.fillStyle = P.gem;
  ctx.beginPath();
  ctx.ellipse(sx, y + 22, 11, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // Right arm (his right, viewer's left) reaching to the staff, hand round it at the grip.
  ctx.fillStyle = P.robe;
  ctx.beginPath();
  ctx.moveTo(cx - 52, y + 160);
  ctx.quadraticCurveTo(cx - 90, y + 190, sx + 14, y + C.EQUIP_SLOT_ANCHOR.grip.y - y - 10);
  ctx.lineTo(sx + 18, y + C.EQUIP_SLOT_ANCHOR.grip.y - y + 14);
  ctx.quadraticCurveTo(cx - 70, y + 215, cx - 40, y + 200);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.skin;
  ctx.beginPath();
  ctx.ellipse(sx + 2, C.EQUIP_SLOT_ANCHOR.grip.y, 14, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hood and face, beard down over the chest.
  ctx.fillStyle = P.hood;
  ctx.beginPath();
  ctx.moveTo(cx, y + 34);
  ctx.quadraticCurveTo(cx + 62, y + 70, cx + 50, y + 160);
  ctx.lineTo(cx - 50, y + 160);
  ctx.quadraticCurveTo(cx - 62, y + 70, cx, y + 34);
  ctx.fill();
  ctx.fillStyle = P.skin;
  ctx.beginPath();
  ctx.ellipse(cx, y + 110, 30, 36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.skinShade;
  ctx.beginPath();
  ctx.ellipse(cx, y + 118, 6, 9, 0, 0, Math.PI * 2); // nose
  ctx.fill();
  // The hood comes down over his eyes: its brim covers the upper face, and its shadow fades out
  // just above the nose, so only his face from the nose down shows.
  const shade = ctx.createLinearGradient(0, y + 96, 0, y + 116);
  shade.addColorStop(0, P.hoodShadow);
  shade.addColorStop(1, 'rgba(20, 30, 22, 0)');
  ctx.fillStyle = shade;
  ctx.fillRect(cx - 32, y + 96, 64, 20);
  ctx.fillStyle = P.hood;
  ctx.beginPath();
  ctx.moveTo(cx - 44, y + 104);
  ctx.quadraticCurveTo(cx, y + 86, cx + 44, y + 104);
  ctx.quadraticCurveTo(cx + 34, y + 60, cx, y + 56);
  ctx.quadraticCurveTo(cx - 34, y + 60, cx - 44, y + 104);
  ctx.fill();
  ctx.fillStyle = P.hoodShadow;
  ctx.beginPath(); // the brim's underside, darkest just over the eyes
  ctx.moveTo(cx - 40, y + 102);
  ctx.quadraticCurveTo(cx, y + 86, cx + 40, y + 102);
  ctx.quadraticCurveTo(cx, y + 96, cx - 40, y + 102);
  ctx.fill();
  ctx.fillStyle = P.beard;
  ctx.beginPath();
  ctx.moveTo(cx - 30, y + 118);
  ctx.quadraticCurveTo(cx - 34, y + 180, cx, y + 222);
  ctx.quadraticCurveTo(cx + 34, y + 180, cx + 30, y + 118);
  ctx.quadraticCurveTo(cx, y + 136, cx - 30, y + 118);
  ctx.fill();
  ctx.strokeStyle = P.beardShade;
  ctx.lineWidth = 2;
  for (const dx of [-12, 0, 12]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx, y + 140);
    ctx.quadraticCurveTo(cx + dx * 1.2, y + 175, cx + dx * 0.4, y + 205);
    ctx.stroke();
  }
  ctx.restore();
}
