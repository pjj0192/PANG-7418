export const GAME_WIDTH = 480
export const GAME_HEIGHT = 640

export const PLAYER_WIDTH = 41
export const PLAYER_HEIGHT = 64
export const PLAYER_Y = GAME_HEIGHT - PLAYER_HEIGHT - 12
export const PLAYER_SPEED = 0.35 // px per ms

export const WIRE_WIDTH = 4
export const WIRE_HEIGHT = 24
export const WIRE_SPEED = 0.6 // px per ms
export const BASE_MAX_WIRE_COUNT = 1
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

// Bubble이 Wire에 맞아 분할될 때 두 조각이 갈라지는 속도
export const SPLIT_SPEED_X = 0.15
export const SPLIT_KICK_VY = -0.35

export const INITIAL_LIVES = 5
export const MAX_LIVES = INITIAL_LIVES // 시작 목숨 이상으로는 회복 불가
export const INVINCIBILITY_DURATION_MS = 2500
export const HIT_EFFECT_DURATION_MS = 300

// 아이템 드롭/낙하
export const ITEM_DROP_CHANCE = 0.2
export const ITEM_RADIUS = 12
export const ITEM_GRAVITY = 0.0012 // px per ms^2
export const ITEM_MAX_FALL_SPEED = 0.5 // px per ms
export const ITEM_DESPAWN_Y = PLAYER_Y + PLAYER_HEIGHT // 캐릭터 발 높이 — 여기까지 내려오면 소멸
export const ITEM_PICKUP_EFFECT_DURATION_MS = 700

export const ITEM_TYPES = ['spread', 'fireSpeed', 'maxWire', 'heal', 'invincible'] as const
export type ItemType = (typeof ITEM_TYPES)[number]

export const ITEM_LABELS: Record<ItemType, string> = {
  spread: 'SPREAD+',
  fireSpeed: 'SPEED+',
  maxWire: 'RAPID+',
  heal: '+1 HP',
  invincible: 'INVINCIBLE',
}

// 발수 증가 — 레벨별 발사 각도(수동 튜닝, 공식화하지 않음)
export const SPREAD_MAX_LEVEL = 3
export const SPREAD_ANGLES_BY_LEVEL: Record<number, number[]> = {
  0: [0],
  1: [-10, 10],
  2: [-15, 0, 15],
  3: [-20, -5, 5, 20],
}

// 발사 속도 30% 향상
export const FIRE_SPEED_BONUS_PER_LEVEL = 0.3
export const FIRE_SPEED_MAX_LEVEL = 3

// 연발(동시 발사 가능 Wire 용량)
export const MAX_WIRE_BONUS_PER_LEVEL = 1
export const MAX_WIRE_MAX_LEVEL = 3

// 체력 +1
export const HEAL_AMOUNT = 1

// 10초 무적(중첩 없이 항상 리필)
export const ITEM_INVINCIBILITY_DURATION_MS = 10_000
