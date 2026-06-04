import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import type { Frame, PlayerPosition } from '@/types/play'

// Canvas dimensions — 12:7 aspect ratio matching the board
const W = 840
const H = 490

const DEFAULT_SEGMENT_MS = 900
const FPS = 15
const MS_PER_FRAME = Math.round(1000 / FPS)

// Pitch geometry — must match TacticalBoard.tsx tray/pitch layout
const TRAY_W = W * 0.08          // 8% tray on each side
const PITCH_LEFT = TRAY_W
const PITCH_W = W - TRAY_W * 2

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function interpolatePlayers(from: PlayerPosition[], to: PlayerPosition[], t: number): PlayerPosition[] {
  return from.map((p) => {
    const next = to.find((q) => q.id === p.id) ?? p
    return { id: p.id, x: lerp(p.x, next.x, t), y: lerp(p.y, next.y, t) }
  })
}

// Map pitch-relative x (0–100) to canvas x, matching board coordinate system
function toCanvasX(x: number): number {
  return PITCH_LEFT + (x / 100) * PITCH_W
}

function toCanvasY(y: number): number {
  return (y / 100) * H
}

function drawFrame(ctx: CanvasRenderingContext2D, players: PlayerPosition[]) {
  ctx.clearRect(0, 0, W, H)

  // ── Pitch background ──
  ctx.fillStyle = '#15803d'
  ctx.fillRect(0, 0, W, H)

  // ── Helpers ──
  const px = (xPct: number) => toCanvasX(xPct)
  const py = (yPct: number) => toCanvasY(yPct)

  const vline = (xPct: number, alpha: number, width = 1.5, dashed = false) => {
    const x = px(xPct)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = width
    ctx.setLineDash(dashed ? [8, 6] : [])
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.stroke()
    ctx.restore()
  }

  const hline = (yPct: number, alpha: number, dashed = false) => {
    const y = py(yPct)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    ctx.setLineDash(dashed ? [6, 8] : [])
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
    ctx.restore()
  }

  const crosshair = (xPct: number, yPct: number) => {
    const x = px(xPct)
    const y = py(yPct)
    const s = 5
    ctx.save()
    ctx.globalAlpha = 0.55
    ctx.lineWidth = 1.5
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(x - s, y); ctx.lineTo(x + s, y)
    ctx.moveTo(x, y - s); ctx.lineTo(x, y + s)
    ctx.stroke()
    ctx.restore()
  }

  ctx.strokeStyle = 'rgba(255,255,255,1)'

  // In-goal shading
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  ctx.fillRect(0, 0, px(8.33), H)
  ctx.fillRect(px(91.67), 0, W - px(91.67), H)

  // Touchlines (top/bottom) and dead-ball lines (left/right)
  ctx.save()
  ctx.globalAlpha = 0.7
  ctx.lineWidth = 2
  ctx.setLineDash([])
  ctx.strokeRect(0, 0, W, H)
  ctx.restore()

  // Try lines
  vline(8.33, 0.85, 2)
  vline(91.67, 0.85, 2)

  // 22m lines
  vline(26.67, 0.65)
  vline(73.33, 0.65)

  // 10m lines (dashed)
  vline(41.67, 0.45, 1, true)
  vline(58.33, 0.45, 1, true)

  // Halfway
  vline(50, 0.75, 1.5)

  // Lineout horizontals — 5m (7.14%) and 15m (21.43%) from each touchline
  hline(7.14, 0.35, true)
  hline(92.86, 0.35, true)
  hline(21.43, 0.25, true)
  hline(78.57, 0.25, true)

  // Crosshairs: try × 5m, try × 15m, 22m × 5m, 22m × 15m (both ends)
  const xLines = [8.33, 91.67, 26.67, 73.33]
  const yLines = [7.14, 92.86, 21.43, 78.57]
  for (const x of xLines) for (const y of yLines) crosshair(x, y)

  // Centre spot
  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 1.5
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.arc(px(50), py(50), 4, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  // ── Tokens ──
  for (const p of players) {
    const cx = toCanvasX(p.x)
    const cy = toCanvasY(p.y)

    if (p.id === 'ball') {
      // Ball — oval shape
      ctx.save()
      ctx.translate(cx, cy)
      ctx.beginPath()
      ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#f1f5f9'
      ctx.fill()
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.restore()
    } else {
      const isAttack = p.id.startsWith('attack')
      const r = 9

      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = isAttack ? '#2563eb' : '#dc2626'
      ctx.fill()
      ctx.strokeStyle = isAttack ? '#bfdbfe' : '#fecaca'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Jersey number
      const num = p.id.split('-')[1]
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${r * 1.1}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(num, cx, cy)
    }
  }
}

export async function exportGif(frames: Frame[], durations: number[], title = 'rugbymove-move'): Promise<void> {
  if (frames.length < 1) return

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const encoder = GIFEncoder()

  // Build a flat list of interpolated frames
  const segments = frames.length - 1

  for (let seg = 0; seg < Math.max(segments, 1); seg++) {
    const from = frames[seg]
    const to = frames[Math.min(seg + 1, frames.length - 1)]
    const segMs = segments === 0 ? DEFAULT_SEGMENT_MS : (durations[seg] ?? DEFAULT_SEGMENT_MS)
    const count = segments === 0 ? 1 : Math.max(1, Math.round(segMs / MS_PER_FRAME))

    for (let i = 0; i < count; i++) {
      const t = segments === 0 ? 0 : i / count
      const players = interpolatePlayers(from.players, to.players, t)
      drawFrame(ctx, players)

      const imageData = ctx.getImageData(0, 0, W, H)
      const palette = quantize(imageData.data, 256)
      const index = applyPalette(imageData.data, palette)

      encoder.writeFrame(index, W, H, {
        palette,
        delay: MS_PER_FRAME,
        repeat: 0,
      })
    }
  }

  // Hold on the final frame for 1.5s before looping
  const lastFrame = frames[frames.length - 1]
  drawFrame(ctx, lastFrame.players)
  const imageData = ctx.getImageData(0, 0, W, H)
  const palette = quantize(imageData.data, 256)
  const index = applyPalette(imageData.data, palette)
  encoder.writeFrame(index, W, H, { palette, delay: 1500, repeat: 0 })

  encoder.finish()

  const blob = new Blob([encoder.bytes().buffer as ArrayBuffer], { type: 'image/gif' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.gif`
  a.click()
  URL.revokeObjectURL(url)
}
