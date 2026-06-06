/** Cumulative segment end-times. Result length === durations.length. */
export function buildCumulative(durations: number[]): number[] {
  const cum: number[] = []
  let acc = 0
  for (const d of durations) {
    acc += d
    cum.push(acc)
  }
  return cum
}

/** Cumulative frame start-times, beginning with 0. Result length === durations.length + 1. */
export function buildFrameStarts(durations: number[]): number[] {
  const cum = [0]
  for (const d of durations) cum.push(cum[cum.length - 1] + d)
  return cum
}
