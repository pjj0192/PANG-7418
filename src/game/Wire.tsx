import { WIRE_HEIGHT, WIRE_WIDTH } from './constants'

type WireProps = {
  x: number
  y: number
}

function Wire({ x, y }: WireProps) {
  return (
    <div
      className="wire"
      style={{
        left: x - WIRE_WIDTH / 2,
        top: y,
        width: WIRE_WIDTH,
        height: WIRE_HEIGHT,
      }}
    />
  )
}

export default Wire
