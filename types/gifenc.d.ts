declare module 'gifenc' {
  export interface GIFEncoder {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: {
        palette?: number[][]
        delay?: number
        transparent?: boolean
        transparentIndex?: number
        repeat?: number
        colorDepth?: number
        dispose?: number
      },
    ): void
    finish(): void
    bytesView(): Uint8Array
    bytes(): Uint8Array
  }

  export function GIFEncoder(opts?: { auto?: boolean; repeat?: number }): GIFEncoder

  export function quantize(
    data: Uint8ClampedArray | Uint8Array,
    maxColors: number,
    opts?: { format?: 'rgb565' | 'rgb444' | 'rgba4444'; oneBitAlpha?: boolean },
  ): number[][]

  export function applyPalette(
    data: Uint8ClampedArray | Uint8Array,
    palette: number[][],
    format?: string,
  ): Uint8Array
}
