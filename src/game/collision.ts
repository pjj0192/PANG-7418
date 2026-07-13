import { BUBBLE_RADIUS, SPLIT_KICK_VY, SPLIT_SPEED_X, WIRE_HEIGHT, WIRE_WIDTH } from './constants'
import type { BubbleSize } from './constants'
import type { Bubble } from './bubblePhysics'

export type WireLike = {
  id: number
  x: number
  y: number
}

const NEXT_SIZE: Record<BubbleSize, BubbleSize | null> = {
  large: 'medium',
  medium: 'small',
  small: null,
}

export function circleIntersectsRect(
  cx: number,
  cy: number,
  r: number,
  rectLeft: number,
  rectTop: number,
  rectWidth: number,
  rectHeight: number,
): boolean {
  const closestX = Math.max(rectLeft, Math.min(cx, rectLeft + rectWidth))
  const closestY = Math.max(rectTop, Math.min(cy, rectTop + rectHeight))
  const dx = cx - closestX
  const dy = cy - closestY
  return dx * dx + dy * dy <= r * r
}

function wireIntersectsBubble(wire: WireLike, bubble: Bubble): boolean {
  return circleIntersectsRect(
    bubble.x,
    bubble.y,
    BUBBLE_RADIUS[bubble.size],
    wire.x - WIRE_WIDTH / 2,
    wire.y,
    WIRE_WIDTH,
    WIRE_HEIGHT,
  )
}

export function splitBubble(bubble: Bubble, newIds: [number, number]): Bubble[] {
  const nextSize = NEXT_SIZE[bubble.size]
  if (nextSize === null) return []

  return [
    { id: newIds[0], x: bubble.x, y: bubble.y, vx: -SPLIT_SPEED_X, vy: SPLIT_KICK_VY, size: nextSize },
    { id: newIds[1], x: bubble.x, y: bubble.y, vx: SPLIT_SPEED_X, vy: SPLIT_KICK_VY, size: nextSize },
  ]
}

export function resolveWireBubbleCollisions(
  wires: WireLike[],
  bubbles: Bubble[],
  generateId: () => number,
): { wires: WireLike[]; bubbles: Bubble[] } {
  const hitBubbleIds = new Set<number>()
  const survivingWires: WireLike[] = []
  let nextBubbles = bubbles

  for (const wire of wires) {
    const hitBubble = nextBubbles.find(
      (bubble) => !hitBubbleIds.has(bubble.id) && wireIntersectsBubble(wire, bubble),
    )

    if (!hitBubble) {
      survivingWires.push(wire)
      continue
    }

    hitBubbleIds.add(hitBubble.id)
    const splitResults = splitBubble(hitBubble, [generateId(), generateId()])
    nextBubbles = nextBubbles.flatMap((bubble) => (bubble.id === hitBubble.id ? splitResults : [bubble]))
  }

  return { wires: survivingWires, bubbles: nextBubbles }
}

export type RectLike = {
  left: number
  top: number
  width: number
  height: number
}

export function findBubbleHittingPlayer(playerRect: RectLike, bubbles: Bubble[]): Bubble | undefined {
  return bubbles.find((bubble) =>
    circleIntersectsRect(
      bubble.x,
      bubble.y,
      BUBBLE_RADIUS[bubble.size],
      playerRect.left,
      playerRect.top,
      playerRect.width,
      playerRect.height,
    ),
  )
}
