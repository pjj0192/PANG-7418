import { ITEM_RADIUS } from './constants'
import type { ItemType } from './constants'

const ITEM_SYMBOLS: Record<ItemType, string> = {
  spread: 'S',
  fireSpeed: 'F',
  maxWire: 'R',
  heal: 'H',
  invincible: 'I',
}

type ItemProps = {
  x: number
  y: number
  type: ItemType
}

function Item({ x, y, type }: ItemProps) {
  const diameter = ITEM_RADIUS * 2

  return (
    <div
      className={`item item--${type}`}
      style={{
        left: x - ITEM_RADIUS,
        top: y - ITEM_RADIUS,
        width: diameter,
        height: diameter,
      }}
    >
      {ITEM_SYMBOLS[type]}
    </div>
  )
}

export default Item
