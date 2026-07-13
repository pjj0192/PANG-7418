export const GAME_WIDTH = 480
export const GAME_HEIGHT = 640

export const PLAYER_WIDTH = 41
export const PLAYER_HEIGHT = 64
export const PLAYER_Y = GAME_HEIGHT - PLAYER_HEIGHT - 12
export const PLAYER_SPEED = 0.35 // px per ms

export const WIRE_WIDTH = 4
export const WIRE_HEIGHT = 24
export const WIRE_SPEED = 0.6 // px per ms
export const MAX_WIRE_COUNT = 1
// 캐릭터 머리보다 살짝 위에서 나가도록(Wire가 모자에 가려 안 보이지 않게)
export const WIRE_SPAWN_OFFSET_Y = 10

// 총구 위치(캐릭터 우측, 가슴 높이) 기준 오프셋 — 발사 이펙트 표시용
export const MUZZLE_OFFSET_X = 18
export const MUZZLE_OFFSET_Y = 30
export const MUZZLE_FLASH_DURATION_MS = 120

export type BubbleSize = 'large' | 'medium' | 'small'

export const BUBBLE_RADIUS: Record<BubbleSize, number> = {
  large: 32,
  medium: 22,
  small: 14,
}

export const BUBBLE_GRAVITY = 0.0009 // px per ms^2
