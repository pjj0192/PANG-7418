type MuzzleFlashProps = {
  x: number
  y: number
}

function MuzzleFlash({ x, y }: MuzzleFlashProps) {
  return (
    <span
      className="muzzle-flash"
      style={{
        left: x,
        top: y,
      }}
    />
  )
}

export default MuzzleFlash
