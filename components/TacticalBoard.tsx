'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Home, Pause, Play, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { savePlay } from '@/app/actions/plays'
import { cn } from '@/lib/utils'
import type { Frame, PlayerPosition, PlayCategory } from '@/types/play'

type TacticalBoardProps = {
  initialFrames?: Frame[]
  playId?: string
  mode?: 'fresh' | 'local' | 'saved'
  playTitle?: string
  playDescription?: string | null
  playCategory?: PlayCategory
  isPublic?: boolean
  onFramesChange?: (frames: Frame[]) => void
}

type Token = {
  id: string
  label: string
  side: 'attack' | 'defend' | 'ball'
}

type Formation = {
  id: string
  name: string
  players: PlayerPosition[]
  createdAt: string
}

type SavedMove = {
  id: string
  title: string
  frames: Frame[]
  updatedAt: string
  sourceMoveId?: string
}

const formationsStorageKey = 'rugbyslate.formations.v1'
const movesStorageKey = 'rugbyslate.moves.v1'
const pendingFormationStorageKey = 'rugbyslate.pendingFormation.v1'
const pendingMoveStorageKey = 'rugbyslate.pendingMove.v1'
const pitchLeft = 11
const pitchWidth = 78

const tokens: Token[] = [
  ...Array.from({ length: 15 }, (_, index) => ({
    id: `attack-${index + 1}`,
    label: String(index + 1),
    side: 'attack' as const,
  })),
  ...Array.from({ length: 15 }, (_, index) => ({
    id: `defend-${index + 1}`,
    label: String(index + 1),
    side: 'defend' as const,
  })),
  { id: 'ball', label: '', side: 'ball' as const },
]

function createDefaultPlayers(): PlayerPosition[] {
  return tokens.map((token, index) => {
    if (token.side === 'ball') {
      return { id: token.id, x: 50, y: 50 }
    }

    const teamIndex = token.side === 'attack' ? index : index - 15
    const row = teamIndex % 8
    const col = Math.floor(teamIndex / 8)
    const xBase = token.side === 'attack' ? -9 : 104

    return {
      id: token.id,
      x: xBase + col * 4,
      y: 9 + row * 11,
    }
  })
}

const defaultFrame: Frame = {
  players: createDefaultPlayers(),
  lines: [],
}

function normalizeFrame(frame: Partial<Frame> | undefined): Frame {
  return {
    players: Array.isArray(frame?.players) ? frame.players : createDefaultPlayers(),
    lines: Array.isArray(frame?.lines) ? frame.lines : [],
  }
}

function normalizeFrames(nextFrames: Partial<Frame>[] | undefined): Frame[] {
  if (!Array.isArray(nextFrames) || nextFrames.length === 0) {
    return [defaultFrame]
  }

  return nextFrames.map(normalizeFrame)
}

function clamp(value: number) {
  return Math.min(100, Math.max(0, value))
}

function clampBoardX(value: number) {
  return Math.min(110, Math.max(-10, value))
}

function clampBoardY(value: number) {
  return Math.min(100, Math.max(0, value))
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

function interpolatePlayers(from: PlayerPosition[], to: PlayerPosition[], amount: number) {
  return from.map((player) => {
    const next = to.find((item) => item.id === player.id) ?? player

    return {
      id: player.id,
      x: lerp(player.x, next.x, amount),
      y: lerp(player.y, next.y, amount),
    }
  })
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function tokenForId(id: string) {
  return tokens.find((token) => token.id === id)
}

function boardXToStageX(x: number) {
  return pitchLeft + (x / 100) * pitchWidth
}

function stageXToBoardX(x: number) {
  return ((x - pitchLeft) / pitchWidth) * 100
}

function svgPositionValues(frames: Frame[], id: string, axis: 'x' | 'y') {
  return frames
    .map((frame) => clamp(frame.players.find((player) => player.id === id)?.[axis] ?? 50))
    .join('%;%')
    .concat('%')
}

function createAnimatedSvg(frames: Frame[]) {
  const safeFrames = normalizeFrames(frames)
  const duration = Math.max(1, safeFrames.length - 1)

  const tokenMarkup = tokens
    .map((token) => {
      const first = safeFrames[0].players.find((player) => player.id === token.id)
      if (!first) {
        return ''
      }

      const xValues = svgPositionValues(safeFrames, token.id, 'x')
      const yValues = svgPositionValues(safeFrames, token.id, 'y')
      const firstX = clamp(first.x)
      const firstY = clamp(first.y)
      const animateX = `<animate attributeName="cx" dur="${duration}s" values="${xValues}" fill="freeze" />`
      const animateY = `<animate attributeName="cy" dur="${duration}s" values="${yValues}" fill="freeze" />`

      if (token.side === 'ball') {
        return `
          <g>
            <ellipse cx="${firstX}%" cy="${firstY}%" rx="2.8%" ry="1.6%" fill="#f8fafc" stroke="#14532d" stroke-width="0.45%">
              ${animateX}${animateY}
            </ellipse>
          </g>`
      }

      const fill = token.side === 'attack' ? '#2563eb' : '#dc2626'
      return `
        <g>
          <circle cx="${firstX}%" cy="${firstY}%" r="2.1%" fill="${fill}" stroke="#ffffff" stroke-width="0.35%">
            ${animateX}${animateY}
          </circle>
          <text x="${firstX}%" y="${firstY}%" dominant-baseline="central" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="700">${token.label}</text>
        </g>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="800" viewBox="0 0 1320 800">
  <rect width="1320" height="800" fill="#15803d"/>
  <g stroke="#ffffff" stroke-opacity="0.55" stroke-width="2">
    <rect x="20" y="20" width="1280" height="760" fill="none" stroke-opacity="0.9" stroke-width="5"/>
    <line x1="660" y1="20" x2="660" y2="780"/>
    <line x1="66" y1="20" x2="66" y2="780" stroke-opacity="0.85"/>
    <line x1="1254" y1="20" x2="1254" y2="780" stroke-opacity="0.85"/>
    <line x1="290" y1="20" x2="290" y2="780" stroke-dasharray="12 12"/>
    <line x1="1030" y1="20" x2="1030" y2="780" stroke-dasharray="12 12"/>
  </g>
  ${tokenMarkup}
</svg>`
}

function saveMoveToStorage(move: SavedMove) {
  const saved = window.localStorage.getItem(movesStorageKey)
  const moves = saved ? (JSON.parse(saved) as SavedMove[]) : []
  const nextMoves = [move, ...moves.filter((item) => item.id !== move.id)].slice(0, 24)
  window.localStorage.setItem(movesStorageKey, JSON.stringify(nextMoves))
}

export default function TacticalBoard({
  initialFrames,
  playId,
  mode = 'saved',
  playTitle = 'Untitled move',
  playDescription,
  playCategory = 'Attacking',
  isPublic = false,
  onFramesChange,
}: TacticalBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const [frames, setFrames] = useState<Frame[]>(() => normalizeFrames(initialFrames))
  const [activeFrameIndex, setActiveFrameIndex] = useState(0)
  const [displayPlayers, setDisplayPlayers] = useState<PlayerPosition[] | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [formations, setFormations] = useState<Formation[]>([])
  const [formationName, setFormationName] = useState('')
  const [saveStatus, setSaveStatus] = useState('')

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(formationsStorageKey)
      setFormations(saved ? JSON.parse(saved) : [])

      const pendingMove = mode === 'local' ? window.localStorage.getItem(pendingMoveStorageKey) : null
      if (pendingMove) {
        const move = JSON.parse(pendingMove) as SavedMove
        window.localStorage.removeItem(pendingMoveStorageKey)
        setFrames(normalizeFrames(move.frames))
        setActiveFrameIndex(0)
        return
      }

      if (mode === 'fresh') {
        window.localStorage.removeItem(pendingMoveStorageKey)
        window.localStorage.removeItem(pendingFormationStorageKey)
        setFrames([defaultFrame])
        setActiveFrameIndex(0)
        return
      }

      const pendingFormation =
        mode === 'local' ? window.localStorage.getItem(pendingFormationStorageKey) : null
      if (pendingFormation) {
        const formation = JSON.parse(pendingFormation) as Formation
        window.localStorage.removeItem(pendingFormationStorageKey)
        setFrames((currentFrames) => {
          const firstFrame = currentFrames[0] ?? defaultFrame
          return [
            {
              ...firstFrame,
              players: firstFrame.players.map((player) => {
                const savedPlayer = formation.players.find((item) => item.id === player.id)
                return savedPlayer ? { ...savedPlayer } : player
              }),
            },
          ]
        })
      }
    } catch {
      setFormations([])
    }
  }, [mode])

  const activeFrame = frames[activeFrameIndex] ?? frames[0] ?? defaultFrame
  const visiblePlayers = displayPlayers ?? activeFrame.players

  const playerById = useMemo(() => {
    return new Map(visiblePlayers.map((player) => [player.id, player]))
  }, [visiblePlayers])

  const commitFrames = useCallback(
    (nextFrames: Frame[]) => {
      setFrames(normalizeFrames(nextFrames))
    },
    [],
  )

  const stopPlayback = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    setIsPlaying(false)
    setDisplayPlayers(null)
  }, [])

  const updatePlayerPosition = useCallback(
    (id: string, clientX: number, clientY: number) => {
      const board = boardRef.current
      if (!board || isPlaying) {
        return
      }

      const rect = board.getBoundingClientRect()
      const stageX = ((clientX - rect.left) / rect.width) * 100
      const x = clampBoardX(stageXToBoardX(stageX))
      const y = clampBoardY(((clientY - rect.top) / rect.height) * 100)

      const nextFrames = frames.map((frame, index) => {
        if (index !== activeFrameIndex) {
          return frame
        }

        return {
          ...frame,
          players: frame.players.map((player) => (player.id === id ? { ...player, x, y } : player)),
        }
      })

      commitFrames(nextFrames)
    },
    [activeFrameIndex, commitFrames, frames, isPlaying],
  )

  const handlePointerDown = (id: string) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    updatePlayerPosition(id, event.clientX, event.clientY)
  }

  const handlePointerMove = (id: string) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.buttons !== 1) {
      return
    }

    updatePlayerPosition(id, event.clientX, event.clientY)
  }

  const captureFrame = () => {
    const source = frames[activeFrameIndex] ?? defaultFrame
    const nextFrames = [
      ...frames.slice(0, activeFrameIndex + 1),
      {
        players: source.players.map((player) => ({ ...player })),
        lines: source.lines.map((line) => ({ ...line })),
      },
      ...frames.slice(activeFrameIndex + 1),
    ]
    commitFrames(nextFrames)
    setActiveFrameIndex(activeFrameIndex + 1)
  }

  const deleteFrame = (indexToDelete: number) => {
    stopPlayback()

    if (frames.length <= 1) {
      commitFrames([defaultFrame])
      setActiveFrameIndex(0)
      return
    }

    const nextFrames = frames.filter((_, index) => index !== indexToDelete)
    commitFrames(nextFrames)
    setActiveFrameIndex((currentIndex) => {
      if (currentIndex > indexToDelete) {
        return currentIndex - 1
      }

      if (currentIndex === indexToDelete) {
        return Math.max(0, currentIndex - 1)
      }

      return Math.min(currentIndex, nextFrames.length - 1)
    })
  }

  const resetBoard = () => {
    stopPlayback()
    commitFrames([defaultFrame])
    setActiveFrameIndex(0)
  }

  const saveFormation = () => {
    const trimmedName = formationName.trim()
    if (!trimmedName) {
      return
    }

    const nextFormation: Formation = {
      id: crypto.randomUUID(),
      name: trimmedName,
      players: activeFrame.players.map((player) => ({ ...player })),
      createdAt: new Date().toISOString(),
    }
    const nextFormations = [nextFormation, ...formations].slice(0, 12)

    setFormations(nextFormations)
    window.localStorage.setItem(formationsStorageKey, JSON.stringify(nextFormations))
    setFormationName('')
  }

  const loadFormation = (formation: Formation) => {
    stopPlayback()
    const nextFrames = frames.map((frame, index) => {
      if (index !== activeFrameIndex) {
        return frame
      }

      return {
        ...frame,
        players: frame.players.map((player) => {
          const savedPlayer = formation.players.find((item) => item.id === player.id)
          return savedPlayer ? { ...savedPlayer } : player
        }),
      }
    })

    commitFrames(nextFrames)
  }

  const exportMove = () => {
    const svg = createAnimatedSvg(frames)
    downloadTextFile('rugbyslate-move.svg', svg, 'image/svg+xml')
  }

  const saveCurrentMove = async (asVariation = false) => {
    const title = asVariation ? `${playTitle} variation` : playTitle
    const normalizedFrames = normalizeFrames(frames)

    saveMoveToStorage({
      id: crypto.randomUUID(),
      title,
      frames: normalizedFrames,
      updatedAt: new Date().toISOString(),
      sourceMoveId: asVariation ? playTitle : undefined,
    })

    try {
      const shouldUpdateExisting =
        !asVariation &&
        playId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          playId,
        )

      await savePlay({
        id: shouldUpdateExisting ? playId : undefined,
        title,
        description: playDescription,
        category: playCategory,
        is_public: isPublic,
        animation_data: {
          frames: normalizedFrames,
        },
      })
      setSaveStatus(asVariation ? 'Saved variation to account' : 'Saved move to account')
    } catch (error) {
      setSaveStatus(
        error instanceof Error && error.message.includes('signed in')
          ? 'Saved locally. Log in to save to your account.'
          : 'Saved locally. Account save failed.',
      )
    }
  }

  const playFrames = () => {
    const playbackFrames = normalizeFrames(frames).filter((frame) => frame.players.length > 0)

    if (playbackFrames.length < 2 || isPlaying) {
      return
    }

    const durationPerSegment = 900
    const startedAt = performance.now()
    const totalSegments = playbackFrames.length - 1
    setIsPlaying(true)

    const tick = (now: number) => {
      const elapsed = now - startedAt
      const segment = Math.max(
        0,
        Math.min(totalSegments - 1, Math.floor(elapsed / durationPerSegment)),
      )
      const segmentProgress = Math.min(1, (elapsed % durationPerSegment) / durationPerSegment)
      const fromFrame = playbackFrames[segment]
      const toFrame = playbackFrames[segment + 1]

      setActiveFrameIndex(segment)
      setDisplayPlayers(interpolatePlayers(fromFrame.players, toFrame.players, segmentProgress))

      if (elapsed < totalSegments * durationPerSegment) {
        animationRef.current = requestAnimationFrame(tick)
        return
      }

      setActiveFrameIndex(playbackFrames.length - 1)
      setDisplayPlayers(null)
      setIsPlaying(false)
      animationRef.current = null
    }

    animationRef.current = requestAnimationFrame(tick)
  }

  return (
    <section className="overflow-visible rounded-lg border border-emerald-900/10 bg-white shadow-toolbar">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/"
            aria-label="Home"
            className="inline-flex items-center justify-center rounded-md border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
          >
            <Home className="h-4 w-4" />
          </a>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Tactical board</h2>
            <p className="text-sm text-slate-500">
              Frame {activeFrameIndex + 1} of {frames.length}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={isPlaying ? stopPlayback : playFrames}
            disabled={frames.length < 2}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={captureFrame}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Add frame
          </button>
          {onFramesChange ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              onClick={() => onFramesChange(frames)}
            >
              <Save className="h-4 w-4" />
              Save frames
            </button>
          ) : null}
          <button
            type="button"
            onClick={resetBoard}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={exportMove}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export SVG
          </button>
          <button
            type="button"
            onClick={() => saveCurrentMove(false)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <Save className="h-4 w-4" />
            Save move
          </button>
          <button
            type="button"
            onClick={() => saveCurrentMove(true)}
            className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Save as variation
          </button>
        </div>
        {saveStatus ? (
          <p className="text-sm font-medium text-emerald-700 lg:basis-full lg:text-right">
            {saveStatus}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[1fr_220px]">
        <div
          ref={boardRef}
          className="relative aspect-[2.25/1] min-h-[360px] overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-inner"
          aria-label="Rugby tactical board"
        >
          <div className="absolute inset-y-0 left-0 flex w-[11%] items-start justify-center border-r border-dashed border-blue-300 bg-blue-50 px-1 py-3 text-[11px] font-semibold uppercase text-blue-700">
            Attack tray
          </div>
          <div className="absolute inset-y-0 right-0 flex w-[11%] items-start justify-center border-l border-dashed border-red-300 bg-red-50 px-1 py-3 text-right text-[11px] font-semibold uppercase text-red-700">
            Defence tray
          </div>
          <div className="absolute inset-y-0 left-[11%] w-[78%] overflow-hidden border-4 border-white bg-emerald-700">
            <div className="absolute inset-0 grid grid-cols-10">
              {Array.from({ length: 10 }, (_, index) => (
                <div
                  key={index}
                  className={cn(
                    'border-r border-white/35',
                    index === 0 || index === 9 ? 'bg-emerald-900/15' : 'bg-transparent',
                  )}
                />
              ))}
            </div>

            <div className="absolute inset-y-0 left-1/2 w-px bg-white/70" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
            <div className="absolute left-[5%] top-0 h-full w-px bg-white/80" />
            <div className="absolute right-[5%] top-0 h-full w-px bg-white/80" />
            <div className="absolute left-[22%] top-0 h-full w-px border-l border-dashed border-white/65" />
            <div className="absolute right-[22%] top-0 h-full w-px border-l border-dashed border-white/65" />

            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              {activeFrame.lines.map((line) => (
                <line
                  key={line.id}
                  x1={`${line.from.x}%`}
                  y1={`${line.from.y}%`}
                  x2={`${line.to.x}%`}
                  y2={`${line.to.y}%`}
                  stroke={line.color ?? '#f8fafc'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={line.dashed ? '8 8' : undefined}
                />
              ))}
            </svg>
          </div>

          {tokens.map((token) => {
            const player = playerById.get(token.id)
            if (!player) {
              return null
            }

            return (
              <button
                type="button"
                key={token.id}
                onPointerDown={handlePointerDown(token.id)}
                onPointerMove={handlePointerMove(token.id)}
                className={cn(
                  'absolute flex touch-none select-none items-center justify-center border-2 text-xs font-bold shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-300',
                  token.side === 'attack' && 'border-blue-100 bg-blue-600 text-white',
                  token.side === 'defend' && 'border-red-100 bg-red-600 text-white',
                  token.side === 'ball' &&
                    'h-8 w-12 rounded-[50%] border-emerald-900 bg-slate-50 text-transparent',
                  token.side !== 'ball' && 'h-9 w-9 rounded-full',
                )}
                style={{
                  left: `${boardXToStageX(player.x)}%`,
                  top: `${player.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                aria-label={
                  token.side === 'ball'
                    ? 'Ball'
                    : `${token.side === 'attack' ? 'Attacking' : 'Defending'} player ${token.label}`
                }
              >
                {token.side === 'ball' ? (
                  <>
                    <span className="absolute inset-[2px] rounded-[50%] border-t-2 border-[#e11d48]" />
                    <span className="absolute inset-[4px] rounded-[50%] border-b-2 border-[#2563eb]" />
                    <span className="absolute left-[7px] top-1/2 h-[18px] w-[5px] -translate-y-1/2 rounded-[50%] border-l-2 border-[#16a34a]" />
                    <span className="absolute right-[7px] top-1/2 h-[18px] w-[5px] -translate-y-1/2 rounded-[50%] border-r-2 border-[#16a34a]" />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[7px] font-black tracking-[0.08em] text-slate-900">
                      G
                    </span>
                  </>
                ) : (
                  token.label
                )}
              </button>
            )
          })}
        </div>

        <aside className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase text-slate-500">Frames</h3>
          <div className="grid grid-cols-4 gap-2 xl:grid-cols-2">
            {frames.map((frame, index) => (
              <div
                key={`${frame.players.length}-${index}`}
                className={cn(
                  'flex overflow-hidden rounded-md border transition',
                  activeFrameIndex === index
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    stopPlayback()
                    setActiveFrameIndex(index)
                  }}
                  className="min-w-0 flex-1 px-3 py-2 text-sm font-semibold"
                  aria-label={`Select frame ${index + 1}`}
                >
                  {index + 1}
                </button>
                <button
                  type="button"
                  onClick={() => deleteFrame(index)}
                  className="flex w-9 items-center justify-center border-l border-inherit text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  aria-label={`Delete frame ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-2 rounded-md bg-slate-950 p-4 text-sm leading-6 text-slate-100">
            <p className="font-semibold">Tokens</p>
            <p className="mt-2 text-slate-300">Blue 1-15 attack, red 1-15 defend, ball animates between frames.</p>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-sm font-semibold uppercase text-slate-500">Formations</h3>
            <div className="mt-3 flex gap-2">
              <input
                value={formationName}
                onChange={(event) => setFormationName(event.target.value)}
                placeholder="Scrum centre"
                className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-700"
              />
              <button
                type="button"
                onClick={saveFormation}
                disabled={!formationName.trim()}
                className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                Save
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {formations.length === 0 ? (
                <p className="text-sm text-slate-500">Save the current frame as a reusable start shape.</p>
              ) : (
                formations.map((formation) => (
                  <button
                    type="button"
                    key={formation.id}
                    onClick={() => loadFormation(formation)}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-emerald-700 hover:text-emerald-900"
                  >
                    {formation.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
