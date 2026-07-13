type ItemPickupEffectProps = {
  x: number
  y: number
  label: string
}

function ItemPickupEffect({ x, y, label }: ItemPickupEffectProps) {
  return (
    <span
      className="item-pickup-effect"
      style={{
        left: x,
        top: y,
      }}
    >
      {label}
    </span>
  )
}

export default ItemPickupEffect
