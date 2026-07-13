import charImage from '../assets/char.png'
import { PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_Y } from './constants'

type PlayerProps = {
  x: number
  isInvincible?: boolean
  isShielded?: boolean
}

function Player({ x, isInvincible = false, isShielded = false }: PlayerProps) {
  const classNames = ['player']
  if (isInvincible) classNames.push('player--invincible')
  if (isShielded) classNames.push('player--shielded')

  return (
    <img
      src={charImage}
      alt=""
      className={classNames.join(' ')}
      style={{
        left: x - PLAYER_WIDTH / 2,
        top: PLAYER_Y,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
      }}
    />
  )
}

export default Player
