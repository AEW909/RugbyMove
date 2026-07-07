import { z } from 'zod'

// Kept in one place so app/actions/plays.ts (save) and app/playbook/[id]/page.tsx
// (load) validate animation_data identically. Must stay in sync with the Frame /
// AnimationData types in types/play.ts.

const pointSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
})

export const frameSchema = z.object({
  players: z.array(
    z.object({
      id: z.string().min(1).max(12),
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
    }),
  ),
  zones: z.array(
    z.object({
      id: z.string().min(1).max(64),
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      r: z.number().min(1).max(50),
      label: z.string().max(40),
    }),
  ).optional(),
  lines: z.array(
    z.object({
      id: z.string().min(1).max(64),
      from: pointSchema,
      to: pointSchema,
      color: z.string().max(32).optional(),
      dashed: z.boolean().optional(),
    }),
  ),
})

export const animationDataSchema = z.object({
  frames: z.array(frameSchema).min(1),
  durations: z.array(z.number().min(200).max(3000)).optional(),
  pitchPortrait: z.boolean().optional(),
})

export type AnimationDataParsed = z.infer<typeof animationDataSchema>
