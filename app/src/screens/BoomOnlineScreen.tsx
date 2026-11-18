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
import { EmojiIcon, UiIcon } from '../components/Icons';
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bakedFloorRef = useRef<{ key: string; canvas: HTMLCanvasElement | null }>({
    key: '',
    canvas: null,
  });

  const winnerTextRef = useRef<string | null>(view.roundWinnerText);
  useEffect(() => {
    winnerTextRef.current = view.roundWinnerText;
  }, [view.roundWinnerText]);

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

  // Luồng 20Hz từ Server
  useEffect(() => {
    return game.onBoomTick((payload) => {
      const now = performance.now();
      const oldGrid = snapRef.current.prevGrid;

      // Phát hiện thùng gỗ vừa vỡ để tung mảnh gỗ bay đẹp mắt
      if (oldGrid && oldGrid.length === payload.grid.length && payload.round === snapRef.current.curr.round) {
        for (let i = 0; i < payload.grid.length; i++) {
          if (oldGrid[i] === 2 && payload.grid[i] === 0) {
            const tx = i % payload.width;
            const ty = Math.floor(i / payload.width);
            spawnBurstParticles(tx + 0.5, ty + 0.5, ['#F59E0B', '#D97706', '#FEF3C7'], 6, 0.85);
          }
        }
      }

      snapRef.current = {
        prev: snapRef.current.curr.round === payload.round ? snapRef.current.curr : null,
        curr: payload,
        prevGrid: payload.grid,
        currAt: now,
      };

      // Hòa giải vị trí dự đoán của bản thân với Server
      const srvMe = payload.players.find((p) => p.id === me);
      if (srvMe) {
        const pr = predRef.current;
        const dist = Math.hypot(srvMe.x - pr.x, srvMe.y - pr.y);
        if (!pr.initialized || pr.round !== payload.round || srvMe.state === 'ufo' || dist > 1.35) {
          pr.round = payload.round;
          pr.initialized = true;
          pr.x = srvMe.x;
          pr.y = srvMe.y;
          pr.dir = srvMe.dir;
        } else {
          pr.x += (srvMe.x - pr.x) * 0.36;
          pr.y += (srvMe.y - pr.y) * 0.36;
        }
      }

      // Xử lý âm thanh & hiệu ứng hạt từ sự kiện mới
      for (const ev of payload.events) {
        if (ev.id <= lastEventIdRef.current) continue;
        lastEventIdRef.current = ev.id;
        const related = ev.actorId === me || ev.targetId === me;
        triggerBoomSfx(ev.kind, related);

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

      if (payload.phase === 'playing') {
        winnerTextRef.current = null;
      }
      syncHudSmart(payload, winnerTextRef.current);
    });
  }, [game, me, spawnBurstParticles, syncHudSmart]);

  // Gửi input thời gian thực (0ms one-way socket emit)
  const emitInput = useCallback(
    (dx: number, dy: number, extra?: { placeBomb?: boolean; special?: boolean }) => {
      const payload: BoomInput = {
        seq: seqRef.current++,
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
    emitInput(moveVecRef.current.dx, moveVecRef.current.dy, { placeBomb: true });
  }, [emitInput]);

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

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
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

        // Bước dự đoán mượt 60fps cho nhân vật của chính mình khi đang chơi
        const srvMe = snap.players.find((p) => p.id === cfg.me);
        if (
          srvMe &&
          snap.phase === 'playing' &&
          (srvMe.state === 'alive' || srvMe.state === 'trapped')
        ) {
          const mv = moveVecRef.current;
          const pr = predRef.current;
          pr.dir = dirFromDelta(mv.dx, mv.dy, pr.dir);
          const spd = getBoomPlayerSpeed(srvMe.speedLvl, srvMe.state);
          const isSolidLocal = (tx: number, ty: number) => {
            if (tx < 0 || tx >= snap.width || ty < 0 || ty >= snap.height) return true;
            if (snap.grid[ty * snap.width + tx] !== 0) return true;
            for (const b of snap.bombs) {
              if (b.lob) continue;
              const btx = Math.floor(b.x);
              const bty = Math.floor(b.y);
              if (btx === tx && bty === ty) {
                // Nếu hiện tại đang đứng chồng lên quả bom vừa đặt thì vẫn cho bước thoát ra
                const overlapsNow =
                  Math.abs(pr.x - (btx + 0.5)) < 0.84 && Math.abs(pr.y - (bty + 0.5)) < 0.84;
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
            const tile = snap.grid[ty * snap.width + tx];
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

        // 6. Bóng nước đang đếm ngược / trượt / bay vọt qua tường
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
            px = predRef.current.x;
            py = predRef.current.y;
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
  }, []);

  // Xử lý cảm ứng D-Pad chuẩn xác trên cả Landscape thực lẫn Portrait xoay ngang CSS
  const handleDpadPointer = useCallback(
    (clientX: number, clientY: number, el: HTMLElement) => {
      const pt = getLocalPoint(clientX, clientY, el, rotated);
      const ox = pt.x - pt.w * 0.5;
      const oy = pt.y - pt.h * 0.5;
      const dist = Math.hypot(ox, oy);
      if (dist < pt.w * 0.11) {
        setMoveVector(0, 0);
        return;
      }
      const angle = Math.atan2(oy, ox);
      const absCos = Math.abs(Math.cos(angle));
      const absSin = Math.abs(Math.sin(angle));
      // Ưu tiên 4 hướng trục thẳng chuẩn Bomberman (góc ±28°), vẫn cho phép đi chéo lượn góc mượt mà!
      let dx = 0;
      let dy = 0;
      if (absCos > 0.88) {
        dx = ox > 0 ? 1 : -1;
      } else if (absSin > 0.88) {
        dy = oy > 0 ? 1 : -1;
      } else {
        dx = ox > 0 ? 1 : -1;
        dy = oy > 0 ? 1 : -1;
      }
      setMoveVector(dx, dy);
    },
    [rotated, setMoveVector],
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
                  {kf.text}
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
              sticker(3),
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
            <View style={[styles.bannerCard, sticker(4)]}>
              <T style={styles.bannerSub}>
                HIỆP {hud.round}/{hud.totalRounds} · {view.mode === 'teams' ? '🔴 ĐỎ vs 🔵 XANH' : 'ĐẤU ĐƠN SINH TỒN'}
              </T>
              <T style={styles.bannerTitle}>💣 SẴN SÀNG ĐẶT BOM!</T>
              <T style={styles.bannerHint}>
                Phá thùng nhặt đồ · Chạm bóng nước địch để BỤP · Né Vòng Bo lúc 0:30!
              </T>
            </View>
          </View>
        )}

        {hud.phase === 'round_end' && (
          <View pointerEvents="none" style={styles.centerOverlay}>
            <View style={[styles.bannerCard, styles.bannerCardWin, sticker(4)]}>
              <T style={styles.bannerSub}>KẾT THÚC HIỆP {hud.round}/{hud.totalRounds}</T>
              <T style={styles.bannerTitle}>
                {hud.roundWinnerText ?? `Hiệp ${hud.round} khép lại!`}
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
                        {view.scores[pid] ?? 0}đ · 💥{view.kills[pid] ?? 0}
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
            {/* BÊN TRÁI: ARCADE D-PAD 8 HƯỚNG HỖ TRỢ XOAY 90° CHÍNH XÁC */}
            <View
              testID="boom-dpad"
              style={[
                styles.dpadOuter,
                compactH ? styles.dpadOuterCompact : styles.dpadOuterNormal,
              ]}
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
              {/* 4 cánh chữ thập trực quan */}
              <Pressable
                testID="boom-dpad-up"
                onPressIn={() => setMoveVector(0, -1)}
                onPressOut={() => setMoveVector(0, 0)}
                style={[styles.dpadArm, styles.dpadUp, dpadUi.dy < 0 && styles.dpadArmActive]}
              >
                <UiIcon name="ChevronUp" size={20} color={dpadUi.dy < 0 ? '#042F2E' : '#E2E8F0'} strokeWidth={3} />
              </Pressable>
              <Pressable
                testID="boom-dpad-down"
                onPressIn={() => setMoveVector(0, 1)}
                onPressOut={() => setMoveVector(0, 0)}
                style={[styles.dpadArm, styles.dpadDown, dpadUi.dy > 0 && styles.dpadArmActive]}
              >
                <UiIcon name="ChevronDown" size={20} color={dpadUi.dy > 0 ? '#042F2E' : '#E2E8F0'} strokeWidth={3} />
              </Pressable>
              <Pressable
                testID="boom-dpad-left"
                onPressIn={() => setMoveVector(-1, 0)}
                onPressOut={() => setMoveVector(0, 0)}
                style={[styles.dpadArm, styles.dpadLeft, dpadUi.dx < 0 && styles.dpadArmActive]}
              >
                <UiIcon name="ChevronLeft" size={20} color={dpadUi.dx < 0 ? '#042F2E' : '#E2E8F0'} strokeWidth={3} />
              </Pressable>
              <Pressable
                testID="boom-dpad-right"
                onPressIn={() => setMoveVector(1, 0)}
                onPressOut={() => setMoveVector(0, 0)}
                style={[styles.dpadArm, styles.dpadRight, dpadUi.dx > 0 && styles.dpadArmActive]}
              >
                <UiIcon name="ChevronRight" size={20} color={dpadUi.dx > 0 ? '#042F2E' : '#E2E8F0'} strokeWidth={3} />
              </Pressable>

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

            {/* BÊN PHẢI: NÚT KỸ NĂNG PHỤ + NÚT ĐẶT / QUĂNG BOM KHỔNG LỒ */}
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
                <EmojiIcon
                  emoji={hud.myState === 'trapped' || hud.needles > 0 ? '📌' : hud.canGlove ? '🥊' : '⚡'}
                  size={compactH ? 15 : 17}
                />
                <T selectable={false} numberOfLines={1} style={styles.specialBtnTxt}>
                  {hud.myState === 'trapped' && hud.needles > 0
                    ? `CHÍCH BÓNG! (${hud.needles})`
                    : hud.needles > 0
                      ? `KIM CỨU ×${hud.needles}`
                      : hud.canGlove
                        ? 'NÉM QUA TƯỜNG'
                        : 'KỸ NĂNG'}
                </T>
              </Pressable>

              {/* Nút Chính Khổng Lồ: ĐẶT BOM / QUĂNG BOM / ĐĨA BAY NÉM BOM PHỤC THÙ */}
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
                <EmojiIcon
                  emoji={
                    hud.myState === 'ufo'
                      ? '🛸'
                      : hud.myState === 'trapped'
                        ? hud.needles > 0
                          ? '📌'
                          : '🫧'
                        : hud.standingOnBomb && hud.canGlove
                          ? '🥊'
                          : '💣'
                  }
                  size={compactH ? 24 : 28}
                />
                <T selectable={false} numberOfLines={1} style={styles.primaryBombTxt}>
                  {hud.myState === 'ufo'
                    ? hud.ufoCooldownSec > 0
                      ? `HỒI ${hud.ufoCooldownSec}s`
                      : 'NÉM PHỤC THÙ'
                    : hud.myState === 'trapped'
                      ? hud.needles > 0
                        ? 'CHÍCH BÓNG!'
                        : 'ĐANG BỊ NHỐT'
                      : hud.standingOnBomb && hud.canGlove
                        ? 'QUĂNG BOM!'
                        : 'ĐẶT BOM'}
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
            <T style={styles.spectatorTxt}>👀 Bạn đang xem trận Đặt Bom Tử Chiến</T>
          </View>
        )}

        {/* DÒNG NHẮC PHÍM TẮT NHẸ NHÀNG TRÊN MÀN HÌNH RỘNG DESKTOP */}
        {desktopWide && (
          <View pointerEvents="none" style={styles.kbHintWrap}>
            <T style={styles.kbHintTxt}>
              ⌨️ WASD / Mũi tên: Di chuyển · Space / J: Đặt & Quăng Bom · E / Shift: Kỹ năng / Kim Tự Cứu
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
          <T style={[styles.clockTxt, hud.ringActive && styles.clockTxtDanger]}>
            {hud.ringActive ? `🔥 VÒNG BO SẬP! ${mins}:${secs}` : `⏱ ${mins}:${secs}`}
          </T>
        </View>

        <View style={styles.alivePill}>
          {mode === 'teams' ? (
            <T style={styles.aliveTxt}>
              🔴{hud.redAlive} : 🔵{hud.blueAlive}
            </T>
          ) : (
            <T style={styles.aliveTxt}>
              💣 {hud.aliveCount}/{hud.totalPlayers}
            </T>
          )}
        </View>
      </View>

      {/* Chỉ số vật phẩm của bản thân */}
      {hud.myState !== null && (
        <View style={styles.statsRow}>
          {hud.myState === 'ufo' ? (
            <View style={styles.ufoStateBadge}>
              <T style={styles.ufoStateTxt}>🛸 ĐĨA BAY PHỤC THÙ</T>
            </View>
          ) : (
            <>
              <View style={styles.statChip}>
                <T style={styles.statChipTxt}>💣×{hud.maxBombs}</T>
              </View>
              <View style={styles.statChip}>
                <T style={styles.statChipTxt}>💧×{hud.range}</T>
              </View>
              <View style={styles.statChip}>
                <T style={styles.statChipTxt}>👟×{hud.speedLvl}</T>
              </View>
              {hud.canKick && (
                <View style={[styles.statChip, { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.22)' }]}>
                  <T style={[styles.statChipTxt, { color: '#6EE7B7' }]}>🥾</T>
                </View>
              )}
              {hud.canGlove && (
                <View style={[styles.statChip, { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.22)' }]}>
                  <T style={[styles.statChipTxt, { color: '#FCA5A5' }]}>🥊</T>
                </View>
              )}
              {hud.needles > 0 && (
                <View style={[styles.statChip, { borderColor: '#EC4899', backgroundColor: 'rgba(236,72,153,0.25)' }]}>
                  <T style={[styles.statChipTxt, { color: '#F9A8D4' }]}>📌×{hud.needles}</T>
                </View>
              )}
              {hud.shieldSec > 0 && (
                <View style={[styles.statChip, { borderColor: '#FACC15', backgroundColor: 'rgba(250,204,21,0.25)' }]}>
                  <T style={[styles.statChipTxt, { color: '#FEF08A' }]}>🛡️{hud.shieldSec}s</T>
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
            <UiIcon name="Trophy" size={15} color="#FACC15" />
          </Pressable>
        )}
        {tools && (
          <>
            <Pressable testID="boom-chat-btn" onPress={tools.openChat} style={styles.toolIconBtn}>
              <UiIcon name="MessageCircle" size={15} color="#E2E8F0" />
              {tools.unread > 0 && (
                <View style={styles.unreadDot}>
                  <T style={styles.unreadDotTxt}>{tools.unread > 9 ? '9+' : tools.unread}</T>
                </View>
              )}
            </Pressable>
            <Pressable testID="boom-mute-btn" onPress={tools.toggleMute} style={styles.toolIconBtn}>
              <UiIcon
                name={tools.muted ? 'VolumeX' : 'Volume2'}
                size={15}
                color={tools.muted ? '#FB7185' : '#E2E8F0'}
              />
            </Pressable>
            <Pressable testID="boom-leave-btn" onPress={tools.leave} style={styles.toolIconBtn}>
              <UiIcon name="LogOut" size={15} color="#FB7185" />
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
    backgroundColor: '#07131F',
    position: 'relative',
    overflow: 'hidden',
  },

  topHud: {
    height: 38,
    marginHorizontal: 6,
    marginTop: 3,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.24)',
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
    borderRadius: 11,
  },
  hudLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  roundPill: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  roundPillTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
    fontFamily: FONT,
  },
  clockPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1,
    borderColor: '#34D399',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  clockPillDanger: {
    backgroundColor: 'rgba(225, 29, 72, 0.34)',
    borderColor: '#FB7185',
  },
  clockTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#A7F3D0',
    fontFamily: FONT,
  },
  clockTxtDanger: {
    color: '#FFE4E6',
  },
  alivePill: {
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.42)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  aliveTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#E0F2FE',
    fontFamily: FONT,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  statChip: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statChipTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#F8FAFC',
    fontFamily: FONT,
  },
  ufoStateBadge: {
    backgroundColor: 'rgba(147, 51, 234, 0.32)',
    borderWidth: 1,
    borderColor: '#C084FC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  ufoStateTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#F3E8FF',
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
    borderRadius: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.26)',
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
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  unreadDotTxt: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  killFeedBox: {
    position: 'absolute',
    top: 44,
    right: 8,
    maxWidth: 235,
    gap: 3,
    zIndex: 25,
  },
  killFeedRow: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 7,
    borderLeftWidth: 3,
  },
  kfPop: { borderLeftColor: '#FB7185' },
  kfRescue: { borderLeftColor: '#38BDF8' },
  kfCrush: { borderLeftColor: '#F59E0B' },
  killFeedTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F8FAFC',
    fontFamily: FONT,
  },

  arenaCenterWrap: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasFrame: {
    backgroundColor: '#0F172A',
    borderColor: '#34D399',
    borderWidth: 2,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  canvasFrameDanger: {
    borderColor: '#EF4444',
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
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderColor: '#FACC15',
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
    maxWidth: 420,
  },
  bannerCardWin: {
    borderColor: '#38BDF8',
  },
  bannerSub: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FDE047',
    letterSpacing: 0.5,
    fontFamily: FONT,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: FONT,
  },
  bannerHint: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#BAE6FD',
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
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
  },
  miniScoreName: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#E2E8F0',
    maxWidth: 76,
  },
  miniScorePts: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FACC15',
  },

  // CỤM D-PAD TRÁI
  dpadOuter: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.5)',
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
    backgroundColor: 'rgba(30, 41, 59, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadArmActive: {
    backgroundColor: '#2DD4BF',
    borderColor: '#99F6E4',
  },
  dpadUp: { top: 4 },
  dpadDown: { bottom: 4 },
  dpadLeft: { left: 4 },
  dpadRight: { right: 4 },
  dpadPuck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(56, 189, 248, 0.38)',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
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
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  specialBtnCompact: {
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  specialBtnIdle: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderColor: 'rgba(148, 163, 184, 0.4)',
  },
  specialBtnGloveReady: {
    backgroundColor: '#B91C1C',
    borderColor: '#FCA5A5',
  },
  specialBtnNeedleReady: {
    backgroundColor: '#DB2777',
    borderColor: '#FBCFE8',
  },
  specialBtnTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: FONT,
  },

  primaryBombBtn: {
    width: 104,
    height: 82,
    borderRadius: 24,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  primaryBombBtnCompact: {
    width: 94,
    height: 72,
    borderRadius: 20,
  },
  bombBtnNormal: {
    backgroundColor: '#0284C7',
    borderColor: '#7DD3FC',
  },
  bombBtnGloveThrow: {
    backgroundColor: '#EA580C',
    borderColor: '#FDE047',
  },
  bombBtnUfoReady: {
    backgroundColor: '#7E22CE',
    borderColor: '#E9D5FF',
  },
  bombBtnUfoWait: {
    backgroundColor: 'rgba(51, 65, 85, 0.88)',
    borderColor: '#64748B',
  },
  primaryBombTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: FONT,
  },
  primaryBombSub: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#E0F2FE',
  },
  btnPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.92,
  },

  spectatorPill: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    zIndex: 25,
  },
  spectatorTxt: {
    fontSize: 11.5,
    fontWeight: '800',
    color: C.gold,
  },

  kbHintWrap: {
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kbHintTxt: {
    fontSize: 10.5,
    fontWeight: '700',
    color: 'rgba(203, 213, 225, 0.78)',
  },
});
