import { BUBBLE_GRAVITY, BUBBLE_RADIUS, GAME_HEIGHT, GAME_WIDTH } from './constants'
import type { BubbleSize } from './constants'

export type Bubble = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: BubbleSize
}

export function stepBubble(bubble: Bubble, deltaMs: number): Bubble {
  let { x, y, vx, vy } = bubble
  vy += BUBBLE_GRAVITY * deltaMs
  x += vx * deltaMs
  y += vy * deltaMs

  const r = BUBBLE_RADIUS[bubble.size]

  if (x - r < 0) {
    x = r
    vx = Math.abs(vx)
  } else if (x + r > GAME_WIDTH) {
    x = GAME_WIDTH - r
    vx = -Math.abs(vx)
  }

  if (y - r < 0) {
    y = r
    vy = Math.abs(vy)
  } else if (y + r > GAME_HEIGHT) {
    y = GAME_HEIGHT - r
    vy = -Math.abs(vy)
  }

  return { ...bubble, x, y, vx, vy }
}
