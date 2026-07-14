type InvincibilityBarProps = {
  x: number
  y: number
  ratio: number
}

function InvincibilityBar({ x, y, ratio }: InvincibilityBarProps) {
  return (
    <div className="invincibility-bar" style={{ left: x, top: y }}>
      <div className="invincibility-bar__fill" style={{ width: `${ratio * 100}%` }} />
    </div>
  )
}

export default InvincibilityBar
