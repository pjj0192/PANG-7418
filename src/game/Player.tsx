import charImage from '../assets/char.png'
import { PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_Y } from './constants'

type PlayerProps = {
  x: number
  isInvincible?: boolean
}

function Player({ x, isInvincible = false }: PlayerProps) {
  return (
    <img
      src={charImage}
      alt=""
      className={isInvincible ? 'player player--invincible' : 'player'}
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
