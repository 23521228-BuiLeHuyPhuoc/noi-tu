import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import {
  BOOM_BLAST_TICKS,
  BOOM_BOMB_FUSE_TICKS,
  BOOM_ITEM_META,
  BOOM_TRAPPED_TICKS,
  dirFromDelta,
  getBoomPlayerSpeed,
  getUfoWorldPos,
  moveBoomPlayerWithSlide,
  type BoomBlastCell,
  type BoomBombEntity,
  type BoomDir,
  type BoomInput,
  type BoomItemEntity,
  type BoomKillFeedItem,
  type BoomPhase,
  type BoomPlayerEntity,
  type BoomPlayerState,
  type BoomSfxKind,
  type BoomTickPayload,
  type BoomTile,
  type BoomView,
} from '../../../shared/src/boom';
import { PLAYER_COLORS, type RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { ViewportContext, useOnChange, useStableWindow } from '../hooks';
import { Rotator } from '../components/Rotator';
import { Shell, useShellTools } from '../components/Shell';
import { UiIcon } from '../components/Icons';
import { play } from '../sound';
import { vibrate } from '../web';
import { C, FONT, sticker } from '../theme';
import { T } from '../ui';

// ============================================================================
// HỖ TRỢ TỌA ĐỘ CẢM ỨNG CHÍNH XÁC 100% KHI MÀN HÌNH DỌC TỰ XOAY NGANG 90° CSS
// ============================================================================

export function getLocalPoint(
  clientX: number,
  clientY: number,
  el: HTMLElement,
  rotated: boolean,
): { x: number; y: number; w: number; h: number } {
  const rect = el.getBoundingClientRect();
  if (rotated) {
    return {
      x: clientY - rect.top,
      y: rect.right - clientX,
      w: Math.max(1, rect.height),
      h: Math.max(1, rect.width),
    };
  }
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
    w: Math.max(1, rect.width),
    h: Math.max(1, rect.height),
  };
}

// ============================================================================
// HẠT HIỆU ỨNG NƯỚC BẮN / GỖ VỠ / BÓNG NỔ TRÊN CANVAS 60FPS (0 REACT STATE)
// ============================================================================

interface FxParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  ring?: boolean;
}

interface FloatingPopup {
  x: number;
  y: number;
  text: string;
  color: string;
  bornAt: number;
}

interface PredictedLocal {
  round: number;
  initialized: boolean;
  x: number;
  y: number;
  dir: BoomDir;
}

interface HudState {
  round: number;
  totalRounds: number;
  phase: BoomPhase;
  secLeft: number;
  ringActive: boolean;
  aliveCount: number;
  totalPlayers: number;
  redAlive: number;
  blueAlive: number;
  myState: BoomPlayerState | null;
  myTeam: 0 | 1;
  maxBombs: number;
  activeBombs: number;
  range: number;
  speedLvl: number;
  canKick: boolean;
  canGlove: boolean;
  needles: number;
  shieldSec: number;
  standingOnBomb: boolean;
  ufoCooldownSec: number;
  roundWinnerText: string | null;
  killFeed: BoomKillFeedItem[];
}

// ============================================================================
// ÂM THANH ARCADE CÓ CHỐNG DỘI KHI NỔ DÂY CHUYỀN
// ============================================================================

const lastSfxAt: Partial<Record<BoomSfxKind, number>> = {};

function triggerBoomSfx(kind: BoomSfxKind, isMeRelated: boolean): void {
  const now = performance.now();
  const prev = lastSfxAt[kind] ?? 0;
  const minGap = kind === 'explode' || kind === 'ring_drop' ? 75 : 35;
  if (now - prev < minGap) return;
  lastSfxAt[kind] = now;

  switch (kind) {
    case 'place':
      play('pop');
      if (isMeRelated) vibrate(16);
      break;
    case 'explode':
      play('boom');
      break;
    case 'pickup':
      play('sparkle');
      if (isMeRelated) vibrate(18);
      break;
    case 'trap':
      play('inksplash');
      if (isMeRelated) vibrate(45);
      break;
    case 'pop_kill':
      play('ko');
      if (isMeRelated) vibrate([30, 40, 55]);
      break;
    case 'rescue':
      play('sparkle');
      if (isMeRelated) vibrate(30);
      break;
    case 'needle':
      play('pop');
      if (isMeRelated) vibrate(28);
      break;
    case 'kick':
      play('punch');
      break;
    case 'throw':
      play('boing');
      break;
    case 'ufo_throw':
      play('whoosh');
      break;
    case 'ring_warn':
      play('siren');
      vibrate([40, 60, 40]);
      break;
    case 'ring_drop':
      play('stamp');
      break;
    case 'round_win':
      play('win');
      break;
  }
}

// ============================================================================
// VẼ CANVAS KENNEY / CRAZY ARCADE (OFFSCREEN FLOOR CACHE + 60FPS SPRITES)
// ============================================================================

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rad = Math.max(0, Math.min(r, w * 0.5, h * 0.5));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function bakeStaticArenaCanvas(
  width: number,
  height: number,
  tilePx: number,
  dpr: number,
): HTMLCanvasElement | null {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.round(width * tilePx * dpr));
  off.height = Math.max(1, Math.round(height * tilePx * dpr));
  const ctx = off.getContext('2d');
  if (!ctx) return null;
  ctx.scale(dpr, dpr);

  // 1. Thảm cỏ bàn cờ xanh ngọc tươi mát phong cách Crazy Arcade
  for (let ty = 0; ty < height; ty++) {
    for (let tx = 0; tx < width; tx++) {
      const x = tx * tilePx;
      const y = ty * tilePx;
      const even = (tx + ty) % 2 === 0;
      ctx.fillStyle = even ? '#2ECC71' : '#26B964';
      ctx.fillRect(x, y, tilePx + 0.5, tilePx + 0.5);

      // Viền sáng tinh tế + ngọn cỏ nhỏ trang trí
      ctx.fillStyle = even ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(x + 1, y + 1, tilePx - 2, 2);
      if ((tx * 7 + ty * 13) % 5 === 0 && tx > 0 && tx < width - 1 && ty > 0 && ty < height - 1) {
        ctx.fillStyle = 'rgba(20, 83, 45, 0.18)';
        ctx.beginPath();
        ctx.arc(x + tilePx * 0.28, y + tilePx * 0.72, Math.max(1.5, tilePx * 0.055), 0, Math.PI * 2);
        ctx.arc(x + tilePx * 0.37, y + tilePx * 0.68, Math.max(1.2, tilePx * 0.045), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 2. Đổ bóng dưới chân tường đá & trụ đá bất hoại
  for (let ty = 0; ty < height; ty++) {
    for (let tx = 0; tx < width; tx++) {
      const isPillar = tx === 0 || tx === width - 1 || ty === 0 || ty === height - 1 || (tx % 2 === 0 && ty % 2 === 0);
      if (!isPillar) continue;
      if (ty + 1 < height) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
        ctx.fillRect(tx * tilePx + 1, (ty + 1) * tilePx, tilePx - 2, tilePx * 0.22);
      }
    }
  }

  // 3. Vẽ tường biên & trụ đá 3D vát cạnh sáng bóng
  for (let ty = 0; ty < height; ty++) {
    for (let tx = 0; tx < width; tx++) {
      const isBorder = tx === 0 || tx === width - 1 || ty === 0 || ty === height - 1;
      const isPillar = isBorder || (tx % 2 === 0 && ty % 2 === 0);
      if (!isPillar) continue;

      const x = tx * tilePx;
      const y = ty * tilePx;
      const pad = isBorder ? 0.6 : 1.5;
      const w = tilePx - pad * 2;
      const h = tilePx - pad * 2;
      const rad = isBorder ? tilePx * 0.12 : tilePx * 0.2;

      // Đế đá tối màu tạo độ dày 3D
      roundRect(ctx, x + pad, y + pad, w, h, rad);
      ctx.fillStyle = isBorder ? '#1E293B' : '#334155';
      ctx.fill();

      // Mặt đỉnh trụ đá sáng hơn
      const topH = h * 0.78;
      const grad = ctx.createLinearGradient(x, y + pad, x, y + pad + topH);
      if (isBorder) {
        grad.addColorStop(0, '#64748B');
        grad.addColorStop(1, '#475569');
      } else {
        grad.addColorStop(0, '#CBD5E1');
        grad.addColorStop(0.5, '#94A3B8');
        grad.addColorStop(1, '#64748B');
      }
      roundRect(ctx, x + pad + 1, y + pad + 1, Math.max(2, w - 2), Math.max(2, topH), rad * 0.85);
      ctx.fillStyle = grad;
      ctx.fill();

      // Highlight phản sáng trên gờ đá
      roundRect(ctx, x + pad + 3, y + pad + 2.2, Math.max(2, w - 6), Math.max(2, tilePx * 0.1), 2);
      ctx.fillStyle = isBorder ? 'rgba(226, 232, 240, 0.25)' : 'rgba(255, 255, 255, 0.55)';
      ctx.fill();

      // Rãnh gạch trang trí cho trụ trong sân
      if (!isBorder && tilePx >= 20) {
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.28)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + tilePx * 0.24, y + tilePx * 0.45);
        ctx.lineTo(x + tilePx * 0.76, y + tilePx * 0.45);
        ctx.stroke();
      }
    }
  }

  return off;
}

function drawWoodenCrate(ctx: CanvasRenderingContext2D, x: number, y: number, tilePx: number): void {
  const pad = Math.max(1.2, tilePx * 0.05);
  const w = tilePx - pad * 2;
  const h = tilePx - pad * 2;
  const r = tilePx * 0.16;

  // Đổ bóng nhẹ xuống cỏ
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
  roundRect(ctx, x + pad + 1, y + pad + 2.5, w, h, r);
  ctx.fill();

  // Khối thùng gỗ ấm áp
  const grad = ctx.createLinearGradient(x, y + pad, x, y + pad + h);
  grad.addColorStop(0, '#F59E0B');
  grad.addColorStop(0.55, '#D97706');
  grad.addColorStop(1, '#92400E');
  roundRect(ctx, x + pad, y + pad, w, h, r);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = Math.max(1.2, tilePx * 0.045);
  ctx.strokeStyle = '#78350F';
  ctx.stroke();

  // Khung nẹp gỗ bên trong + thanh chéo đặc trưng thùng hàng Bomberman
  const inset = tilePx * 0.16;
  roundRect(ctx, x + inset, y + inset, tilePx - inset * 2, tilePx - inset * 2, r * 0.5);
  ctx.fillStyle = '#B45309';
  ctx.fill();

  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = Math.max(1.6, tilePx * 0.075);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + inset + 2, y + inset + 2);
  ctx.lineTo(x + tilePx - inset - 2, y + tilePx - inset - 2);
  ctx.moveTo(x + tilePx - inset - 2, y + inset + 2);
  ctx.lineTo(x + inset + 2, y + tilePx - inset - 2);
  ctx.stroke();

  // Viền sáng trên đỉnh thùng
  ctx.fillStyle = 'rgba(254, 243, 199, 0.5)';
  roundRect(ctx, x + pad + 3, y + pad + 2, Math.max(2, w - 6), Math.max(2, tilePx * 0.08), 2);
  ctx.fill();
}

function drawDeathBrick(ctx: CanvasRenderingContext2D, x: number, y: number, tilePx: number, now: number): void {
  const pad = 0.8;
  const w = tilePx - pad * 2;
  const h = tilePx - pad * 2;
  const r = tilePx * 0.14;

  roundRect(ctx, x + pad, y + pad, w, h, r);
  const grad = ctx.createLinearGradient(x, y, x, y + tilePx);
  grad.addColorStop(0, '#334155');
  grad.addColorStop(0.5, '#1E293B');
  grad.addColorStop(1, '#090D16');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#EF4444';
  ctx.stroke();

  // Vết nứt dung nham đỏ rực nhấp nháy của Vòng Bo Tử Thần
  const pulse = 0.55 + 0.45 * Math.sin(now * 0.007 + (x + y) * 0.05);
  ctx.strokeStyle = `rgba(248, 113, 113, ${pulse.toFixed(2)})`;
  ctx.lineWidth = Math.max(1.4, tilePx * 0.06);
  ctx.beginPath();
  ctx.moveTo(x + tilePx * 0.25, y + tilePx * 0.28);
  ctx.lineTo(x + tilePx * 0.75, y + tilePx * 0.72);
  ctx.moveTo(x + tilePx * 0.75, y + tilePx * 0.28);
  ctx.lineTo(x + tilePx * 0.25, y + tilePx * 0.72);
  ctx.stroke();

  // Đinh tán sắt 4 góc
  ctx.fillStyle = '#94A3B8';
  const d = tilePx * 0.17;
  for (const [rx, ry] of [
    [x + d, y + d],
    [x + tilePx - d, y + d],
    [x + d, y + tilePx - d],
    [x + tilePx - d, y + tilePx - d],
  ]) {
    ctx.beginPath();
    ctx.arc(rx, ry, Math.max(1.2, tilePx * 0.04), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWarningTile(ctx: CanvasRenderingContext2D, x: number, y: number, tilePx: number, now: number): void {
  const pulse = 0.35 + 0.35 * Math.abs(Math.sin(now * 0.014));
  ctx.save();
  roundRect(ctx, x + 1.5, y + 1.5, tilePx - 3, tilePx - 3, tilePx * 0.14);
  ctx.fillStyle = `rgba(239, 68, 68, ${pulse.toFixed(2)})`;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#FACC15';
  ctx.stroke();

  // Vạch cảnh báo nguy hiểm sọc chéo + tâm ngắm gạch sập
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.88)';
  ctx.lineWidth = Math.max(1.3, tilePx * 0.055);
  ctx.beginPath();
  ctx.arc(x + tilePx * 0.5, y + tilePx * 0.5, tilePx * 0.24, 0, Math.PI * 2);
  ctx.moveTo(x + tilePx * 0.5, y + tilePx * 0.16);
  ctx.lineTo(x + tilePx * 0.5, y + tilePx * 0.84);
  ctx.moveTo(x + tilePx * 0.16, y + tilePx * 0.5);
  ctx.lineTo(x + tilePx * 0.84, y + tilePx * 0.5);
  ctx.stroke();
  ctx.restore();
}

function drawPowerUpItem(
  ctx: CanvasRenderingContext2D,
  it: BoomItemEntity,
  tilePx: number,
  now: number,
): void {
  const meta = BOOM_ITEM_META[it.kind];
  const cx = (it.tx + 0.5) * tilePx;
  const bob = Math.sin(now * 0.006 + it.id * 1.3) * (tilePx * 0.07);
  const cy = (it.ty + 0.48) * tilePx + bob;
  const r = tilePx * 0.36;

  // Bóng dưới cỏ
  ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, (it.ty + 0.84) * tilePx, r * 0.72, r * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hào quang xoay nhẹ quanh vật phẩm
  ctx.save();
  ctx.globalAlpha = 0.28 + 0.14 * Math.sin(now * 0.008 + it.id);
  ctx.fillStyle = meta.color;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Đế viên ngọc bo tròn 3D kiểu Crazy Arcade
  const bgGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  bgGrad.addColorStop(0, '#FFFFFF');
  bgGrad.addColorStop(0.28, meta.color);
  bgGrad.addColorStop(1, '#0F172A');
  roundRect(ctx, cx - r, cy - r, r * 2, r * 2, r * 0.46);
  ctx.fillStyle = bgGrad;
  ctx.fill();
  ctx.lineWidth = Math.max(1.6, tilePx * 0.06);
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();

  // Nền tối bên trong để icon vector nổi bật rực rỡ
  roundRect(ctx, cx - r * 0.76, cy - r * 0.76, r * 1.52, r * 1.52, r * 0.32);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
  ctx.fill();

  // Vẽ icon vector đa lớp riêng biệt cho từng loại vật phẩm (chuẩn Bomberman / Crazy Arcade!)
  ctx.save();
  ctx.translate(cx, cy);
  const s = r * 0.72;
  switch (it.kind) {
    case 'bomb': {
      // Quả bóng nước tròn xanh có núm buộc & phản sáng trắng
      ctx.fillStyle = '#38BDF8';
      ctx.strokeStyle = '#E0F2FE';
      ctx.lineWidth = Math.max(1.2, s * 0.14);
      ctx.beginPath();
      ctx.arc(0, s * 0.12, s * 0.68, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0284C7';
      roundRect(ctx, -s * 0.24, -s * 0.78, s * 0.48, s * 0.28, 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-s * 0.24, -s * 0.06, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'range':
    case 'max_range': {
      // Bình thủy tinh đựng thuốc nước (+1 Tầm xanh / MAX Vàng Đỏ)
      const isMax = it.kind === 'max_range';
      ctx.fillStyle = isMax ? '#FEF08A' : '#BAE6FD';
      roundRect(ctx, -s * 0.22, -s * 0.84, s * 0.44, s * 0.36, 2);
      ctx.fill();
      ctx.fillStyle = isMax ? '#EF4444' : '#0EA5E9';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(1.2, s * 0.12);
      ctx.beginPath();
      ctx.arc(0, s * 0.22, s * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (isMax) {
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.moveTo(s * 0.06, -s * 0.24);
        ctx.lineTo(-s * 0.24, s * 0.22);
        ctx.lineTo(s * 0.02, s * 0.22);
        ctx.lineTo(-s * 0.08, s * 0.68);
        ctx.lineTo(s * 0.28, s * 0.14);
        ctx.lineTo(0, s * 0.14);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-s * 0.2, s * 0.06, s * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'speed': {
      // Đôi giày trượt có cánh thiên thần
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.1);
      ctx.lineTo(-s * 0.82, -s * 0.56);
      ctx.lineTo(-s * 0.52, s * 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, -s * 0.52);
      ctx.lineTo(s * 0.1, -s * 0.52);
      ctx.lineTo(s * 0.22, s * 0.15);
      ctx.lineTo(s * 0.78, s * 0.25);
      ctx.lineTo(s * 0.78, s * 0.64);
      ctx.lineTo(-s * 0.52, s * 0.64);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'kick': {
      // Giày đinh đá bom + đường sút cong
      ctx.fillStyle = '#34D399';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.45);
      ctx.lineTo(0, -s * 0.45);
      ctx.lineTo(s * 0.12, s * 0.12);
      ctx.lineTo(s * 0.65, s * 0.2);
      ctx.lineTo(s * 0.65, s * 0.58);
      ctx.lineTo(-s * 0.5, s * 0.58);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(s * 0.52, -s * 0.2, s * 0.36, -Math.PI * 0.4, Math.PI * 0.35);
      ctx.stroke();
      break;
    }
    case 'glove': {
      // Găng tay đấm bốc đỏ gắn cổ tay trắng
      ctx.fillStyle = '#FB7185';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(s * 0.06, -s * 0.12, s * 0.56, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, -s * 0.45, s * 0.32, s * 0.9, s * 0.34, 3);
      ctx.fill();
      break;
    }
    case 'needle': {
      // Kim chích vàng nghiêng 45°
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = Math.max(2, s * 0.22);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s * 0.62, s * 0.62);
      ctx.lineTo(s * 0.54, -s * 0.54);
      ctx.stroke();
      ctx.fillStyle = '#F472B6';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(s * 0.48, -s * 0.48, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'shield': {
      // Khiên hiệp sĩ viền vàng tâm tím ngọc
      ctx.fillStyle = '#A78BFA';
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = Math.max(1.5, s * 0.16);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.72);
      ctx.lineTo(s * 0.64, -s * 0.42);
      ctx.lineTo(s * 0.52, s * 0.28);
      ctx.lineTo(0, s * 0.78);
      ctx.lineTo(-s * 0.52, s * 0.28);
      ctx.lineTo(-s * 0.64, -s * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'treasure': {
      // Viên kim cương 8 cạnh lấp lánh
      ctx.fillStyle = '#2DD4BF';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-s * 0.45, -s * 0.52);
      ctx.lineTo(s * 0.45, -s * 0.52);
      ctx.lineTo(s * 0.76, -s * 0.08);
      ctx.lineTo(0, s * 0.76);
      ctx.lineTo(-s * 0.76, -s * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.52);
      ctx.lineTo(s * 0.2, -s * 0.52);
      ctx.lineTo(0, s * 0.6);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function drawWaterBlast(
  ctx: CanvasRenderingContext2D,
  bl: BoomBlastCell,
  tilePx: number,
  now: number,
): void {
  const cx = (bl.tx + 0.5) * tilePx;
  const cy = (bl.ty + 0.5) * tilePx;
  const lifeRatio = Math.max(0.15, Math.min(1, bl.ticksLeft / BOOM_BLAST_TICKS));
  const beamHalf = tilePx * (0.38 * lifeRatio + 0.08);

  ctx.save();
  if (bl.dir === 'center') {
    // Tâm vụ nổ nước xoáy tung bọt trắng
    ctx.fillStyle = 'rgba(2, 132, 199, 0.88)';
    ctx.beginPath();
    ctx.arc(cx, cy, tilePx * 0.48 * lifeRatio + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(cx, cy, tilePx * 0.36 * lifeRatio + 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F0F9FF';
    ctx.beginPath();
    ctx.arc(cx, cy, tilePx * 0.21 * lifeRatio, 0, Math.PI * 2);
    ctx.fill();
  } else if (bl.dir === 'h') {
    const x = bl.tx * tilePx;
    ctx.fillStyle = 'rgba(2, 132, 199, 0.86)';
    ctx.fillRect(x, cy - beamHalf, tilePx + 0.5, beamHalf * 2);
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(x, cy - beamHalf * 0.68, tilePx + 0.5, beamHalf * 1.36);
    ctx.fillStyle = '#E0F2FE';
    ctx.fillRect(x, cy - beamHalf * 0.32, tilePx + 0.5, beamHalf * 0.64);
  } else {
    const y = bl.ty * tilePx;
    ctx.fillStyle = 'rgba(2, 132, 199, 0.86)';
    ctx.fillRect(cx - beamHalf, y, beamHalf * 2, tilePx + 0.5);
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(cx - beamHalf * 0.68, y, beamHalf * 1.36, tilePx + 0.5);
    ctx.fillStyle = '#E0F2FE';
    ctx.fillRect(cx - beamHalf * 0.32, y, beamHalf * 0.64, tilePx + 0.5);
  }

  // Hạt bọt nước sủi lấp lánh dọc tia
  const foamOff = Math.sin(now * 0.025 + bl.tx * 2 + bl.ty * 3) * (tilePx * 0.14);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(cx + foamOff, cy - foamOff * 0.6, Math.max(1.6, tilePx * 0.07 * lifeRatio), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWaterBomb(
  ctx: CanvasRenderingContext2D,
  b: BoomBombEntity,
  drawX: number,
  drawY: number,
  ownerHex: string,
  tilePx: number,
  now: number,
): void {
  let groundX = drawX * tilePx;
  let groundY = drawY * tilePx;
  let arcLift = 0;

  if (b.lob && b.lob.totalTicks > 0) {
    const p = Math.max(0, Math.min(1, b.lob.ticksDone / b.lob.totalTicks));
    groundX = (b.lob.fromX + (b.lob.toX - b.lob.fromX) * p) * tilePx;
    groundY = (b.lob.fromY + (b.lob.toY - b.lob.fromY) * p) * tilePx;
    arcLift = 4 * p * (1 - p) * tilePx * 1.85;
  }

  const urgency = Math.max(0, Math.min(1, 1 - b.ticksLeft / BOOM_BOMB_FUSE_TICKS));
  const freq = 0.011 + urgency * 0.024;
  const swell = 1 + (0.06 + urgency * 0.11) * Math.sin(now * freq + b.id);
  const baseR = tilePx * 0.38 * swell;

  // Bóng đổ dưới mặt đất (thu nhỏ khi quả bom bay vọt lên cao qua tường!)
  const shadowScale = Math.max(0.45, 1 - arcLift / (tilePx * 2.8));
  ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
  ctx.beginPath();
  ctx.ellipse(
    groundX,
    groundY + tilePx * 0.28,
    baseR * 0.85 * shadowScale,
    baseR * 0.34 * shadowScale,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  const cy = groundY - arcLift;
  const dangerFlash = b.ticksLeft <= 14 && Math.floor(now / 70) % 2 === 0;

  // Quả bóng nước 3D căng tròn bóng loáng
  const grad = ctx.createRadialGradient(
    groundX - baseR * 0.3,
    cy - baseR * 0.35,
    baseR * 0.12,
    groundX,
    cy,
    baseR,
  );
  if (dangerFlash) {
    grad.addColorStop(0, '#FEF08A');
    grad.addColorStop(0.45, '#FB7185');
    grad.addColorStop(1, '#BE123C');
  } else if (b.fromUfo) {
    grad.addColorStop(0, '#E9D5FF');
    grad.addColorStop(0.48, '#A855F7');
    grad.addColorStop(1, '#581C87');
  } else {
    grad.addColorStop(0, '#BAE6FD');
    grad.addColorStop(0.45, '#0EA5E9');
    grad.addColorStop(1, '#0369A1');
  }

  ctx.beginPath();
  ctx.arc(groundX, cy, baseR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Viền màu chủ sở hữu để dễ phân biệt bom đội mình / địch
  ctx.lineWidth = Math.max(1.8, tilePx * 0.065);
  ctx.strokeStyle = dangerFlash ? '#FEF08A' : ownerHex;
  ctx.stroke();

  // Miệng nút thắt bóng nước trên đỉnh
  ctx.fillStyle = dangerFlash ? '#FDE047' : '#38BDF8';
  roundRect(ctx, groundX - baseR * 0.24, cy - baseR * 1.14, baseR * 0.48, baseR * 0.24, 3);
  ctx.fill();

  // Đốm phản quang giọt nước 3D
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.beginPath();
  ctx.ellipse(
    groundX - baseR * 0.32,
    cy - baseR * 0.32,
    baseR * 0.26,
    baseR * 0.15,
    -Math.PI * 0.25,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

function drawBomberPlayer(
  ctx: CanvasRenderingContext2D,
  p: BoomPlayerEntity,
  drawX: number,
  drawY: number,
  hex: string,
  mode: 'ffa' | 'teams',
  isMe: boolean,
  myTeam: 0 | 1,
  tilePx: number,
  now: number,
): void {
  const cx = drawX * tilePx;
  const cy = drawY * tilePx;

  if (p.state === 'ufo') {
    // 🛸 ĐĨA BAY PHỤC THÙ BAY DỌC VIỀN SÂN
    const hover = Math.sin(now * 0.008 + p.colorIndex) * (tilePx * 0.07);
    const uy = cy + hover;
    const rx = tilePx * 0.44;
    const ry = tilePx * 0.22;

    // Tia ngắm laser mờ chỉ hướng ném 3 ô vào trong sân khi bom đĩa bay đã hồi xong
    if (isMe && p.ufoCooldownTicks === 0) {
      const inVec =
        p.ufoSide === 0
          ? [0, 1]
          : p.ufoSide === 1
            ? [-1, 0]
            : p.ufoSide === 2
              ? [0, -1]
              : [1, 0];
      const targetX = cx + inVec[0] * tilePx * 3;
      const targetY = cy + inVec[1] * tilePx * 3;
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(216, 180, 254, 0.82)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, uy);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(targetX, targetY, tilePx * 0.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Vòm kính UFO có đầu nhân vật nhỏ bên trong
    ctx.fillStyle = 'rgba(192, 132, 252, 0.45)';
    ctx.beginPath();
    ctx.arc(cx, uy - ry * 0.45, rx * 0.55, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#E9D5FF';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = hex;
    ctx.beginPath();
    ctx.arc(cx, uy - ry * 0.42, rx * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Đĩa kim loại Neon
    const saucerGrad = ctx.createLinearGradient(cx - rx, uy, cx + rx, uy);
    saucerGrad.addColorStop(0, '#4C1D95');
    saucerGrad.addColorStop(0.5, '#A855F7');
    saucerGrad.addColorStop(1, '#4C1D95');
    ctx.fillStyle = saucerGrad;
    ctx.beginPath();
    ctx.ellipse(cx, uy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = isMe ? '#FACC15' : '#F3E8FF';
    ctx.stroke();

    // Đèn LED chạy quanh vành đĩa bay
    for (let i = -1; i <= 1; i++) {
      const blink = (Math.floor(now / 140) + i + 3) % 3 === 0;
      ctx.fillStyle = blink ? '#22D3EE' : '#FDE047';
      ctx.beginPath();
      ctx.arc(cx + i * rx * 0.48, uy + 0.5, Math.max(1.5, tilePx * 0.055), 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // Nhân vật đang sống (`alive`) hoặc bị giam trong Bóng Nước (`trapped`)
  const moving = Math.hypot(p.vx, p.vy) > 0.2;
  const walkPhase = moving ? Math.sin(now * 0.024 + p.colorIndex) : 0;
  const walkBob = moving ? Math.abs(walkPhase) * (tilePx * 0.075) : Math.sin(now * 0.005 + p.colorIndex) * (tilePx * 0.015);
  const trappedStruggle =
    p.state === 'trapped' ? Math.sin(now * 0.025 + p.colorIndex) * (tilePx * 0.05) : 0;

  // Vòng phân biệt Đấu Đội (Đỏ vs Xanh) hoặc vòng định vị bản thân
  if (mode === 'teams' || isMe) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + tilePx * 0.29, tilePx * 0.38, tilePx * 0.16, 0, 0, Math.PI * 2);
    ctx.strokeStyle = mode === 'teams' ? (p.team === 0 ? '#EF4444' : '#3B82F6') : '#FACC15';
    ctx.lineWidth = isMe ? 2.6 : 2;
    ctx.stroke();
    ctx.restore();
  }

  // Đổ bóng chân
  ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + tilePx * 0.3, tilePx * 0.29, tilePx * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Khiên Hộ Mệnh Hoàng Kim (vẽ vòng hào quang năng lượng xoay nhẹ khi p.shieldTicks > 0)
  if (p.shieldTicks > 0) {
    const pulseAlpha = p.shieldTicks < 35 && Math.floor(now / 70) % 2 === 0 ? 0.35 : 0.85;
    ctx.save();
    ctx.globalAlpha = pulseAlpha;
    ctx.strokeStyle = '#FACC15';
    ctx.fillStyle = 'rgba(250, 204, 21, 0.16)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy - tilePx * 0.04, tilePx * 0.47, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  const bodyY = cy - walkBob + trappedStruggle;
  const headR = tilePx * 0.295;
  const suitColor = mode === 'teams' ? (p.team === 0 ? '#E11D48' : '#2563EB') : hex;

  // Hai bàn chân ủng Chibi đánh nhịp chạy lon ton
  const footSwing = moving ? walkPhase * (tilePx * 0.1) : 0;
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.ellipse(cx - tilePx * 0.12, cy + tilePx * 0.24 - Math.max(0, footSwing), tilePx * 0.095, tilePx * 0.072, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + tilePx * 0.12, cy + tilePx * 0.24 - Math.max(0, -footSwing), tilePx * 0.095, tilePx * 0.072, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hai cánh tay đeo găng trắng đánh vung vẩy ngược pha bước chân
  const armSwing = moving ? -walkPhase * (tilePx * 0.1) : Math.sin(now * 0.006 + p.colorIndex) * (tilePx * 0.02);
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx - tilePx * 0.24, bodyY + tilePx * 0.11 + armSwing, tilePx * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + tilePx * 0.24, bodyY + tilePx * 0.11 - armSwing, tilePx * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Thân áo chibi + dây đai thắt lưng
  roundRect(ctx, cx - tilePx * 0.19, bodyY + tilePx * 0.01, tilePx * 0.38, tilePx * 0.24, tilePx * 0.1);
  ctx.fillStyle = suitColor;
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = '#0F172A';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(cx - tilePx * 0.16, bodyY + tilePx * 0.14, tilePx * 0.32, tilePx * 0.045);

  // Bình nước phản lực đôi sau lưng khi quay mặt đi lên (`dir === 3`)
  if (p.dir === 3) {
    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.3;
    roundRect(ctx, cx - tilePx * 0.15, bodyY - tilePx * 0.02, tilePx * 0.13, tilePx * 0.24, 4);
    ctx.fill();
    ctx.stroke();
    roundRect(ctx, cx + tilePx * 0.02, bodyY - tilePx * 0.02, tilePx * 0.13, tilePx * 0.24, 4);
    ctx.fill();
    ctx.stroke();
  }

  // Mũ bảo hiểm Chibi Bomber tròn to bóng loáng + sọc trán thể thao
  const helmetGrad = ctx.createRadialGradient(
    cx - headR * 0.3,
    bodyY - tilePx * 0.12 - headR * 0.3,
    headR * 0.1,
    cx,
    bodyY - tilePx * 0.08,
    headR,
  );
  helmetGrad.addColorStop(0, '#FFFFFF');
  helmetGrad.addColorStop(0.28, suitColor);
  helmetGrad.addColorStop(1, suitColor);
  ctx.beginPath();
  ctx.arc(cx, bodyY - tilePx * 0.08, headR, 0, Math.PI * 2);
  ctx.fillStyle = helmetGrad;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, tilePx * 0.055);
  ctx.strokeStyle = '#0F172A';
  ctx.stroke();

  // Ăng-ten cục bông lắc lư theo nhịp chạy
  const antLag = -walkPhase * (tilePx * 0.05);
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx, bodyY - tilePx * 0.08 - headR);
  ctx.lineTo(cx + antLag, bodyY - tilePx * 0.08 - headR - tilePx * 0.1);
  ctx.stroke();
  ctx.fillStyle = isMe ? '#FACC15' : '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx + antLag, bodyY - tilePx * 0.08 - headR - tilePx * 0.12, Math.max(2.3, tilePx * 0.09), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Khuôn mặt & đôi mắt long lanh theo hướng nhìn (ẩn khi quay lưng lên trên dir === 3)
  if (p.dir !== 3) {
    const lookX = p.dir === 1 ? -tilePx * 0.065 : p.dir === 2 ? tilePx * 0.065 : 0;
    const visorW = headR * 1.42;
    const visorH = headR * 0.88;
    const vx = cx - visorW * 0.5 + lookX;
    const vy = bodyY - tilePx * 0.08 - visorH * 0.4;

    roundRect(ctx, vx, vy, visorW, visorH, visorH * 0.44);
    ctx.fillStyle = '#FFF7ED';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#1E293B';
    ctx.stroke();

    // Hai má hồng Chibi
    ctx.fillStyle = 'rgba(251, 113, 133, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx + lookX - visorW * 0.3, vy + visorH * 0.72, tilePx * 0.048, tilePx * 0.028, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + lookX + visorW * 0.3, vy + visorH * 0.72, tilePx * 0.048, tilePx * 0.028, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    if (p.state === 'trapped') {
      // Mắt chữ > < hoảng hốt khi bị nhốt trong bóng nước!
      ctx.font = `900 ${Math.max(7, Math.round(tilePx * 0.22))}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('><', cx + lookX, vy + visorH * 0.54);
    } else {
      const eyeOff = visorW * 0.22;
      const eyeRx = Math.max(1.5, tilePx * 0.048);
      const eyeRy = Math.max(2.2, tilePx * 0.082);
      ctx.beginPath();
      ctx.ellipse(cx + lookX - eyeOff, vy + visorH * 0.48, eyeRx, eyeRy, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + lookX + eyeOff, vy + visorH * 0.48, eyeRx, eyeRy, 0, 0, Math.PI * 2);
      ctx.fill();
      // Đốm sáng long lanh trong mắt
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx + lookX - eyeOff - eyeRx * 0.25, vy + visorH * 0.41, Math.max(0.8, eyeRx * 0.42), 0, Math.PI * 2);
      ctx.arc(cx + lookX + eyeOff - eyeRx * 0.25, vy + visorH * 0.41, Math.max(0.8, eyeRx * 0.42), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 🫧 QUẢ BÓNG NƯỚC KHỔNG LỒ NHỐT NHÂN VẬT (`trapped`)
  if (p.state === 'trapped') {
    const wobble = Math.sin(now * 0.018 + p.colorIndex) * 0.07;
    const brx = tilePx * 0.52 * (1 + wobble);
    const bry = tilePx * 0.52 * (1 - wobble);
    const by = cy - tilePx * 0.05;

    const bubGrad = ctx.createRadialGradient(cx - brx * 0.3, by - bry * 0.3, brx * 0.1, cx, by, brx);
    bubGrad.addColorStop(0, 'rgba(224, 242, 254, 0.32)');
    bubGrad.addColorStop(0.65, 'rgba(56, 189, 248, 0.48)');
    bubGrad.addColorStop(1, 'rgba(2, 132, 199, 0.78)');

    ctx.beginPath();
    ctx.ellipse(cx, by, brx, bry, 0, 0, Math.PI * 2);
    ctx.fillStyle = bubGrad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = p.trappedTicks < 28 && Math.floor(now / 80) % 2 === 0 ? '#FB7185' : '#BAE6FD';
    ctx.stroke();

    // Vòng đếm ngược 4.5s quanh bóng nước
    const remainRatio = Math.max(0, Math.min(1, p.trappedTicks / BOOM_TRAPPED_TICKS));
    ctx.beginPath();
    ctx.arc(cx, by, tilePx * 0.57, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * remainRatio);
    ctx.strokeStyle = remainRatio < 0.33 ? '#F43F5E' : '#38BDF8';
    ctx.lineWidth = 2.6;
    ctx.stroke();

    // Phản quang bóng nước
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.beginPath();
    ctx.ellipse(cx - brx * 0.35, by - bry * 0.35, brx * 0.24, bry * 0.13, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Nhãn kêu cứu / kết liễu trực quan!
    const tag =
      isMe && p.needles > 0
        ? '📌 BẤM KIM!'
        : mode === 'teams' && p.team === myTeam && !isMe
          ? '💙 CỨU!'
          : !isMe
            ? '💥 BỤP!'
            : '🫧 CỨU!';
    const tagBg =
      isMe && p.needles > 0
        ? '#DB2777'
        : mode === 'teams' && p.team === myTeam && !isMe
          ? '#0284C7'
          : '#E11D48';

    ctx.font = `900 ${Math.max(8, Math.round(tilePx * 0.24))}px ${FONT}`;
    const tw = ctx.measureText(tag).width + 8;
    const th = Math.max(12, tilePx * 0.34);
    roundRect(ctx, cx - tw * 0.5, by - tilePx * 0.78, tw, th, 6);
    ctx.fillStyle = tagBg;
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, cx, by - tilePx * 0.78 + th * 0.52);
    return;
  }

  // Nhãn tên nhỏ gọn hoặc mũi tên "BẠN"
  if (tilePx >= 20) {
    const label = isMe ? '▼ BẠN' : p.name.slice(0, 9);
    ctx.font = `${isMe ? '900' : '800'} ${Math.max(8, Math.round(tilePx * 0.23))}px ${FONT}`;
    const tw = ctx.measureText(label).width + 7;
    const th = Math.max(11, tilePx * 0.3);
    const ly = bodyY - headR - tilePx * 0.48;
    roundRect(ctx, cx - tw * 0.5, ly, tw, th, 5);
    ctx.fillStyle = isMe ? 'rgba(250, 204, 21, 0.94)' : 'rgba(15, 23, 42, 0.72)';
    ctx.fill();
    ctx.fillStyle = isMe ? '#0F172A' : '#F8FAFC';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, ly + th * 0.53);
  }
}

// ============================================================================
// MÀN HÌNH CHÍNH (TỰ XOAY NGANG LANDSCAPE + 60FPS CANVAS + TAY CẦM CẢM ỨNG)
// ============================================================================

export function BoomOnlineScreen(props: { game: Game; room?: RoomState }) {
  return (
    <Rotator>
      <BoomOnlineBody {...props} />
    </Rotator>
  );
}

function BoomOnlineBody({ game, room: roomProp }: { game: Game; room?: RoomState }) {
  const room = roomProp ?? game.room;
  if (!room || room.game?.type !== 'boom_online') return null;
  return <BoomOnlineInner game={game} room={room} view={room.game} />;
}

function BoomOnlineInner({
  game,
  room,
  view,
}: {
  game: Game;
  room: RoomState;
  view: BoomView;
}) {
  const { width, height } = useStableWindow();
  const vp = useContext(ViewportContext);
  const rotated = !!vp?.rotated;
  const me = game.me ?? '';
  const isHost = room.hostId === me;

  const compactH = height < 420;
  const desktopWide = width >= 920 && height >= 520;

  // Bảng màu nhân vật đồng bộ từ phòng chờ
  const colorHexById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [id, cIdx] of Object.entries(view.colors)) {
      m[id] = PLAYER_COLORS[(cIdx ?? 0) % PLAYER_COLORS.length].hex;
    }
    room.players.forEach((pl, idx) => {
      const cIdx = pl.character?.color ?? view.colors[pl.id] ?? idx;
      m[pl.id] = PLAYER_COLORS[cIdx % PLAYER_COLORS.length].hex;
    });
    return m;
  }, [room.players, view.colors]);

  const computeHudFromPayload = useCallback(
    (snap: BoomTickPayload, winnerTxt: string | null): HudState => {
      const mine = snap.players.find((p) => p.id === me) ?? null;
      const nonUfo = snap.players.filter((p) => p.state !== 'ufo');
      const redAlive = nonUfo.filter((p) => p.team === 0).length;
      const blueAlive = nonUfo.filter((p) => p.team === 1).length;
      const standingOnBomb = !!(
        mine &&
        mine.state === 'alive' &&
        snap.bombs.some(
          (b) => !b.lob && Math.floor(b.x) === Math.floor(mine.x) && Math.floor(b.y) === Math.floor(mine.y),
        )
      );
      return {
        round: snap.round,
        totalRounds: view.totalRounds,
        phase: snap.phase,
        secLeft: Math.max(0, Math.ceil(snap.timeLeftMs / 1000)),
        ringActive: snap.ringActive,
        aliveCount: nonUfo.length,
        totalPlayers: snap.players.length,
        redAlive,
        blueAlive,
        myState: mine?.state ?? null,
        myTeam: mine?.team ?? 0,
        maxBombs: mine?.maxBombs ?? 1,
        activeBombs: mine?.activeBombs ?? 0,
        range: mine?.range ?? 1,
        speedLvl: mine?.speedLvl ?? 1,
        canKick: !!mine?.canKick,
        canGlove: !!mine?.canGlove,
        needles: mine?.needles ?? 0,
        shieldSec: mine && mine.shieldTicks > 0 ? Math.ceil(mine.shieldTicks / 20) : 0,
        standingOnBomb,
        ufoCooldownSec: mine ? Math.ceil(mine.ufoCooldownTicks / 20) : 0,
        roundWinnerText: winnerTxt,
        killFeed: snap.killFeed.slice(-3),
      };
    },
    [me, view.totalRounds],
  );

  const [hud, setHud] = useState<HudState>(() =>
    computeHudFromPayload(view.snapshot, view.roundWinnerText),
  );
  const [dpadUi, setDpadUi] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Buffer vật lý 20Hz cho nội suy 60FPS mượt mà (không gọi setState cho toạ độ!)
  const snapRef = useRef<{
    prev: BoomTickPayload | null;
    curr: BoomTickPayload;
    prevGrid: BoomTile[] | null;
    currAt: number;
  }>({
    prev: null,
    curr: view.snapshot,
    prevGrid: view.snapshot.grid,
    currAt: 0,
  });

  const initMe = view.snapshot.players.find((p) => p.id === me);
  const predRef = useRef<PredictedLocal>({
    round: view.snapshot.round,
    initialized: !!initMe,
    x: initMe?.x ?? 1.5,
    y: initMe?.y ?? 1.5,
    dir: initMe?.dir ?? 0,
  });

  const particlesRef = useRef<FxParticle[]>([]);
  const popupsRef = useRef<FloatingPopup[]>([]);
  const shakeRef = useRef<number>(0);
  const lastEventIdRef = useRef<number>(
    view.snapshot.events.length > 0 ? view.snapshot.events[view.snapshot.events.length - 1].id : 0,
  );

  const moveVecRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const keysRef = useRef<{ up: boolean; down: boolean; left: boolean; right: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false,
  });
  const seqRef = useRef<number>(1);
  const lastBtnAtRef = useRef<number>(0);
  const dpadLayoutRef = useRef<{ w: number; h: number }>({ w: 132, h: 132 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bakedFloorRef = useRef<{ key: string; canvas: HTMLCanvasElement | null }>({
    key: '',
    canvas: null,
  });

  const winnerTextRef = useRef<string | null>(view.roundWinnerText);
  useEffect(() => {
    winnerTextRef.current = view.roundWinnerText;
  }, [view.roundWinnerText]);

  const gridCacheRef = useRef<{ round: number; grid: BoomTile[] }>({
    round: view.snapshot.round,
    grid: [...view.snapshot.grid],
  });
  const pendingInputsRef = useRef<{ seq: number; dx: number; dy: number; dtAccum: number }[]>([]);
  const visualOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastMoveEmitAtRef = useRef<number>(0);
  const ghostBombsRef = useRef<{ tx: number; ty: number; placedAt: number; range: number }[]>([]);
  const lastLocalBombAtRef = useRef<number>(0);

  const spawnBurstParticles = useCallback(
    (wx: number, wy: number, colors: string[], count: number, speedScale = 1, addRing = false) => {
      const arr = particlesRef.current;
      if (arr.length > 140) arr.splice(0, arr.length - 100);
      if (addRing) {
        arr.push({
          x: wx,
          y: wy,
          vx: 0,
          vy: 0,
          size: 0.25,
          color: colors[0] ?? '#38BDF8',
          alpha: 0.9,
          life: 0,
          maxLife: 0.34,
          ring: true,
        });
      }
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const spd = (1.4 + Math.random() * 2.8) * speedScale;
        arr.push({
          x: wx,
          y: wy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: 0.08 + Math.random() * 0.09,
          color: colors[i % colors.length],
          alpha: 1,
          life: 0,
          maxLife: 0.28 + Math.random() * 0.22,
        });
      }
    },
    [],
  );

  const syncHudSmart = useCallback(
    (payload: BoomTickPayload, winText: string | null) => {
      const next = computeHudFromPayload(payload, winText);
      setHud((prev) => {
        const lastPrevFeed = prev.killFeed.at(-1)?.id ?? 0;
        const lastNextFeed = next.killFeed.at(-1)?.id ?? 0;
        if (
          prev.round === next.round &&
          prev.phase === next.phase &&
          prev.secLeft === next.secLeft &&
          prev.ringActive === next.ringActive &&
          prev.aliveCount === next.aliveCount &&
          prev.redAlive === next.redAlive &&
          prev.blueAlive === next.blueAlive &&
          prev.myState === next.myState &&
          prev.maxBombs === next.maxBombs &&
          prev.activeBombs === next.activeBombs &&
          prev.range === next.range &&
          prev.speedLvl === next.speedLvl &&
          prev.canKick === next.canKick &&
          prev.canGlove === next.canGlove &&
          prev.needles === next.needles &&
          prev.standingOnBomb === next.standingOnBomb &&
          prev.ufoCooldownSec === next.ufoCooldownSec &&
          prev.roundWinnerText === next.roundWinnerText &&
          lastPrevFeed === lastNextFeed
        ) {
          return prev;
        }
        return next;
      });
    },
    [computeHudFromPayload],
  );

  // Đồng bộ khi `room:state` chuyển hiệp / pha lớn
  useEffect(() => {
    const snap = view.snapshot;
    if (snap.round !== snapRef.current.curr.round || snap.tick > snapRef.current.curr.tick) {
      gridCacheRef.current = { round: snap.round, grid: [...snap.grid] };
      if (snap.round !== snapRef.current.curr.round) {
        pendingInputsRef.current = [];
        visualOffsetRef.current = { x: 0, y: 0 };
        ghostBombsRef.current = [];
      }
      snapRef.current = {
        prev: snap.round === snapRef.current.curr.round ? snapRef.current.curr : null,
        curr: snap,
        prevGrid: snap.grid,
        currAt: performance.now(),
      };
    }
  }, [view]);

  useOnChange(`${view.round}:${view.phase}:${view.roundWinnerText ?? ''}`, () => {
    syncHudSmart(view.snapshot, view.roundWinnerText);
  });

  // Luồng 20Hz từ Server (Reconciliation chuẩn theo ackSeq + gridDiff)
  useEffect(() => {
    return game.onBoomTick((payload) => {
      const now = performance.now();
      const sameRound = payload.round === snapRef.current.curr.round;
      const oldGrid = sameRound ? gridCacheRef.current.grid : snapRef.current.prevGrid;

      let resolvedGrid: BoomTile[];
      if (payload.grid && payload.grid.length > 0) {
        resolvedGrid = payload.grid;
        if (oldGrid && oldGrid.length === resolvedGrid.length && sameRound) {
          for (let i = 0; i < resolvedGrid.length; i++) {
            if (oldGrid[i] === 2 && resolvedGrid[i] === 0) {
              const tx = i % payload.width;
              const ty = Math.floor(i / payload.width);
              spawnBurstParticles(tx + 0.5, ty + 0.5, ['#F59E0B', '#D97706', '#FEF3C7'], 6, 0.85);
            }
          }
        }
        gridCacheRef.current = { round: payload.round, grid: [...resolvedGrid] };
      } else {
        const base =
          gridCacheRef.current.round === payload.round && gridCacheRef.current.grid.length === payload.width * payload.height
            ? [...gridCacheRef.current.grid]
            : [...(snapRef.current.curr.grid ?? [])];
        if (payload.gridDiff && payload.gridDiff.length > 0 && base.length === payload.width * payload.height) {
          for (const [idx, nextTile] of payload.gridDiff) {
            if (idx >= 0 && idx < base.length) {
              if (base[idx] === 2 && nextTile === 0) {
                const tx = idx % payload.width;
                const ty = Math.floor(idx / payload.width);
                spawnBurstParticles(tx + 0.5, ty + 0.5, ['#F59E0B', '#D97706', '#FEF3C7'], 6, 0.85);
              }
              base[idx] = nextTile;
            }
          }
        }
        resolvedGrid = base;
        gridCacheRef.current = { round: payload.round, grid: base };
      }

      const resolvedPayload: BoomTickPayload = {
        ...payload,
        grid: resolvedGrid,
      };

      snapRef.current = {
        prev: sameRound ? snapRef.current.curr : null,
        curr: resolvedPayload,
        prevGrid: resolvedGrid,
        currAt: now,
      };

      // Dọn ghost bomb đã được server xác nhận hoặc quá hạn
      ghostBombsRef.current = ghostBombsRef.current.filter((gb) => {
        if (now - gb.placedAt > 450) return false;
        return !resolvedPayload.bombs.some(
          (b) => !b.lob && Math.floor(b.x) === gb.tx && Math.floor(b.y) === gb.ty,
        );
      });

      // Server Reconciliation theo ackSeq: replay các input đang bay trên mạng thay vì kéo ngược về quá khứ
      const srvMe = resolvedPayload.players.find((p) => p.id === me);
      if (srvMe) {
        const pr = predRef.current;
        const ackSeq = resolvedPayload.acks?.[me];
        if (typeof ackSeq === 'number') {
          pendingInputsRef.current = pendingInputsRef.current.filter((inp) => inp.seq > ackSeq);
        }

        const hardSync =
          !pr.initialized ||
          pr.round !== resolvedPayload.round ||
          resolvedPayload.phase !== 'playing' ||
          srvMe.state === 'ufo';

        if (hardSync) {
          pr.round = resolvedPayload.round;
          pr.initialized = true;
          pr.x = srvMe.x;
          pr.y = srvMe.y;
          pr.dir = srvMe.dir;
          pendingInputsRef.current = [];
          visualOffsetRef.current = { x: 0, y: 0 };
        } else {
          let rx = srvMe.x;
          let ry = srvMe.y;
          const spd = getBoomPlayerSpeed(srvMe.speedLvl, srvMe.state);
          const isSolidForReplay = (tx: number, ty: number) => {
            if (tx < 0 || tx >= resolvedPayload.width || ty < 0 || ty >= resolvedPayload.height) return true;
            if (resolvedGrid[ty * resolvedPayload.width + tx] !== 0) return true;
            for (const b of resolvedPayload.bombs) {
              if (b.lob) continue;
              const btx = Math.floor(b.x);
              const bty = Math.floor(b.y);
              if (btx === tx && bty === ty) {
                const overlaps = Math.abs(rx - (btx + 0.5)) < 0.86 && Math.abs(ry - (bty + 0.5)) < 0.86;
                if (!overlaps) return true;
              }
            }
            return false;
          };

          for (const inp of pendingInputsRef.current) {
            let rem = Math.min(0.25, inp.dtAccum);
            while (rem > 1e-4) {
              const chunk = Math.min(0.05, rem);
              rem -= chunk;
              const stepped = moveBoomPlayerWithSlide(
                rx,
                ry,
                inp.dx,
                inp.dy,
                spd,
                chunk,
                resolvedPayload.width,
                resolvedPayload.height,
                isSolidForReplay,
              );
              rx = stepped.x;
              ry = stepped.y;
            }
          }

          const diffX = pr.x - rx;
          const diffY = pr.y - ry;
          const errDist = Math.hypot(diffX, diffY);
          pr.x = rx;
          pr.y = ry;
          if (errDist > 1.35) {
            visualOffsetRef.current = { x: 0, y: 0 };
          } else if (errDist > 0.01) {
            const nextOx = visualOffsetRef.current.x + diffX;
            const nextOy = visualOffsetRef.current.y + diffY;
            const mag = Math.hypot(nextOx, nextOy);
            const scale = mag > 0.55 ? 0.55 / mag : 1;
            visualOffsetRef.current = { x: nextOx * scale, y: nextOy * scale };
          }
        }
      }

      // Xử lý âm thanh & hiệu ứng hạt từ sự kiện mới (khử trùng lặp âm đặt bom đã phát cục bộ 0ms)
      for (const ev of resolvedPayload.events) {
        if (ev.id <= lastEventIdRef.current) continue;
        lastEventIdRef.current = ev.id;
        const related = ev.actorId === me || ev.targetId === me;
        const suppressDupPlace =
          ev.kind === 'place' &&
          ev.actorId === me &&
          now - lastLocalBombAtRef.current < 400;
        if (!suppressDupPlace) {
          triggerBoomSfx(ev.kind, related);
        }

        if (ev.kind === 'explode' && ev.x !== undefined && ev.y !== undefined) {
          spawnBurstParticles(ev.x, ev.y, ['#38BDF8', '#BAE6FD', '#FFFFFF'], 9, 1.15, true);
          shakeRef.current = Math.max(shakeRef.current, 3.5);
        } else if (ev.kind === 'pop_kill' && ev.x !== undefined && ev.y !== undefined) {
          spawnBurstParticles(ev.x, ev.y, ['#FB7185', '#38BDF8', '#FEF08A'], 14, 1.35, true);
          popupsRef.current.push({ x: ev.x, y: ev.y - 0.3, text: 'BỤP!!', color: '#FEF08A', bornAt: now });
          shakeRef.current = Math.max(shakeRef.current, 6);
        } else if (ev.kind === 'rescue' && ev.x !== undefined && ev.y !== undefined) {
          spawnBurstParticles(ev.x, ev.y, ['#34D399', '#BAE6FD', '#FFFFFF'], 10, 1.0, true);
          popupsRef.current.push({ x: ev.x, y: ev.y - 0.3, text: 'CỨU SỐNG!', color: '#6EE7B7', bornAt: now });
        } else if (ev.kind === 'needle' && ev.x !== undefined && ev.y !== undefined) {
          spawnBurstParticles(ev.x, ev.y, ['#F472B6', '#FBCFE8', '#FFFFFF'], 10, 1.0, true);
          popupsRef.current.push({ x: ev.x, y: ev.y - 0.3, text: 'TỰ CỨU!', color: '#F9A8D4', bornAt: now });
        } else if (ev.kind === 'pickup' && ev.x !== undefined && ev.y !== undefined && ev.text) {
          popupsRef.current.push({ x: ev.x, y: ev.y - 0.25, text: ev.text, color: '#FDE047', bornAt: now });
        } else if (ev.kind === 'ring_drop' && ev.x !== undefined && ev.y !== undefined) {
          spawnBurstParticles(ev.x, ev.y, ['#EF4444', '#94A3B8', '#FACC15'], 6, 0.8);
          shakeRef.current = Math.max(shakeRef.current, 2.4);
        } else if (ev.kind === 'round_win' && ev.text) {
          winnerTextRef.current = ev.text;
        }
      }

      if (resolvedPayload.phase === 'playing') {
        winnerTextRef.current = null;
      }
      syncHudSmart(resolvedPayload, winnerTextRef.current);
    });
  }, [game, me, spawnBurstParticles, syncHudSmart]);

  // Gửi input thời gian thực (0ms one-way socket emit + lưu queue phục vụ Server Reconciliation)
  const emitInput = useCallback(
    (dx: number, dy: number, extra?: { placeBomb?: boolean; special?: boolean }) => {
      const seq = seqRef.current++;
      lastMoveEmitAtRef.current = performance.now();
      const q = pendingInputsRef.current;
      q.push({ seq, dx, dy, dtAccum: 0 });
      if (q.length > 60) q.splice(0, q.length - 60);
      const payload: BoomInput = {
        seq,
        dx,
        dy,
        ...(extra?.placeBomb ? { placeBomb: true } : {}),
        ...(extra?.special ? { special: true } : {}),
      };
      void game.act({ type: 'bm_input', input: payload });
    },
    [game],
  );

  const setMoveVector = useCallback(
    (dx: number, dy: number) => {
      if (moveVecRef.current.dx === dx && moveVecRef.current.dy === dy) return;
      moveVecRef.current = { dx, dy };
      setDpadUi({ dx, dy });
      emitInput(dx, dy);
    },
    [emitInput],
  );

  const triggerBombPress = useCallback(() => {
    const snap = snapRef.current.curr;
    const srvMe = snap.players.find((p) => p.id === me);
    const pr = predRef.current;
    const grid = gridCacheRef.current.grid;
    const now = performance.now();
    if (
      snap.phase === 'playing' &&
      srvMe &&
      srvMe.state === 'alive' &&
      srvMe.activeBombs + ghostBombsRef.current.length < srvMe.maxBombs
    ) {
      const tx = Math.floor(pr.x);
      const ty = Math.floor(pr.y);
      const tileFree = tx >= 1 && tx < snap.width - 1 && ty >= 1 && ty < snap.height - 1 && grid[ty * snap.width + tx] === 0;
      const bombAlreadyThere =
        snap.bombs.some((b) => !b.lob && Math.floor(b.x) === tx && Math.floor(b.y) === ty) ||
        ghostBombsRef.current.some((gb) => gb.tx === tx && gb.ty === ty);
      if (tileFree && !bombAlreadyThere) {
        ghostBombsRef.current.push({ tx, ty, placedAt: now, range: srvMe.range });
        lastLocalBombAtRef.current = now;
        triggerBoomSfx('place', true);
      }
    }
    emitInput(moveVecRef.current.dx, moveVecRef.current.dy, { placeBomb: true });
  }, [emitInput, me]);

  const triggerSpecialPress = useCallback(() => {
    emitInput(moveVecRef.current.dx, moveVecRef.current.dy, { special: true });
  }, [emitInput]);

  // Điều khiển Bàn Phím Desktop (WASD / Mũi tên + Space/J/Enter + K/E/Shift)
  useEffect(() => {
    if (Platform.OS !== 'web' || hud.myState === null) return;

    const recomputeKeyMove = () => {
      const k = keysRef.current;
      const dx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      const dy = (k.down ? 1 : 0) - (k.up ? 1 : 0);
      setMoveVector(dx, dy);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        keysRef.current.up = true;
        recomputeKeyMove();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        keysRef.current.down = true;
        recomputeKeyMove();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        keysRef.current.left = true;
        recomputeKeyMove();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        keysRef.current.right = true;
        recomputeKeyMove();
      } else if (e.key === ' ' || e.key === 'j' || e.key === 'J' || e.key === 'Enter') {
        e.preventDefault();
        if (!e.repeat) triggerBombPress();
      } else if (e.key === 'k' || e.key === 'K' || e.key === 'e' || e.key === 'E' || e.key === 'Shift') {
        e.preventDefault();
        if (!e.repeat) triggerSpecialPress();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        keysRef.current.up = false;
        recomputeKeyMove();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        keysRef.current.down = false;
        recomputeKeyMove();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.left = false;
        recomputeKeyMove();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.right = false;
        recomputeKeyMove();
      }
    };

    const onBlur = () => {
      keysRef.current = { up: false, down: false, left: false, right: false };
      setMoveVector(0, 0);
    };
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') onBlur();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      setMoveVector(0, 0);
    };
  }, [hud.myState, setMoveVector, triggerBombPress, triggerSpecialPress]);

  const [arenaBox, setArenaBox] = useState<{ w: number; h: number } | null>(null);
  const isSpectator = room.players.find((p) => p.id === me)?.spectator === true || hud.myState === null;

  // Tính kích thước ô bản đồ sao cho 100% vừa khít chiều cao & chừa vùng ngón cái hai bên (kể cả khi có banner khán giả)
  const arenaMetrics = useMemo(() => {
    const topHudH = compactH ? 34 : 40;
    const bottomHintH = desktopWide ? 20 : 4;
    const measuredW = arenaBox?.w ?? width;
    const measuredH =
      arenaBox?.h ??
      Math.max(160, height - topHudH - bottomHintH - 8 - (isSpectator ? 42 : 0));
    const availH = Math.max(150, measuredH - (hud.myState === null ? 26 : 6));
    // Dành khoảng trống hai bên cho cụm D-Pad trái & Nút Bom phải để tay không bao giờ che mê cung!
    const sidePad = hud.myState === null ? 16 : measuredW < 720 ? 212 : measuredW < 960 ? 236 : 250;
    const availW = Math.max(220, measuredW - sidePad);
    const tilePx = Math.max(15, Math.floor(Math.min(availW / view.width, availH / view.height)));
    return {
      tilePx,
      canvasW: tilePx * view.width,
      canvasH: tilePx * view.height,
    };
  }, [arenaBox, compactH, desktopWide, height, hud.myState, isSpectator, view.height, view.width, width]);

  const renderCfgRef = useRef({
    me,
    mode: view.mode,
    colorHexById,
    tilePx: arenaMetrics.tilePx,
    canvasW: arenaMetrics.canvasW,
    canvasH: arenaMetrics.canvasH,
  });
  useEffect(() => {
    renderCfgRef.current = {
      me,
      mode: view.mode,
      colorHexById,
      tilePx: arenaMetrics.tilePx,
      canvasW: arenaMetrics.canvasW,
      canvasH: arenaMetrics.canvasH,
    };
  }, [me, view.mode, colorHexById, arenaMetrics]);

  // Vòng lặp vẽ 60FPS HiDPI Canvas
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let rafId = 0;
    let lastFrameAt = performance.now();

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameAt) / 1000));
      lastFrameAt = now;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const cfg = renderCfgRef.current;
        const snap = snapRef.current.curr;
        const activeGrid = snap.grid ?? gridCacheRef.current.grid;
        const prevSnap = snapRef.current.prev;
        const tilePx = cfg.tilePx;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const targetW = Math.round(cfg.canvasW * dpr);
        const targetH = Math.round(cfg.canvasH * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        const floorKey = `${snap.width}x${snap.height}@${tilePx}@${dpr}`;
        if (bakedFloorRef.current.key !== floorKey || !bakedFloorRef.current.canvas) {
          bakedFloorRef.current = {
            key: floorKey,
            canvas: bakeStaticArenaCanvas(snap.width, snap.height, tilePx, dpr),
          };
        }

        // Phát input nhịp 20Hz khi đang di chuyển liên tục để server ack từng lát cắt chuyển động & tích lũy dt replay
        const mv = moveVecRef.current;
        if (snap.phase === 'playing' && (mv.dx !== 0 || mv.dy !== 0) && now - lastMoveEmitAtRef.current >= 48) {
          const seq = seqRef.current++;
          lastMoveEmitAtRef.current = now;
          const q = pendingInputsRef.current;
          q.push({ seq, dx: mv.dx, dy: mv.dy, dtAccum: 0 });
          if (q.length > 60) q.splice(0, q.length - 60);
          void game.act({ type: 'bm_input', input: { seq, dx: mv.dx, dy: mv.dy } });
        }
        const tailInp = pendingInputsRef.current.at(-1);
        if (tailInp && snap.phase === 'playing') {
          tailInp.dtAccum = Math.min(0.25, tailInp.dtAccum + dt);
        }

        // Làm tắt dần offset hình ảnh (visual smoothing) không kéo giật vị trí vật lý
        const vo = visualOffsetRef.current;
        if (vo.x !== 0 || vo.y !== 0) {
          const decay = Math.exp(-dt * 16);
          vo.x *= decay;
          vo.y *= decay;
          if (Math.hypot(vo.x, vo.y) < 0.004) {
            vo.x = 0;
            vo.y = 0;
          }
        }

        // Bước dự đoán mượt 60fps cho nhân vật của chính mình khi đang chơi
        const srvMe = snap.players.find((p) => p.id === cfg.me);
        if (
          srvMe &&
          snap.phase === 'playing' &&
          (srvMe.state === 'alive' || srvMe.state === 'trapped')
        ) {
          const pr = predRef.current;
          pr.dir = dirFromDelta(mv.dx, mv.dy, pr.dir);
          const spd = getBoomPlayerSpeed(srvMe.speedLvl, srvMe.state);
          const isSolidLocal = (tx: number, ty: number) => {
            if (tx < 0 || tx >= snap.width || ty < 0 || ty >= snap.height) return true;
            if (activeGrid[ty * snap.width + tx] !== 0) return true;
            for (const b of snap.bombs) {
              if (b.lob) continue;
              const btx = Math.floor(b.x);
              const bty = Math.floor(b.y);
              if (btx === tx && bty === ty) {
                const overlapsNow =
                  Math.abs(pr.x - (btx + 0.5)) < 0.86 && Math.abs(pr.y - (bty + 0.5)) < 0.86;
                if (!overlapsNow) return true;
              }
            }
            return false;
          };
          const stepped = moveBoomPlayerWithSlide(
            pr.x,
            pr.y,
            mv.dx,
            mv.dy,
            spd,
            dt,
            snap.width,
            snap.height,
            isSolidLocal,
          );
          pr.x = stepped.x;
          pr.y = stepped.y;
        }

        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Rung chấn nhẹ khi bom nổ dây chuyền / gạch tử thần sập
        if (shakeRef.current > 0.1) {
          const sx = (Math.random() - 0.5) * shakeRef.current * 2;
          const sy = (Math.random() - 0.5) * shakeRef.current * 2;
          ctx.translate(sx, sy);
          shakeRef.current *= 0.86;
        } else {
          shakeRef.current = 0;
        }

        // 1. Nền tĩnh (cỏ bàn cờ + tường đá 3D) từ Offscreen Canvas
        if (bakedFloorRef.current.canvas) {
          ctx.drawImage(bakedFloorRef.current.canvas, 0, 0, cfg.canvasW, cfg.canvasH);
        } else {
          ctx.fillStyle = '#27AE60';
          ctx.fillRect(0, 0, cfg.canvasW, cfg.canvasH);
        }

        // 2. Thùng gỗ phá được (2) & Gạch Tử Thần Vòng Bo (3)
        for (let ty = 0; ty < snap.height; ty++) {
          for (let tx = 0; tx < snap.width; tx++) {
            const tile = activeGrid[ty * snap.width + tx];
            if (tile === 2) {
              drawWoodenCrate(ctx, tx * tilePx, ty * tilePx, tilePx);
            } else if (tile === 3) {
              drawDeathBrick(ctx, tx * tilePx, ty * tilePx, tilePx, now);
            }
          }
        }

        // 3. Ô cảnh báo sắp sập Vòng Bo (`warningCells`)
        for (const wIdx of snap.warningCells) {
          const tx = wIdx % snap.width;
          const ty = Math.floor(wIdx / snap.width);
          drawWarningTile(ctx, tx * tilePx, ty * tilePx, tilePx, now);
        }

        // 4. Vật phẩm rớt trên sàn
        for (const it of snap.items) {
          drawPowerUpItem(ctx, it, tilePx, now);
        }

        // 5. Tia nước chữ thập áp lực cao
        for (const bl of snap.blasts) {
          drawWaterBlast(ctx, bl, tilePx, now);
        }

        // Hệ số nội suy giữa 2 gói 20Hz (`50ms`)
        const alpha = prevSnap ? Math.max(0, Math.min(1.15, (now - snapRef.current.currAt) / 50)) : 1;

        // 6. Bóng nước đang đếm ngược / trượt / bay vọt qua tường (+ ghost bomb 0ms cục bộ khi chờ ACK server)
        for (const b of snap.bombs) {
          let bx = b.x;
          let by = b.y;
          if (!b.lob && prevSnap) {
            const pb = prevSnap.bombs.find((x) => x.id === b.id && !x.lob);
            if (pb && Math.hypot(b.x - pb.x, b.y - pb.y) < 2) {
              bx = pb.x + (b.x - pb.x) * alpha;
              by = pb.y + (b.y - pb.y) * alpha;
            }
          }
          const ownerHex = cfg.colorHexById[b.ownerId] ?? '#38BDF8';
          drawWaterBomb(ctx, b, bx, by, ownerHex, tilePx, now);
        }

        for (let gi = ghostBombsRef.current.length - 1; gi >= 0; gi--) {
          const gb = ghostBombsRef.current[gi];
          if (now - gb.placedAt > 450) {
            ghostBombsRef.current.splice(gi, 1);
            continue;
          }
          if (snap.bombs.some((b) => !b.lob && Math.floor(b.x) === gb.tx && Math.floor(b.y) === gb.ty)) {
            ghostBombsRef.current.splice(gi, 1);
            continue;
          }
          const myHex = cfg.colorHexById[cfg.me] ?? '#38BDF8';
          ctx.save();
          ctx.globalAlpha = 0.86;
          drawWaterBomb(
            ctx,
            {
              id: -gi - 1,
              ownerId: cfg.me,
              x: gb.tx + 0.5,
              y: gb.ty + 0.5,
              range: gb.range,
              ticksLeft: BOOM_BOMB_FUSE_TICKS,
              vx: 0,
              vy: 0,
            },
            gb.tx + 0.5,
            gb.ty + 0.5,
            myHex,
            tilePx,
            now,
          );
          ctx.restore();
        }

        // 7. Nhân vật (sắp xếp theo trục Y để chiều sâu tự nhiên, UFO vẽ trên cùng)
        const myTeam = srvMe?.team ?? 0;
        const sortedPlayers = [...snap.players].sort((a, b) => {
          if (a.state === 'ufo' && b.state !== 'ufo') return 1;
          if (a.state !== 'ufo' && b.state === 'ufo') return -1;
          return a.y - b.y;
        });

        for (const p of sortedPlayers) {
          let px = p.x;
          let py = p.y;
          let renderPlayer = p;

          if (p.id === cfg.me && snap.phase === 'playing' && p.state !== 'ufo') {
            px = predRef.current.x + visualOffsetRef.current.x;
            py = predRef.current.y + visualOffsetRef.current.y;
            renderPlayer = { ...p, dir: predRef.current.dir };
          } else if (prevSnap) {
            const pp = prevSnap.players.find((x) => x.id === p.id && x.state === p.state);
            if (pp && Math.hypot(p.x - pp.x, p.y - pp.y) < 2.2) {
              px = pp.x + (p.x - pp.x) * alpha;
              py = pp.y + (p.y - pp.y) * alpha;
            } else if (p.state === 'ufo') {
              const pos = getUfoWorldPos(p.ufoSide, p.ufoCoord, snap.width, snap.height);
              px = pos.x;
              py = pos.y;
            }
          }

          // Vòng sáng báo vị trí đứng của mình lúc đếm ngược đầu hiệp
          if (p.id === cfg.me && snap.phase === 'countdown') {
            const ringR = tilePx * (0.55 + 0.16 * Math.sin(now * 0.012));
            ctx.strokeStyle = '#FACC15';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(px * tilePx, py * tilePx, ringR, 0, Math.PI * 2);
            ctx.stroke();
          }

          const pHex = cfg.colorHexById[p.id] ?? '#F59F00';
          drawBomberPlayer(ctx, renderPlayer, px, py, pHex, cfg.mode, p.id === cfg.me, myTeam, tilePx, now);
        }

        // 8. Hạt hiệu ứng nước bắn / mảnh gỗ / vòng sóng nổ
        const parts = particlesRef.current;
        for (let i = parts.length - 1; i >= 0; i--) {
          const pt = parts[i];
          pt.life += dt;
          if (pt.life >= pt.maxLife) {
            parts.splice(i, 1);
            continue;
          }
          const prog = pt.life / pt.maxLife;
          if (pt.ring) {
            ctx.save();
            ctx.globalAlpha = (1 - prog) * 0.85;
            ctx.strokeStyle = pt.color;
            ctx.lineWidth = 2.6 * (1 - prog * 0.5);
            ctx.beginPath();
            ctx.arc(pt.x * tilePx, pt.y * tilePx, (pt.size + prog * 0.95) * tilePx, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          } else {
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            ctx.save();
            ctx.globalAlpha = (1 - prog) * pt.alpha;
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x * tilePx, pt.y * tilePx, Math.max(1.5, pt.size * tilePx * (1 - prog * 0.4)), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        // 9. Chữ nổi (+Bom, +Tầm, BỤP!!, CỨU SỐNG!)
        const pops = popupsRef.current;
        for (let i = pops.length - 1; i >= 0; i--) {
          const pop = pops[i];
          const age = (now - pop.bornAt) / 1000;
          if (age >= 0.95) {
            pops.splice(i, 1);
            continue;
          }
          const py = (pop.y - age * 0.65) * tilePx;
          ctx.save();
          ctx.globalAlpha = Math.min(1, (1 - age / 0.95) * 1.3);
          ctx.font = `900 ${Math.max(10, Math.round(tilePx * 0.34))}px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#0F172A';
          ctx.strokeText(pop.text, pop.x * tilePx, py);
          ctx.fillStyle = pop.color;
          ctx.fillText(pop.text, pop.x * tilePx, py);
          ctx.restore();
        }

        ctx.restore();
      }

      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);
    return () => window.cancelAnimationFrame(rafId);
  }, [game]);

  // Xử lý cảm ứng D-Pad 4 hướng trục chính chuẩn Bomberman (hỗ trợ xoay 90° CSS + trượt corner-slide mượt)
  const snapDpadOffset = useCallback(
    (ox: number, oy: number) => {
      if (Math.hypot(ox, oy) < 8) {
        setMoveVector(0, 0);
        return;
      }
      if (Math.abs(ox) >= Math.abs(oy)) {
        setMoveVector(ox > 0 ? 1 : -1, 0);
      } else {
        setMoveVector(0, oy > 0 ? 1 : -1);
      }
    },
    [setMoveVector],
  );

  const handleDpadPointer = useCallback(
    (clientX: number, clientY: number, el: HTMLElement) => {
      const pt = getLocalPoint(clientX, clientY, el, rotated);
      snapDpadOffset(pt.x - pt.w * 0.5, pt.y - pt.h * 0.5);
    },
    [rotated, snapDpadOffset],
  );

  const fireImmediate = (fn: () => void) => {
    lastBtnAtRef.current = performance.now();
    fn();
  };
  const fireFallbackPress = (fn: () => void) => {
    if (performance.now() - lastBtnAtRef.current < 320) return;
    fn();
  };

  return (
    <Shell game={game} room={room} scroll={false} fullscreen hideStrip bare wide>
      <View
        style={[
          styles.rootStage,
          Platform.OS === 'web'
            ? ({
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                touchAction: 'none',
              } as object)
            : null,
        ]}
        testID="boom-screen"
        // @ts-expect-error chặn menu chuột phải khi giữ ngón cái trên trình duyệt di động
        onContextMenu={(e: Event) => e.preventDefault()}
      >
        {/* THANH HUD ĐỈNH SIÊU MẢNH (KHÔNG CHIẾM CHIỀU CAO MÀN NGANG) */}
        <TopArcadeHud
          hud={hud}
          mode={view.mode}
          isHost={isHost}
          compactH={compactH}
          onEndMatch={() => void game.act({ type: 'end' })}
        />

        {/* BẢNG KILL FEED GỌN GÓC PHẢI TRÊN */}
        {hud.killFeed.length > 0 && (
          <View pointerEvents="none" style={[styles.killFeedBox, compactH && { top: 38 }]}>
            {hud.killFeed.map((kf) => (
              <View
                key={kf.id}
                style={[
                  styles.killFeedRow,
                  kf.kind === 'rescue'
                    ? styles.kfRescue
                    : kf.kind === 'crush'
                      ? styles.kfCrush
                      : styles.kfPop,
                ]}
              >
                <T numberOfLines={1} style={styles.killFeedTxt}>
                  {kf.text.replace(/!+$/g, '')}
                </T>
              </View>
            ))}
          </View>
        )}

        {/* KHUNG ĐẤU TRƯỜNG 60FPS CANVAS GIỮA MÀN HÌNH */}
        <View
          style={styles.arenaCenterWrap}
          onLayout={(e) => {
            const { width: lw, height: lh } = e.nativeEvent.layout;
            if (lw > 80 && lh > 80) {
              setArenaBox((prev) =>
                prev && Math.abs(prev.w - lw) <= 2 && Math.abs(prev.h - lh) <= 2 ? prev : { w: lw, h: lh },
              );
            }
          }}
        >
          <View
            style={[
              styles.canvasFrame,
              hud.ringActive && styles.canvasFrameDanger,
              sticker(2),
              { width: arenaMetrics.canvasW + 4, height: arenaMetrics.canvasH + 4 },
            ]}
            testID="boom-canvas-wrap"
          >
            {Platform.OS === 'web' ? (
              <canvas
                ref={canvasRef}
                style={{
                  display: 'block',
                  width: arenaMetrics.canvasW,
                  height: arenaMetrics.canvasH,
                  borderRadius: 10,
                }}
              />
            ) : (
              <View style={{ width: arenaMetrics.canvasW, height: arenaMetrics.canvasH }} />
            )}
          </View>
        </View>

        {/* BANNER ĐẾM NGƯỢC ĐẦU HIỆP & TỔNG KẾT GIỮA HIỆP */}
        {hud.phase === 'countdown' && (
          <View pointerEvents="none" style={styles.centerOverlay}>
            <View style={[styles.bannerCard, sticker(3)]}>
              <T style={styles.bannerSub}>
                Hiệp {hud.round}/{hud.totalRounds} · {view.mode === 'teams' ? 'Đội Đỏ vs Đội Xanh' : 'Đấu đơn sinh tồn'}
              </T>
              <View style={styles.bannerTitleRow}>
                <UiIcon name="Bomb" size={18} color={C.gold} strokeWidth={1.75} />
                <T style={styles.bannerTitle}>Sẵn sàng đặt bom</T>
              </View>
              <T style={styles.bannerHint}>
                Phá thùng nhặt đồ · Chạm bóng địch để hạ · Né vòng bo lúc 0:30
              </T>
            </View>
          </View>
        )}

        {hud.phase === 'round_end' && (
          <View pointerEvents="none" style={styles.centerOverlay}>
            <View style={[styles.bannerCard, styles.bannerCardWin, sticker(3)]}>
              <T style={styles.bannerSub}>Kết thúc hiệp {hud.round}/{hud.totalRounds}</T>
              <T style={styles.bannerTitle}>
                {(hud.roundWinnerText ?? `Hiệp ${hud.round} khép lại`).replace(/!+$/g, '')}
              </T>
              <View style={styles.miniScoreRow}>
                {Object.entries(view.names)
                  .sort((a, b) => (view.scores[b[0]] ?? 0) - (view.scores[a[0]] ?? 0))
                  .slice(0, 5)
                  .map(([pid, pname]) => (
                    <View key={pid} style={styles.miniScoreChip}>
                      <T style={styles.miniScoreName} numberOfLines={1}>
                        {pid === me ? 'Bạn' : pname}
                      </T>
                      <T style={styles.miniScorePts}>
                        {view.scores[pid] ?? 0}đ · {view.kills[pid] ?? 0} hạ
                      </T>
                    </View>
                  ))}
              </View>
            </View>
          </View>
        )}

        {/* CỤM ĐIỀU KHIỂN CẢM ỨNG HAI BÊN NGÓN CÁI (KHÔNG CHE MÊ CUNG) */}
        {hud.myState !== null ? (
          <>
            {/* BÊN TRÁI: ARCADE D-PAD 4 HƯỚNG LIỀN MẠCH KHÔNG XUNG ĐỘT CON-CHA */}
            <View
              testID="boom-dpad"
              style={[
                styles.dpadOuter,
                compactH ? styles.dpadOuterCompact : styles.dpadOuterNormal,
              ]}
              onLayout={({ nativeEvent: { layout } }) => {
                dpadLayoutRef.current = { w: layout.width, h: layout.height };
              }}
              onStartShouldSetResponder={() => Platform.OS !== 'web'}
              onMoveShouldSetResponder={() => Platform.OS !== 'web'}
              onResponderGrant={(e) => {
                const { locationX, locationY } = e.nativeEvent;
                const { w, h } = dpadLayoutRef.current;
                snapDpadOffset(locationX - w * 0.5, locationY - h * 0.5);
              }}
              onResponderMove={(e) => {
                const { locationX, locationY } = e.nativeEvent;
                const { w, h } = dpadLayoutRef.current;
                snapDpadOffset(locationX - w * 0.5, locationY - h * 0.5);
              }}
              onResponderRelease={() => setMoveVector(0, 0)}
              onResponderTerminate={() => setMoveVector(0, 0)}
              onPointerDown={(e: unknown) => {
                const pe = e as PointerEvent;
                pe.preventDefault?.();
                const el = pe.currentTarget as HTMLElement;
                el.setPointerCapture?.(pe.pointerId);
                handleDpadPointer(pe.clientX, pe.clientY, el);
              }}
              onPointerMove={(e: unknown) => {
                const pe = e as PointerEvent;
                if (pe.buttons === 0 && pe.pressure === 0) return;
                const el = pe.currentTarget as HTMLElement;
                handleDpadPointer(pe.clientX, pe.clientY, el);
              }}
              onPointerUp={() => setMoveVector(0, 0)}
              onPointerCancel={() => setMoveVector(0, 0)}
              onLostPointerCapture={() => setMoveVector(0, 0)}
            >
              {/* 4 cánh chữ thập nổi bọt về vùng cha boom-dpad (tránh Pressable onPressOut xung đột) */}
              <View
                testID="boom-dpad-up"
                style={[styles.dpadArm, styles.dpadUp, dpadUi.dy < 0 && styles.dpadArmActive]}
              >
                <UiIcon name="ChevronUp" size={20} color={dpadUi.dy < 0 ? '#FFFFFF' : C.darkText} strokeWidth={2.5} />
              </View>
              <View
                testID="boom-dpad-down"
                style={[styles.dpadArm, styles.dpadDown, dpadUi.dy > 0 && styles.dpadArmActive]}
              >
                <UiIcon name="ChevronDown" size={20} color={dpadUi.dy > 0 ? '#FFFFFF' : C.darkText} strokeWidth={2.5} />
              </View>
              <View
                testID="boom-dpad-left"
                style={[styles.dpadArm, styles.dpadLeft, dpadUi.dx < 0 && styles.dpadArmActive]}
              >
                <UiIcon name="ChevronLeft" size={20} color={dpadUi.dx < 0 ? '#FFFFFF' : C.darkText} strokeWidth={2.5} />
              </View>
              <View
                testID="boom-dpad-right"
                style={[styles.dpadArm, styles.dpadRight, dpadUi.dx > 0 && styles.dpadArmActive]}
              >
                <UiIcon name="ChevronRight" size={20} color={dpadUi.dx > 0 ? '#FFFFFF' : C.darkText} strokeWidth={2.5} />
              </View>

              {/* Núm trượt trung tâm phản hồi theo hướng ngón cái */}
              <View
                pointerEvents="none"
                style={[
                  styles.dpadPuck,
                  {
                    transform: [
                      { translateX: dpadUi.dx * 16 },
                      { translateY: dpadUi.dy * 16 },
                    ],
                  },
                ]}
              />
            </View>

            {/* BÊN PHẢI: NÚT KỸ NĂNG PHỤ + NÚT ĐẶT / QUĂNG BOM */}
            <View style={[styles.rightActionZone, compactH && { bottom: 6, right: 6, gap: 6 }]}>
              {/* Nút Kỹ Năng Phụ: Tự chích Kim khi bị nhốt hoặc Quăng Bom qua tường */}
              <Pressable
                testID="boom-special-btn"
                // @ts-expect-error phản hồi 0ms ngay khi ngón cái chạm xuống
                onPointerDown={(e: PointerEvent) => {
                  e.preventDefault();
                  fireImmediate(triggerSpecialPress);
                }}
                onPress={() => fireFallbackPress(triggerSpecialPress)}
                style={({ pressed }) => [
                  styles.specialBtn,
                  compactH && styles.specialBtnCompact,
                  hud.myState === 'trapped' && hud.needles > 0
                    ? styles.specialBtnNeedleReady
                    : hud.canGlove
                      ? styles.specialBtnGloveReady
                      : styles.specialBtnIdle,
                  pressed && styles.btnPressed,
                ]}
              >
                <UiIcon
                  name={hud.myState === 'trapped' || hud.needles > 0 ? 'ShieldAlert' : hud.canGlove ? 'Swords' : 'Zap'}
                  size={compactH ? 14 : 16}
                  color="#FFFFFF"
                  strokeWidth={1.75}
                />
                <T selectable={false} numberOfLines={1} style={styles.specialBtnTxt}>
                  {hud.myState === 'trapped' && hud.needles > 0
                    ? `Chích bóng (${hud.needles})`
                    : hud.needles > 0
                      ? `Kim cứu ×${hud.needles}`
                      : hud.canGlove
                        ? 'Ném qua tường'
                        : 'Kỹ năng'}
                </T>
              </Pressable>

              {/* Nút Chính: Đặt bom / Quăng bom / Đĩa bay ném bom phục thù */}
              <Pressable
                testID="boom-place-btn"
                // @ts-expect-error phản hồi 0ms ngay khi ngón cái chạm xuống
                onPointerDown={(e: PointerEvent) => {
                  e.preventDefault();
                  fireImmediate(triggerBombPress);
                }}
                onPress={() => fireFallbackPress(triggerBombPress)}
                style={({ pressed }) => [
                  styles.primaryBombBtn,
                  compactH && styles.primaryBombBtnCompact,
                  hud.myState === 'ufo'
                    ? hud.ufoCooldownSec > 0
                      ? styles.bombBtnUfoWait
                      : styles.bombBtnUfoReady
                    : hud.myState === 'trapped' && hud.needles > 0
                      ? styles.specialBtnNeedleReady
                      : hud.standingOnBomb && hud.canGlove
                        ? styles.bombBtnGloveThrow
                        : styles.bombBtnNormal,
                  pressed && styles.btnPressed,
                ]}
              >
                <UiIcon
                  name={
                    hud.myState === 'ufo'
                      ? 'Crosshair'
                      : hud.myState === 'trapped'
                        ? hud.needles > 0
                          ? 'ShieldAlert'
                          : 'Circle'
                        : hud.standingOnBomb && hud.canGlove
                          ? 'Swords'
                          : 'Bomb'
                  }
                  size={compactH ? 22 : 24}
                  color="#FFFFFF"
                  strokeWidth={1.75}
                />
                <T selectable={false} numberOfLines={1} style={styles.primaryBombTxt}>
                  {hud.myState === 'ufo'
                    ? hud.ufoCooldownSec > 0
                      ? `Hồi ${hud.ufoCooldownSec}s`
                      : 'Ném phục thù'
                    : hud.myState === 'trapped'
                      ? hud.needles > 0
                        ? 'Chích bóng'
                        : 'Đang bị nhốt'
                      : hud.standingOnBomb && hud.canGlove
                        ? 'Quăng bom'
                        : 'Đặt bom'}
                </T>
                {hud.myState === 'alive' && (
                  <T selectable={false} style={styles.primaryBombSub}>
                    {hud.maxBombs - hud.activeBombs}/{hud.maxBombs} quả
                  </T>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.spectatorPill}>
            <UiIcon name="Eye" size={14} color={C.gold} strokeWidth={1.65} />
            <T style={styles.spectatorTxt}>Đang xem trận Đặt bom</T>
          </View>
        )}

        {/* DÒNG NHẮC PHÍM TẮT NHẸ NHÀNG TRÊN MÀN HÌNH RỘNG DESKTOP */}
        {desktopWide && (
          <View pointerEvents="none" style={styles.kbHintWrap}>
            <T style={styles.kbHintTxt}>
              WASD / Mũi tên: Di chuyển · Space / J: Đặt &amp; Quăng bom · E / Shift: Kỹ năng / Kim cứu
            </T>
          </View>
        )}
      </View>
    </Shell>
  );
}

// ============================================================================
// THANH HUD ĐỈNH TỐI GIẢN KẾT HỢP CÔNG CỤ PHÒNG (CHAT / LOA / RỜI PHÒNG)
// ============================================================================

function TopArcadeHud({
  hud,
  mode,
  isHost,
  compactH,
  onEndMatch,
}: {
  hud: HudState;
  mode: 'ffa' | 'teams';
  isHost: boolean;
  compactH: boolean;
  onEndMatch: () => void;
}) {
  const tools = useShellTools();
  const mins = Math.floor(hud.secLeft / 60);
  const secs = String(hud.secLeft % 60).padStart(2, '0');

  return (
    <View style={[styles.topHud, compactH && styles.topHudCompact]}>
      {/* Hiệp & Đồng hồ Vòng Bo */}
      <View style={styles.hudLeft}>
        <View style={styles.roundPill}>
          <T style={styles.roundPillTxt}>
            Hiệp {hud.round}/{hud.totalRounds}
          </T>
        </View>

        <View style={[styles.clockPill, hud.ringActive && styles.clockPillDanger]}>
          <UiIcon
            name={hud.ringActive ? 'Flame' : 'Timer'}
            size={12}
            color={hud.ringActive ? '#FCA5A5' : '#86EFAC'}
            strokeWidth={1.75}
          />
          <T style={[styles.clockTxt, hud.ringActive && styles.clockTxtDanger]}>
            {hud.ringActive ? `Vòng bo ${mins}:${secs}` : `${mins}:${secs}`}
          </T>
        </View>

        <View style={styles.alivePill}>
          {mode === 'teams' ? (
            <View style={styles.teamScoreRow}>
              <View style={[styles.teamDot, { backgroundColor: '#EF4444' }]} />
              <T style={styles.aliveTxt}>{hud.redAlive}</T>
              <T style={[styles.aliveTxt, { color: C.darkMuted }]}>:</T>
              <View style={[styles.teamDot, { backgroundColor: '#38BDF8' }]} />
              <T style={styles.aliveTxt}>{hud.blueAlive}</T>
            </View>
          ) : (
            <View style={styles.teamScoreRow}>
              <UiIcon name="Users" size={11} color={C.darkMuted} strokeWidth={1.65} />
              <T style={styles.aliveTxt}>
                {hud.aliveCount}/{hud.totalPlayers}
              </T>
            </View>
          )}
        </View>
      </View>

      {/* Chỉ số vật phẩm của bản thân */}
      {hud.myState !== null && (
        <View style={styles.statsRow}>
          {hud.myState === 'ufo' ? (
            <View style={styles.ufoStateBadge}>
              <UiIcon name="Crosshair" size={11} color={C.gold} strokeWidth={1.75} />
              <T style={styles.ufoStateTxt}>Đĩa bay phục thù</T>
            </View>
          ) : (
            <>
              <View style={styles.statChip}>
                <UiIcon name="Bomb" size={11} color={C.darkText} strokeWidth={1.65} />
                <T style={styles.statChipTxt}>×{hud.maxBombs}</T>
              </View>
              <View style={styles.statChip}>
                <UiIcon name="Flame" size={11} color="#7DD3FC" strokeWidth={1.65} />
                <T style={styles.statChipTxt}>×{hud.range}</T>
              </View>
              <View style={styles.statChip}>
                <UiIcon name="Zap" size={11} color={C.gold} strokeWidth={1.65} />
                <T style={styles.statChipTxt}>×{hud.speedLvl}</T>
              </View>
              {hud.canKick && (
                <View style={[styles.statChip, { borderColor: 'rgba(52, 211, 153, 0.45)', backgroundColor: 'rgba(21, 128, 61, 0.25)' }]}>
                  <T style={[styles.statChipTxt, { color: '#6EE7B7' }]}>Đá</T>
                </View>
              )}
              {hud.canGlove && (
                <View style={[styles.statChip, { borderColor: 'rgba(248, 113, 113, 0.45)', backgroundColor: 'rgba(185, 28, 28, 0.25)' }]}>
                  <UiIcon name="Swords" size={11} color="#FCA5A5" strokeWidth={1.65} />
                </View>
              )}
              {hud.needles > 0 && (
                <View style={[styles.statChip, { borderColor: 'rgba(244, 114, 182, 0.45)', backgroundColor: 'rgba(190, 24, 93, 0.25)' }]}>
                  <UiIcon name="ShieldAlert" size={11} color="#F9A8D4" strokeWidth={1.65} />
                  <T style={[styles.statChipTxt, { color: '#F9A8D4' }]}>×{hud.needles}</T>
                </View>
              )}
              {hud.shieldSec > 0 && (
                <View style={[styles.statChip, { borderColor: 'rgba(250, 204, 21, 0.45)', backgroundColor: 'rgba(180, 83, 9, 0.28)' }]}>
                  <UiIcon name="Shield" size={11} color={C.goldSoft} strokeWidth={1.65} />
                  <T style={[styles.statChipTxt, { color: C.goldSoft }]}>{hud.shieldSec}s</T>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Nút tiện ích nhanh (Chat, Âm thanh, Chủ phòng kết thúc, Rời phòng) */}
      <View style={styles.hudTools}>
        {isHost && (
          <Pressable testID="boom-host-end" onPress={onEndMatch} style={styles.toolIconBtn}>
            <UiIcon name="Trophy" size={14} color={C.gold} strokeWidth={1.65} />
          </Pressable>
        )}
        {tools && (
          <>
            <Pressable testID="boom-chat-btn" onPress={tools.openChat} style={styles.toolIconBtn}>
              <UiIcon name="MessageCircle" size={14} color={C.darkText} strokeWidth={1.65} />
              {tools.unread > 0 && (
                <View style={styles.unreadDot}>
                  <T style={styles.unreadDotTxt}>{tools.unread > 9 ? '9+' : tools.unread}</T>
                </View>
              )}
            </Pressable>
            <Pressable testID="boom-mute-btn" onPress={tools.toggleMute} style={styles.toolIconBtn}>
              <UiIcon
                name={tools.muted ? 'VolumeX' : 'Volume2'}
                size={14}
                color={tools.muted ? '#FCA5A5' : C.darkText}
                strokeWidth={1.65}
              />
            </Pressable>
            <Pressable testID="boom-leave-btn" onPress={tools.leave} style={styles.toolIconBtn}>
              <UiIcon name="LogOut" size={14} color="#FCA5A5" strokeWidth={1.65} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootStage: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: C.darkBg,
    position: 'relative',
    overflow: 'hidden',
  },

  topHud: {
    height: 38,
    marginHorizontal: 6,
    marginTop: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(26, 30, 40, 0.92)',
    borderWidth: 1,
    borderColor: C.darkBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    zIndex: 20,
  },
  topHudCompact: {
    height: 32,
    marginTop: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  hudLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  roundPill: {
    backgroundColor: C.darkSubtle,
    borderWidth: 1,
    borderColor: C.darkBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roundPillTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: C.darkText,
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  clockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(21, 128, 61, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.40)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  clockPillDanger: {
    backgroundColor: 'rgba(185, 28, 28, 0.34)',
    borderColor: 'rgba(248, 113, 113, 0.65)',
  },
  clockTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A7F3D0',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  clockTxtDanger: {
    color: '#FEE2E2',
  },
  alivePill: {
    backgroundColor: C.darkSubtle,
    borderWidth: 1,
    borderColor: C.darkBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  teamScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teamDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  aliveTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: C.darkText,
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.darkSubtle,
    borderWidth: 1,
    borderColor: C.darkBorder,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statChipTxt: {
    fontSize: 10.5,
    fontWeight: '600',
    color: C.darkText,
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  ufoStateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(180, 83, 9, 0.30)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.50)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ufoStateTxt: {
    fontSize: 10.5,
    fontWeight: '600',
    color: C.goldSoft,
    fontFamily: FONT,
  },

  hudTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toolIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: C.darkSubtle,
    borderWidth: 1,
    borderColor: C.darkBorder,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  unreadDotTxt: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },

  killFeedBox: {
    position: 'absolute',
    top: 46,
    right: 8,
    maxWidth: 235,
    gap: 4,
    zIndex: 25,
  },
  killFeedRow: {
    backgroundColor: 'rgba(26, 30, 40, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.darkBorder,
    borderLeftWidth: 3,
  },
  kfPop: { borderLeftColor: '#FB7185' },
  kfRescue: { borderLeftColor: '#38BDF8' },
  kfCrush: { borderLeftColor: C.gold },
  killFeedTxt: {
    fontSize: 10.5,
    fontWeight: '500',
    color: C.darkText,
    fontFamily: FONT,
  },

  arenaCenterWrap: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasFrame: {
    backgroundColor: C.darkSurface,
    borderColor: C.darkBorder,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  canvasFrameDanger: {
    borderColor: C.danger,
  },

  centerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 38,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  bannerCard: {
    backgroundColor: 'rgba(26, 30, 40, 0.94)',
    borderColor: C.darkBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    maxWidth: 420,
  },
  bannerCardWin: {
    borderColor: 'rgba(56, 189, 248, 0.45)',
  },
  bannerSub: {
    fontSize: 11.5,
    fontWeight: '600',
    color: C.gold,
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerTitle: {
    fontSize: 17.5,
    fontWeight: '600',
    color: C.darkText,
    textAlign: 'center',
    fontFamily: FONT,
  },
  bannerHint: {
    fontSize: 11.5,
    fontWeight: '500',
    color: C.darkMuted,
    textAlign: 'center',
  },
  miniScoreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  miniScoreChip: {
    backgroundColor: C.darkSubtle,
    borderWidth: 1,
    borderColor: C.darkBorder,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  miniScoreName: {
    fontSize: 11,
    fontWeight: '600',
    color: C.darkText,
    maxWidth: 76,
  },
  miniScorePts: {
    fontSize: 10.5,
    fontWeight: '600',
    color: C.gold,
    fontVariant: ['tabular-nums'],
  },

  // CỤM D-PAD TRÁI
  dpadOuter: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 20, 28, 0.86)',
    borderWidth: 1,
    borderColor: C.darkBorder,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 28,
  },
  dpadOuterNormal: {
    width: 112,
    height: 112,
  },
  dpadOuterCompact: {
    width: 98,
    height: 98,
    left: 6,
    bottom: 6,
  },
  dpadArm: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.darkSubtle,
    borderWidth: 1,
    borderColor: C.darkBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadArmActive: {
    backgroundColor: C.jade,
    borderColor: '#4ADE80',
  },
  dpadUp: { top: 4 },
  dpadDown: { bottom: 4 },
  dpadLeft: { left: 4 },
  dpadRight: { right: 4 },
  dpadPuck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 249, 245, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(251, 249, 245, 0.45)',
  },

  // CỤM NÚT ĐẶT BOM & KỸ NĂNG PHẢI
  rightActionZone: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    alignItems: 'flex-end',
    gap: 8,
    zIndex: 28,
  },
  specialBtn: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  specialBtnCompact: {
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  specialBtnIdle: {
    backgroundColor: 'rgba(35, 40, 54, 0.90)',
    borderColor: C.darkBorder,
  },
  specialBtnGloveReady: {
    backgroundColor: C.danger,
    borderColor: '#FCA5A5',
  },
  specialBtnNeedleReady: {
    backgroundColor: C.lotus,
    borderColor: '#FBCFE8',
  },
  specialBtnTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },

  primaryBombBtn: {
    width: 104,
    height: 80,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  primaryBombBtnCompact: {
    width: 94,
    height: 70,
    borderRadius: 16,
  },
  bombBtnNormal: {
    backgroundColor: '#0284C7',
    borderColor: 'rgba(186, 230, 253, 0.65)',
  },
  bombBtnGloveThrow: {
    backgroundColor: C.goldDeep,
    borderColor: 'rgba(254, 243, 199, 0.65)',
  },
  bombBtnUfoReady: {
    backgroundColor: C.son,
    borderColor: 'rgba(254, 202, 202, 0.65)',
  },
  bombBtnUfoWait: {
    backgroundColor: 'rgba(35, 40, 54, 0.90)',
    borderColor: C.darkBorder,
  },
  primaryBombTxt: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  primaryBombSub: {
    fontSize: 10,
    fontWeight: '500',
    color: '#E0F2FE',
    fontVariant: ['tabular-nums'],
  },
  btnPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },

  spectatorPill: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.darkSurface,
    borderWidth: 1,
    borderColor: C.darkBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    zIndex: 25,
  },
  spectatorTxt: {
    fontSize: 12,
    fontWeight: '500',
    color: C.darkText,
  },

  kbHintWrap: {
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kbHintTxt: {
    fontSize: 10.5,
    fontWeight: '500',
    color: C.darkMuted,
  },
});
