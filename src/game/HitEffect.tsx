type HitEffectProps = {
  x: number
  y: number
}

function HitEffect({ x, y }: HitEffectProps) {
  return (
    <span
      className="hit-effect"
      style={{
        left: x,
        top: y,
      }}
    />
  )
}

export default HitEffect
