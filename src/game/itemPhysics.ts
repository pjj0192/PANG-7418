import { ITEM_GRAVITY, ITEM_MAX_FALL_SPEED } from './constants'
import type { ItemType } from './constants'

export type Item = {
  id: number
  x: number
  y: number
  vy: number
  type: ItemType
}

export function stepItem(item: Item, deltaMs: number): Item {
  const vy = Math.min(item.vy + ITEM_GRAVITY * deltaMs, ITEM_MAX_FALL_SPEED)
  const y = item.y + vy * deltaMs
  return { ...item, y, vy }
}
