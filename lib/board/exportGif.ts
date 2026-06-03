import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import type { Frame, PlayerPosition } from '@/types/play'

// Canvas dimensions — 12:7 aspect ratio matching the board
const W = 840
const H = 490

// Playback constants matching useTacticalBoard
const MS_PER_SEGMENT = 900
const FPS = 15
const MS_PER_FRAME = Math.round(1000 / FPS)
const FRAMES_PER_SEGMENT = Math.round(MS_PER_SEGMENT / MS_PER_FRAME)

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

  // Attack tray (left)
  ctx.fillStyle = 'rgba(37, 99, 235, 0.25)'
  ctx.fillRect(0, 0, TRAY_W, H)

  // Defence tray (right)
  ctx.fillStyle = 'rgba(185, 28, 28, 0.25)'
  ctx.fillRect(W - TRAY_W, 0, TRAY_W, H)

  // ── Pitch lines ──
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'
  ctx.lineWidth = 2

  const line = (xPct: number, dashed = false) => {
    const x = toCanvasX(xPct)
    ctx.beginPath()
    if (dashed) ctx.setLineDash([8, 8])
    else ctx.setLineDash([])
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.stroke()
  }

  // In-goal (5%)
  ctx.globalAlpha = 0.85
  line(5)
  line(95)

  // 22m (26.67%)
  ctx.globalAlpha = 0.75
  line(26.67)
  line(73.33)

  // 10m (41.67%)
  ctx.globalAlpha = 0.65
  line(41.67)
  line(58.33)

  // Halfway (50%)
  ctx.globalAlpha = 0.7
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  line(50)

  // 5m lineout (dashed)
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.globalAlpha = 0.5
  line(7.14, true)
  line(92.86, true)

  // 15m lineout (dashed)
  line(21.43, true)
  line(78.57, true)

  ctx.globalAlpha = 1
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

export async function exportGif(frames: Frame[], title = 'rugbymove-move'): Promise<void> {
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
    const count = segments === 0 ? 1 : FRAMES_PER_SEGMENT

    for (let i = 0; i < count; i++) {
      const t = segments === 0 ? 0 : i / FRAMES_PER_SEGMENT
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
