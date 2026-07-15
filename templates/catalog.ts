import type { ControlDef, LayerTransform, Template, TransformContext } from '@/lib/types';
import catalog from './catalog.generated.json';

type ScrapedSlider = {
  kind: 'slider';
  section: string;
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
};

type ScrapedToggle = {
  kind: 'toggle';
  section: string;
  key: string;
  label: string;
  options: string[];
};

type ScrapedControl = ScrapedSlider | ScrapedToggle;
type Values = Record<string, any>;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const wrap = (n: number, size: number) => ((n % size) + size) % size;
const rad = (deg: number) => (deg * Math.PI) / 180;
const num = (value: any, fallback: number) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const enabled = (value: any) => value === true || value === 'on' || value === 'show';

function offset(v: Values, ctx: TransformContext) {
  return {
    x: (num(v.offsetX, 0) / 100) * ctx.width * 0.5,
    y: (num(v.offsetY, 0) / 100) * ctx.height * 0.5,
  };
}

function phase(ctx: TransformContext, count: number) {
  return (ctx.progress ?? 0) * Math.max(1, count);
}

function signedSlot(index: number, count: number, movement: number) {
  const slot = wrap(index - movement + count / 2, count) - count / 2;
  return { slot, distance: Math.abs(slot), featured: Math.max(0, 1 - Math.abs(slot)) };
}

function cardScale(value: any, ctx: TransformContext, fallback = 320) {
  const raw = num(value, fallback);
  const max = Math.min(ctx.width, ctx.height) * 0.92;
  return clamp(raw, 28, max) / 340;
}

function finish(t: LayerTransform, index: number, v: Values, ctx: TransformContext): LayerTransform {
  const o = offset(v, ctx);
  const fade = clamp(num(v.depthFade ?? v.fade, 0), 0, 100) / 100;
  const depthNorm = clamp(t.depth, 0, 1);
  const order = num(t.order, index);
  const solo = enabled(v.solo);
  return {
    ...t,
    x: t.x + o.x,
    y: t.y + o.y,
    alpha: clamp(t.alpha * (1 - fade * (1 - depthNorm)) * (solo && depthNorm < 0.82 ? 0 : 1), 0, 1),
    depth: t.depth + order * 0.00001,
  };
}

function carousel(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const direction = String(v.direction ?? 'left');
  const vertical = direction === 'up' || direction === 'down';
  const reverse = direction === 'right' || direction === 'down' || direction === 'reverse';
  const directionSign = reverse ? -1 : 1;
  const p = signedSlot(index, count, phase(ctx, count) * directionSign);
  const size = cardScale(v.planeSize, ctx, 420);
  const gap = num(v.gap, 40) + clamp(num(v.planeSize, 420) * 0.82, 60, 520);
  const centerScale = enabled(v.scaleCenter) ? num(v.centerScale ?? v.bigScale, 140) / 100 : 1;
  const scale = size * (1 + (centerScale - 1) * p.featured);
  const tilt = String(v.tiltStyle ?? 'off');
  const rotation = tilt === 'fan' ? p.slot * 0.08 : tilt === 'alternate' ? (index % 2 ? -1 : 1) * 0.08 : 0;
  const cyclicOrder = count - p.distance + p.slot * directionSign * 0.001;
  return finish({
    x: vertical ? 0 : p.slot * gap,
    y: vertical ? p.slot * gap : 0,
    scale,
    rotation,
    alpha: 1,
    skewX: num(v.perspective, 0) > 0 ? -Math.sign(p.slot) * 0.08 : 0,
    depth: 1 / (1 + p.distance),
    order: cyclicOrder,
  }, index, v, ctx);
}

function orbit(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const direction = v.direction === 'reverse' ? -1 : 1;
  const a = ((index / count) - (ctx.progress ?? 0) * direction) * Math.PI * 2 + rad(num(v.rotationZ, 0));
  const radius = clamp(num(v.orbitRadius, 420), 20, Math.max(ctx.width, ctx.height));
  const rx = Math.cos(a) * radius;
  const ry = Math.sin(a) * radius;
  const tiltX = Math.cos(rad(num(v.rotationX, 0)));
  const tiltY = Math.cos(rad(num(v.rotationY, 0)));
  const x = rx * tiltY;
  const y = ry * tiltX;
  const depth = (Math.sin(a) + 1) / 2;
  const perspective = clamp(num(v.perspective, 100), 10, 300) / 100;
  return finish({
    x,
    y,
    scale: cardScale(v.planeSize, ctx, 370) * (0.62 + depth * 0.38 * perspective),
    rotation: rad(num(v.rotationZ, 0)) * 0.12,
    alpha: 1,
    skewX: rad(num(v.rotationY, 0)) * 0.08,
    depth,
  }, index, v, ctx);
}

function stack(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const reverse = v.direction === 'up' || v.direction === 'reverse';
  const p = signedSlot(index, count, phase(ctx, count) * (reverse ? -1 : 1));
  const visible = Math.max(1, num(v.visible, 3));
  const spacing = (ctx.height * 0.72) / visible;
  const depth = 1 / (1 + p.distance);
  const zoom = num(v.zoom, 100) / 100;
  return finish({
    x: p.slot * num(v.perspective, 50) * 0.55,
    y: p.slot * spacing,
    scale: cardScale(num(v.planeSize, 38) * 8, ctx, 304) * (0.72 + depth * 0.28) * zoom,
    rotation: 0,
    alpha: p.distance <= visible ? 1 : 0,
    depth,
  }, index, v, ctx);
}

function ring3d(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const direction = v.direction === 'reverse' ? -1 : 1;
  const a = (index / count - (ctx.progress ?? 0) * direction) * Math.PI * 2;
  const axis = String(v.axis ?? 'horizontal');
  const radiusRatio = num(v.orbitRadius, 900) / Math.max(1, num(v.distance, 2200));
  const radius = clamp(radiusRatio * Math.min(ctx.width, ctx.height) * 0.75, 90, Math.max(ctx.width, ctx.height) * 0.72);
  const depth = (Math.cos(a) + 1) / 2;
  const plane = clamp((num(v.planeSize, 600) / Math.max(600, num(v.distance, 2200))) * Math.min(ctx.width, ctx.height), 70, Math.min(ctx.width, ctx.height) * 0.72);
  return finish({
    x: axis === 'vertical' ? 0 : Math.sin(a) * radius,
    y: axis === 'vertical' ? Math.sin(a) * radius : 0,
    scale: (plane / 340) * (0.58 + depth * 0.42),
    rotation: rad(num(v.rotationZ, 0)) + (enabled(v.flipImage) ? a * 0.08 : 0),
    alpha: v.backface === 'hide' && depth < 0.12 ? 0 : 1,
    skewX: axis === 'horizontal' ? -Math.sin(a) * 0.18 : 0,
    skewY: axis === 'vertical' ? -Math.sin(a) * 0.18 : 0,
    depth,
  }, index, v, ctx);
}

function wheel(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const reverse = v.direction === 'reverse' || v.direction === 'ccw';
  const cycle = rad(num(v.cycleDeg, 360));
  const a = (index / count) * Math.PI * 2 - (ctx.progress ?? 0) * cycle * (reverse ? -1 : 1);
  const radius = clamp(num(v.ringRadius, 500), 80, Math.max(ctx.width, ctx.height));
  const depth = (Math.cos(a - Math.PI / 2) + 1) / 2;
  const big = enabled(v.bigImage) ? num(v.bigScale, 115) / 100 : 1;
  return finish({
    x: Math.cos(a) * radius,
    y: Math.sin(a) * radius,
    scale: cardScale(v.thumbSize, ctx, 160) * (1 + (big - 1) * depth),
    rotation: enabled(v.spinThumbs) ? a + Math.PI / 2 : 0,
    alpha: 1,
    depth,
  }, index, v, ctx);
}

function field(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const t = wrap(index / count - (ctx.progress ?? 0) * (v.direction === 'reverse' ? -1 : 1), 1);
  const seed = index * 2.399963;
  const spread = clamp(num(v.spread, 1900) / 1900, 0.15, 2);
  const depth = 1 - t;
  return finish({
    x: Math.cos(seed) * ctx.width * 0.48 * spread * (0.25 + t),
    y: Math.sin(seed) * ctx.height * 0.48 * spread * (0.25 + t),
    scale: cardScale(num(v.planeSize, 600) * 0.48, ctx, 290) * (0.25 + depth * 0.9),
    rotation: seed * 0.08,
    alpha: clamp(depth * 1.4, 0, 1),
    depth,
  }, index, v, ctx);
}

function wipe(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const active = (ctx.progress ?? 0) * count;
  const delta = wrap(active - index, count);
  const alpha = delta < 1 ? 1 - delta : delta > count - 1 ? delta - (count - 1) : 0;
  const direction = String(v.direction ?? 'up');
  const drift = (1 - alpha) * num(v.feather, 0) * 3;
  return finish({
    x: direction === 'left' ? -drift : direction === 'right' ? drift : 0,
    y: direction === 'up' ? -drift : direction === 'down' ? drift : 0,
    scale: cardScale(num(v.planeSize, 100) * 4, ctx, 400) * (1 + num(v.scale, 0) / 100),
    rotation: 0,
    alpha,
    depth: alpha,
  }, index, v, ctx);
}

function stories(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const reverse = v.direction === 'right' || v.direction === 'reverse';
  const p = signedSlot(index, count, phase(ctx, count) * (reverse ? -1 : 1));
  const plane = num(v.planeSize, 100) * 3.6;
  return finish({
    x: p.slot * (plane * 0.62 + num(v.gap, 8) * 8),
    y: 0,
    scale: cardScale(plane, ctx, 360) * (1 + p.featured * num(v.scale, 10) / 100),
    rotation: 0,
    alpha: clamp(1 - p.distance * 0.18, 0, 1),
    depth: 1 / (1 + p.distance),
  }, index, v, ctx);
}

function spin(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const amount = rad(num(v.rotation ?? v.cycleDeg, 360));
  const reverse = v.direction === 'reverse';
  const rotation = (ctx.progress ?? 0) * amount * (reverse ? -1 : 1);
  const fan = (index - (count - 1) / 2) * rad(num(v.fan, 4));
  return finish({
    x: 0,
    y: 0,
    scale: cardScale(num(v.planeSize, 100) * 3.8, ctx, 380) * (1 - index * 0.025),
    rotation: rotation + fan,
    alpha: 1,
    depth: 1 - index / Math.max(1, count),
  }, index, v, ctx);
}

function flicker(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const active = (ctx.progress ?? 0) * count;
  const d = Math.min(wrap(active - index, count), wrap(index - active, count));
  const alpha = clamp(1 - d, 0, 1);
  const scaleUp = enabled(v.scale) || v.effect === 'scale';
  return finish({
    x: num(v.driftX, 0) * (1 - alpha),
    y: num(v.driftY, 0) * (1 - alpha),
    scale: cardScale(num(v.planeSize, 100) * 4.2, ctx, 420) * (1 + (scaleUp ? (1 - alpha) * 0.12 : 0)),
    rotation: rad(num(v.rotation, 0)) * (1 - alpha),
    alpha,
    depth: alpha,
  }, index, v, ctx);
}

function globe(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y0 = 1 - (index / Math.max(1, count - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y0 * y0));
  const a = index * golden + (ctx.progress ?? 0) * Math.PI * 2 * (v.direction === 'reverse' ? -1 : 1);
  const radius = clamp(num(v.globeRadius ?? v.orbitRadius, 420), 80, Math.min(ctx.width, ctx.height) * 0.48);
  const z = Math.cos(a) * r;
  const depth = (z + 1) / 2;
  return finish({
    x: Math.sin(a) * r * radius,
    y: y0 * radius,
    scale: cardScale(num(v.planeSize, 160), ctx, 160) * (0.55 + depth * 0.45),
    rotation: rad(num(v.rotationZ, 0)),
    alpha: v.backface === 'hide' && z < 0 ? 0 : 1,
    depth,
  }, index, v, ctx);
}

function grid(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const cols = Math.max(1, Math.round(num(v.columns ?? v.cols ?? v.lanes, Math.ceil(Math.sqrt(count)))));
  const rows = Math.ceil(count / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const plane = clamp(num(v.planeSize, 140), 20, Math.min(ctx.width, ctx.height) * 0.5);
  const gapX = num(v.gapX ?? v.gap, 20);
  const gapY = num(v.gapY ?? v.gap, 20);
  const pulse = Math.sin(((ctx.progress ?? 0) * Math.PI * 2) + (row + col) * 0.65);
  return finish({
    x: (col - (cols - 1) / 2) * (plane * 0.82 + gapX),
    y: (row - (rows - 1) / 2) * (plane + gapY),
    scale: cardScale(plane, ctx, 140) * (1 + pulse * num(v.pulse ?? v.scale, 0) / 200),
    rotation: rad(num(v.angle, 0)),
    alpha: 1,
    depth: 0.5 + pulse * 0.1,
  }, index, v, ctx);
}

function spiral(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const turns = num(v.turns, 2.5);
  const t = wrap(index / count - (ctx.progress ?? 0), 1);
  const a = t * Math.PI * 2 * turns + rad(num(v.rotationZ, 0));
  const radius = clamp(num(v.spiralRadius ?? v.orbitRadius, 430), 40, Math.max(ctx.width, ctx.height) * 0.6) * (0.2 + t * 0.8);
  const depth = 1 - t;
  return finish({
    x: Math.cos(a) * radius,
    y: Math.sin(a) * radius * 0.62,
    scale: cardScale(num(v.planeSize, 180), ctx, 180) * (0.45 + depth * 0.75),
    rotation: enabled(v.spinThumbs) ? a : rad(num(v.rotationZ, 0)),
    alpha: clamp(depth * 1.6, 0, 1),
    depth,
  }, index, v, ctx);
}

function tour(frame: number, index: number, count: number, v: Values, ctx: TransformContext, orbiting: boolean) {
  const t = wrap(index / count - (ctx.progress ?? 0), 1);
  const depth = 1 - t;
  const a = (index / count + (ctx.progress ?? 0)) * Math.PI * 2;
  return finish({
    x: orbiting ? Math.cos(a) * ctx.width * 0.35 : Math.sin(index * 1.7) * ctx.width * 0.28 * t,
    y: orbiting ? Math.sin(a) * ctx.height * 0.22 : (t - 0.5) * ctx.height * 0.8,
    scale: cardScale(num(v.planeSize, 100) * 2.6, ctx, 260) * (0.3 + depth * 1.1),
    rotation: orbiting ? a * 0.08 : 0,
    alpha: clamp(depth * 1.8, 0, 1),
    depth,
  }, index, v, ctx);
}

function magazine(frame: number, index: number, count: number, v: Values, ctx: TransformContext, product: boolean) {
  const p = signedSlot(index, count, phase(ctx, count));
  const turn = clamp(1 - p.distance, 0, 1);
  const raw = product ? num(v.planeSize, 1300) * 0.24 : num(v.pageSize, 55) * 6;
  return finish({
    x: p.slot * (product ? 24 : 18),
    y: p.slot * (product ? 10 : 7),
    scale: cardScale(raw, ctx, 330) * (1 - p.distance * 0.035),
    rotation: rad(num(v.rotationZ, 0)) + p.slot * 0.025,
    alpha: p.distance > Math.max(4, count / 2) ? 0 : 1,
    skewY: turn * rad(num(v.curveAmount, 15)) * 0.2,
    depth: 1 / (1 + p.distance),
  }, index, v, ctx);
}

function gravity(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const order = index / Math.max(1, count - 1);
  const t = wrap(ctx.progress ?? 0, 1);
  const fall = t * t;
  const spread = num(v.spread, 70);
  return finish({
    x: (index - (count - 1) / 2) * spread,
    y: -ctx.height * 0.65 + fall * ctx.height * 1.3,
    scale: cardScale(num(v.planeSize, 100) * 3.2, ctx, 320),
    rotation: (index % 2 ? -1 : 1) * t * rad(num(v.rotation, 45)),
    alpha: clamp(Math.min(t * 5, (1 - t) * 5), 0, 1),
    depth: 1 - order,
  }, index, v, ctx);
}

function parallax(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const depth = 1 - index / Math.max(1, count);
  const movement = ((ctx.progress ?? 0) - 0.5) * num(v.panRange ?? v.distance, 100) * (0.3 + depth);
  return finish({
    x: movement,
    y: (index - (count - 1) / 2) * num(v.gap, 18),
    scale: cardScale(num(v.planeSize, 100) * 3.8, ctx, 380) * (0.75 + depth * 0.25),
    rotation: rad(num(v.tilt, 0)) * (index % 2 ? -1 : 1),
    alpha: 1,
    depth,
  }, index, v, ctx);
}

function deck(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const p = signedSlot(index, count, phase(ctx, count));
  const fan = rad(num(v.fanAngle ?? v.angle, 8));
  const flip = Math.sin((ctx.progress ?? 0) * Math.PI * 2 + index * 0.4);
  return finish({
    x: p.slot * num(v.spread, 24),
    y: p.distance * num(v.stackGap, 8),
    scale: cardScale(num(v.planeSize, 100) * 3.7, ctx, 370) * (1 - p.distance * 0.035),
    rotation: p.slot * fan + flip * 0.04,
    alpha: p.distance > 5 ? 0 : 1,
    skewX: enabled(v.flipImage) ? flip * 0.15 : 0,
    depth: 1 / (1 + p.distance),
  }, index, v, ctx);
}

function flip(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const active = Math.floor((ctx.progress ?? 0) * count) % count;
  const local = wrap((ctx.progress ?? 0) * count - index, count);
  const visible = index === active || local > count - 1;
  const flipT = local < 1 ? local : 0;
  return finish({
    x: 0,
    y: 0,
    scale: cardScale(num(v.planeSize, 100) * 4, ctx, 400) * Math.max(0.08, Math.abs(Math.cos(flipT * Math.PI))),
    rotation: v.axis === 'vertical' ? flipT * Math.PI : 0,
    alpha: visible ? 1 : 0,
    skewY: v.axis === 'horizontal' ? flipT * 0.2 : 0,
    depth: visible ? 1 : 0,
  }, index, v, ctx);
}

function marquee(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const lanes = Math.max(1, Math.round(num(v.lanes, 3)));
  const lane = index % lanes;
  const item = Math.floor(index / lanes);
  const perLane = Math.max(1, Math.ceil(count / lanes));
  const alternate = enabled(v.alternate) && lane % 2 === 1 ? -1 : 1;
  const reverse = v.direction === 'reverse' ? -1 : 1;
  const staggerPhase = (num(v.stagger, 0) / 100) * lane;
  const movement = ((ctx.progress ?? 0) * perLane + staggerPhase) * alternate * reverse;
  const slot = wrap(item - movement + perLane / 2, perLane) - perLane / 2;
  const vertical = v.axis !== 'horizontal';
  const plane = clamp(num(v.planeSize, 100), 24, Math.min(ctx.width, ctx.height) * 0.45);
  const laneGap = plane * 0.82 + num(v.gap, 15);
  const itemGap = plane + num(v.gap, 15);
  return finish({
    x: vertical ? (lane - (lanes - 1) / 2) * laneGap : slot * itemGap,
    y: vertical ? slot * itemGap : (lane - (lanes - 1) / 2) * laneGap,
    scale: cardScale(plane, ctx, 100),
    rotation: rad(num(v.angle, 0)),
    alpha: 1,
    depth: 0.5,
  }, index, v, ctx);
}

function scaleScene(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const active = (ctx.progress ?? 0) * count;
  const d = Math.min(wrap(active - index, count), wrap(index - active, count));
  const alpha = clamp(1 - d, 0, 1);
  const start = num(v.startScale ?? v.minScale, 20) / 100;
  const end = num(v.endScale ?? v.maxScale, 100) / 100;
  return finish({
    x: 0,
    y: 0,
    scale: cardScale(num(v.planeSize, 100) * 4.2, ctx, 420) * (start + (end - start) * alpha),
    rotation: rad(num(v.rotation, 0)) * (1 - alpha),
    alpha,
    depth: alpha,
  }, index, v, ctx);
}

function proximity(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const px = (col - (cols - 1) / 2) * (ctx.width / cols);
  const py = (row - (Math.ceil(count / cols) - 1) / 2) * (ctx.height / cols);
  const focusX = Math.sin((ctx.progress ?? 0) * Math.PI * 2) * ctx.width * 0.35;
  const focusY = Math.cos((ctx.progress ?? 0) * Math.PI * 2) * ctx.height * 0.28;
  const dist = Math.hypot(px - focusX, py - focusY) / Math.max(ctx.width, ctx.height);
  const near = clamp(1 - dist * (num(v.maxDist, 28) / 10), 0, 1);
  const min = num(v.minScale, 5) / 100;
  const max = num(v.maxScale, 60) / 100;
  return finish({
    x: px,
    y: py,
    scale: cardScale(num(v.count, 500) * 0.32, ctx, 160) * (min + (max - min) * near),
    rotation: rad(num(v.tilt, 0)) * (1 - near),
    alpha: clamp(1 - num(v.atmosphere, 0) / 100 * (1 - near), 0, 1),
    depth: near,
  }, index, v, ctx);
}

function frames(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  const p = signedSlot(index, count, phase(ctx, count));
  const gap = num(v.gap, 0);
  const row = index % 3 - 1;
  return finish({
    x: p.slot * (ctx.width * 0.62 + gap),
    y: row * (ctx.height * 0.09 + gap),
    scale: cardScale(num(v.planeSize, 100) * 4.2, ctx, 420) * (1 - Math.abs(row) * 0.12),
    rotation: rad(num(v.tilt, 0)) * row,
    alpha: clamp(1 - p.distance * 0.3, 0, 1),
    depth: 1 / (1 + p.distance),
  }, index, v, ctx);
}

function blank(frame: number, index: number, count: number, v: Values, ctx: TransformContext) {
  return finish({ x: 0, y: 0, scale: 1, rotation: 0, alpha: index === 0 ? 1 : 0, depth: index === 0 ? 1 : 0 }, index, v, ctx);
}

function transformFor(group: string, baseMode: string): Template['transform'] {
  if (group === 'Carousel') return carousel;
  if (group === 'Orbit') return orbit;
  if (group === 'Stack') return stack;
  if (group === '3D' || group === 'Carousel 3D') return ring3d;
  if (group === 'Wheel') return wheel;
  if (group === 'Field') return field;
  if (group === 'Wipe') return wipe;
  if (group === 'Stories') return stories;
  if (group === 'Spin') return spin;
  if (group === 'Flicker') return flicker;
  if (group === 'Globe') return globe;
  if (group === 'Grid') return grid;
  if (group === 'Spiral') return spiral;
  if (group === 'Tour') return (f, i, c, v, x) => tour(f, i, c, v, x, baseMode.includes('02'));
  if (group === 'Magazine') return (f, i, c, v, x) => magazine(f, i, c, v, x, baseMode.includes('03'));
  if (group === 'Gravity') return gravity;
  if (group === 'Parallax') return parallax;
  if (group === 'Deck') return deck;
  if (group === 'Flip') return flip;
  if (group === 'Marquee') return marquee;
  if (group === 'Scale') return scaleScene;
  if (group === 'Proximity') return proximity;
  if (group === 'Frames') return frames;
  return blank;
}

function controlUnit(group: string, def: ScrapedControl) {
  if (def.key === 'duration') return 's';
  if (def.key === 'delay') {
    return group === 'Carousel' || group === 'Stack' ? 'f' : 's';
  }
  if (def.key !== 'stagger') return undefined;
  if (group === 'Carousel' || group === 'Stack') return 'f';
  if (group === 'Marquee') return '%';
  return 's';
}

function storesSecondsDisplaysFrames(group: string, key: string) {
  return (group === 'Carousel' || group === 'Stack') && (key === 'stagger' || key === 'delay');
}

function frameDisplayControlValue(def: ScrapedControl, value: number, group: string) {
  if (!storesSecondsDisplaysFrames(group, def.key)) return value;
  // Older scraped catalogues stored these values as raw frame counts. The
  // reference app stores seconds and only formats them as frames in the panel.
  return def.kind === 'slider' && (def.max > 2 || def.step >= 1) ? value / 30 : value;
}

function toControl(def: ScrapedControl, value: any, values: Values, group: string): ControlDef {
  // The reference Carousel panel exposes both a "Tilt" mode toggle and an "Amount"
  // slider whose underlying parameter is also named `tilt`. Keep the numeric
  // parameter as `tilt` and give the mode its real store key, `tiltStyle`.
  const isCarouselTiltMode = def.kind === 'toggle' && def.key === 'tilt' && def.label === 'Tilt';
  const key = isCarouselTiltMode ? 'tiltStyle' : def.key;
  const defaultValue = isCarouselTiltMode
    ? (num(values.tilt, 0) === 0 ? 'off' : 'alternate')
    : value;

  if (def.kind === 'toggle') {
    return { key, label: def.label, type: 'toggle', options: def.options, default: defaultValue, section: def.section };
  }
  const displayFrames = storesSecondsDisplaysFrames(group, def.key);
  return {
    key,
    label: def.label,
    type: 'slider',
    min: frameDisplayControlValue(def, def.min, group),
    max: frameDisplayControlValue(def, def.max, group),
    step: frameDisplayControlValue(def, def.step, group),
    default: typeof defaultValue === 'number'
      ? frameDisplayControlValue(def, defaultValue, group)
      : defaultValue,
    section: def.section,
    unit: controlUnit(group, def),
    display: displayFrames ? 'frames' : undefined,
  };
}

function visibleControl(def: ScrapedControl) {
  return def.key !== 'scaleFocus' && def.label !== 'Scale Amount';
}

export const completeTemplateList: Template[] = catalog.groups.flatMap((group) =>
  group.items.map((item) => {
    const schema = (catalog.schemas as Record<string, ScrapedControl[]>)[item.schema];
    return {
      meta: {
        id: item.id,
        name: item.name,
        group: group.name,
        baseMode: item.baseMode,
        easing: { h1x: item.bezier[0], h1y: item.bezier[1], h2x: item.bezier[2], h2y: item.bezier[3] },
        defaults: Object.fromEntries(
          Object.entries(item.values as Values).map(([key, value]) => {
            const def = schema.find((control) => control.key === key);
            return [key, typeof value === 'number' && def ? frameDisplayControlValue(def, value, group.name) : value];
          })
        ),
      },
      controls: schema
        .filter(visibleControl)
        .map((def) => toControl(def, (item.values as Values)[def.key], item.values as Values, group.name)),
      transform: transformFor(group.name, item.baseMode),
    } satisfies Template;
  })
);
