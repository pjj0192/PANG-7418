import { BUBBLE_RADIUS } from './constants'
import type { BubbleSize } from './constants'

type BubbleProps = {
  x: number
  y: number
  size: BubbleSize
}

function Bubble({ x, y, size }: BubbleProps) {
  const diameter = BUBBLE_RADIUS[size] * 2

  return (
    <div
      className="bubble"
      style={{
        left: x - diameter / 2,
        top: y - diameter / 2,
        width: diameter,
        height: diameter,
      }}
    />
  )
}

export default Bubble
