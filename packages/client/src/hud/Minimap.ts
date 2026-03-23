import type { HeightmapData, PlayerPublicState, Vec3 } from '@bojo-dojo/common';

const PLAYER_COLORS = [
  '#e74c3c', // red
  '#3498db', // blue
  '#2ecc71', // green
  '#f39c12', // orange
  '#9b59b6', // purple
  '#1abc9c', // teal
];

const MAP_PX = 140;
const CONTOUR_INTERVAL = 3; // meters between contour lines

export class Minimap {
  readonly element: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private topoCanvas: HTMLCanvasElement;
  private debugMode = false;
  private heightmap: HeightmapData | null = null;
  private arrowTrail: Vec3[] | null = null;
  private trailExpireAt = 0;
  private onKeyDown: (e: KeyboardEvent) => void;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    Object.assign(this.element.style, {
      position: 'absolute',
      top: '16px',
      left: '16px',
      width: `${MAP_PX}px`,
      height: `${MAP_PX}px`,
      borderRadius: '8px',
      overflow: 'hidden',
      border: '2px solid rgba(255,255,255,0.3)',
      background: 'rgba(0,0,0,0.4)',
      pointerEvents: 'none',
      display: 'none',
    });

    this.canvas = document.createElement('canvas');
    this.canvas.width = MAP_PX;
    this.canvas.height = MAP_PX;
    this.element.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    this.topoCanvas = document.createElement('canvas');
    this.topoCanvas.width = MAP_PX;
    this.topoCanvas.height = MAP_PX;

    parent.appendChild(this.element);

    this.onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        this.debugMode = !this.debugMode;
      }
    };
    window.addEventListener('keydown', this.onKeyDown);
  }

  setHeightmap(heightmap: HeightmapData) {
    this.heightmap = heightmap;
    this.renderTopo();
  }

  show() { this.element.style.display = 'block'; }
  hide() { this.element.style.display = 'none'; }

  /** Show the arc of an arrow on the minimap for a few seconds. */
  setArrowTrail(positions: Vec3[]) {
    this.arrowTrail = positions;
    this.trailExpireAt = Date.now() + 3000;
  }

  clearArrowTrail() {
    this.arrowTrail = null;
  }

  update(localPlayerId: string, players: PlayerPublicState[], cameraYaw?: number, showAll = false) {
    if (!this.heightmap) return;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, MAP_PX, MAP_PX);
    ctx.drawImage(this.topoCanvas, 0, 0);
    this.drawTrail();

    if (this.debugMode || showAll) {
      for (const p of players) {
        if (!p.alive) continue;
        const isLocal = p.id === localPlayerId;
        this.drawPlayerDot(p.position.x, p.position.z, p.colorIndex, isLocal,
          isLocal ? cameraYaw : p.viewYaw);
      }
    } else {
      const local = players.find((p) => p.id === localPlayerId);
      if (local) {
        this.drawPlayerDot(local.position.x, local.position.z, local.colorIndex, true, cameraYaw);
      }
    }
  }

  /** Lightweight update for local-only position (offline or between state syncs). */
  updateLocal(worldX: number, worldZ: number, colorIndex: number, yaw?: number) {
    if (!this.heightmap) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, MAP_PX, MAP_PX);
    ctx.drawImage(this.topoCanvas, 0, 0);
    this.drawTrail();
    this.drawPlayerDot(worldX, worldZ, colorIndex, true, yaw);
  }

  private drawTrail() {
    if (!this.arrowTrail || !this.heightmap) return;
    if (Date.now() > this.trailExpireAt) {
      this.arrowTrail = null;
      return;
    }

    const ctx = this.ctx;
    const trail = this.arrowTrail;
    // Fade out over the last second
    const remaining = this.trailExpireAt - Date.now();
    const alpha = Math.min(1, remaining / 1000);

    ctx.beginPath();
    for (let i = 0; i < trail.length; i++) {
      const px = this.toPixelX(trail[i].x);
      const py = this.toPixelZ(trail[i].z);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = `rgba(255, 220, 80, ${0.7 * alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Landing dot
    const last = trail[trail.length - 1];
    const lx = this.toPixelX(last.x);
    const ly = this.toPixelZ(last.z);
    ctx.beginPath();
    ctx.arc(lx, ly, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 100, 50, ${0.9 * alpha})`;
    ctx.fill();
  }

  private drawPlayerDot(
    worldX: number, worldZ: number,
    colorIndex: number, isLocal: boolean, yaw?: number,
  ) {
    const px = this.toPixelX(worldX);
    const py = this.toPixelZ(worldZ);
    const ctx = this.ctx;
    const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
    const r = isLocal ? 5 : 4;

    // Direction indicator
    if (yaw !== undefined) {
      const len = isLocal ? 12 : 8;
      // yaw = 0 faces -Z in world space; canvas Y increases downward
      const dx = -Math.sin(yaw) * len;
      const dy = -Math.cos(yaw) * len;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + dx, py + dy);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private toPixelX(worldX: number): number {
    const hm = this.heightmap!;
    return ((worldX + hm.worldWidth / 2) / hm.worldWidth) * MAP_PX;
  }

  private toPixelZ(worldZ: number): number {
    const hm = this.heightmap!;
    return ((worldZ + hm.worldDepth / 2) / hm.worldDepth) * MAP_PX;
  }

  private renderTopo() {
    if (!this.heightmap) return;
    const hm = this.heightmap;
    const ctx = this.topoCanvas.getContext('2d')!;
    const { heights, width, depth } = hm;

    let minH = Infinity;
    let maxH = -Infinity;
    for (let i = 0; i < heights.length; i++) {
      if (heights[i] < minH) minH = heights[i];
      if (heights[i] > maxH) maxH = heights[i];
    }

    // Elevation color fill
    const imgData = ctx.createImageData(MAP_PX, MAP_PX);
    for (let py = 0; py < MAP_PX; py++) {
      for (let px = 0; px < MAP_PX; px++) {
        const gx = (px / MAP_PX) * (width - 1);
        const gz = (py / MAP_PX) * (depth - 1);
        const x0 = Math.floor(gx);
        const z0 = Math.floor(gz);
        const x1 = Math.min(x0 + 1, width - 1);
        const z1 = Math.min(z0 + 1, depth - 1);
        const fx = gx - x0;
        const fz = gz - z0;
        const h =
          heights[z0 * width + x0] * (1 - fx) * (1 - fz) +
          heights[z0 * width + x1] * fx * (1 - fz) +
          heights[z1 * width + x0] * (1 - fx) * fz +
          heights[z1 * width + x1] * fx * fz;

        const t = maxH > minH ? (h - minH) / (maxH - minH) : 0;
        const r = Math.round(40 + t * 60);
        const g = Math.round(60 + t * 40 + (1 - t) * 30);
        const b = Math.round(30 + t * 20);
        const idx = (py * MAP_PX + px) * 4;
        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = 200;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Contour lines via marching squares
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 0.8;

    const scaleX = MAP_PX / (width - 1);
    const scaleZ = MAP_PX / (depth - 1);

    for (
      let level = Math.ceil(minH / CONTOUR_INTERVAL) * CONTOUR_INTERVAL;
      level < maxH;
      level += CONTOUR_INTERVAL
    ) {
      ctx.beginPath();
      for (let gz = 0; gz < depth - 1; gz++) {
        for (let gx = 0; gx < width - 1; gx++) {
          const h00 = heights[gz * width + gx];
          const h10 = heights[gz * width + gx + 1];
          const h01 = heights[(gz + 1) * width + gx];
          const h11 = heights[(gz + 1) * width + gx + 1];

          const c =
            (h00 >= level ? 8 : 0) |
            (h10 >= level ? 4 : 0) |
            (h11 >= level ? 2 : 0) |
            (h01 >= level ? 1 : 0);
          if (c === 0 || c === 15) continue;

          const lerp = (a: number, b: number) => {
            const d = b - a;
            return Math.abs(d) < 0.001 ? 0.5 : (level - a) / d;
          };

          const top = { x: (gx + lerp(h00, h10)) * scaleX, y: gz * scaleZ };
          const right = { x: (gx + 1) * scaleX, y: (gz + lerp(h10, h11)) * scaleZ };
          const bottom = { x: (gx + lerp(h01, h11)) * scaleX, y: (gz + 1) * scaleZ };
          const left = { x: gx * scaleX, y: (gz + lerp(h00, h01)) * scaleZ };

          const segs: Array<[{ x: number; y: number }, { x: number; y: number }]> = [];
          switch (c) {
            case 1: case 14: segs.push([left, bottom]); break;
            case 2: case 13: segs.push([bottom, right]); break;
            case 3: case 12: segs.push([left, right]); break;
            case 4: case 11: segs.push([top, right]); break;
            case 5: segs.push([top, left], [bottom, right]); break;
            case 6: case 9: segs.push([top, bottom]); break;
            case 7: case 8: segs.push([top, left]); break;
            case 10: segs.push([top, right], [left, bottom]); break;
          }
          for (const [a, b] of segs) {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
          }
        }
      }
      ctx.stroke();
    }
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    this.element.remove();
  }
}
