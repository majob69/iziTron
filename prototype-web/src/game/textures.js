// Prozedurale Texturen (keine externen Assets nötig).
import * as THREE from 'three';

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function noise(ctx, size, amount, alpha) {
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
    img.data[i + 3] = alpha ?? img.data[i + 3];
  }
  ctx.putImageData(img, 0, 0);
}

function toTexture(c, repeat = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Metallboden-Platte mit Fugen, Nieten und Kratzern. */
export function floorTextures() {
  const size = 256;
  const [c, ctx] = canvas(size);
  ctx.fillStyle = '#5a5f66';
  ctx.fillRect(0, 0, size, size);
  noise(ctx, size, 30);
  // Kratzer
  ctx.strokeStyle = 'rgba(200,205,210,0.12)';
  for (let i = 0; i < 40; i++) {
    ctx.lineWidth = Math.random() * 1.2;
    ctx.beginPath();
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 20);
    ctx.stroke();
  }
  // Fugen
  ctx.strokeStyle = '#25282c';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.stroke();
  // Nieten
  ctx.fillStyle = '#8b9097';
  for (const [x, y] of [[12, 12], [size - 12, 12], [12, size - 12], [size - 12, size - 12], [size / 2 - 10, 12], [size / 2 + 10, size - 12]]) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Schmutz
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 20 + Math.random() * 50;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(30,25,20,0.35)');
    grad.addColorStop(1, 'rgba(30,25,20,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const map = toTexture(c);

  // Rauheit: Fugen rau, Kratzer glatter
  const [rc, rctx] = canvas(size);
  rctx.drawImage(c, 0, 0);
  const img = rctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const l = img.data[i];
    const v = 255 - l * 1.1 + 40;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(60, Math.min(240, v));
  }
  rctx.putImageData(img, 0, 0);
  const roughnessMap = toTexture(rc, 1, false);
  return { map, roughnessMap };
}

/** Gitterrost für Stege. */
export function gratingTexture() {
  const size = 128;
  const [c, ctx] = canvas(size);
  ctx.fillStyle = '#2a2d31';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#6d737b';
  for (let i = 0; i < size; i += 16) {
    ctx.fillRect(i, 0, 4, size);
    ctx.fillRect(0, i, size, 3);
  }
  noise(ctx, size, 25);
  return toTexture(c);
}

/** Gelb-schwarze Warnstreifen für Kanten. */
export function hazardStripeTexture() {
  const [c, ctx] = canvas(128);
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#e8b30c';
  for (let i = -128; i < 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 16, 0);
    ctx.lineTo(i + 16 + 128, 128);
    ctx.lineTo(i + 128, 128);
    ctx.fill();
  }
  noise(ctx, 128, 30);
  return toTexture(c);
}

/** Stromgitter-Platte. */
export function gridTexture() {
  const [c, ctx] = canvas(128);
  ctx.fillStyle = '#0b1622';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#3fb8ff';
  ctx.lineWidth = 3;
  for (let i = 8; i < 128; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }
  return toTexture(c);
}

/** Wandpaneel mit Leuchtstreifen (für Pfeiler). */
export function panelTexture() {
  const [c, ctx] = canvas(256);
  ctx.fillStyle = '#3b4047';
  ctx.fillRect(0, 0, 256, 256);
  noise(ctx, 256, 20);
  ctx.strokeStyle = '#1d2024';
  ctx.lineWidth = 3;
  for (let y = 0; y < 256; y += 64) ctx.strokeRect(6, y + 4, 244, 56);
  return toTexture(c);
}

/** Text-Sprite (Klassennummer über dem Droiden). */
export function labelTexture(text, color = '#ffffff') {
  const [c, ctx] = canvas(128);
  ctx.clearRect(0, 0, 128, 128);
  ctx.font = 'bold 64px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeText(text, 64, 64);
  ctx.fillStyle = color;
  ctx.fillText(text, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
