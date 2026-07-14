import {
  BASE_MAX_WIRE_COUNT,
  FIRE_SPEED_BONUS_PER_LEVEL,
  MAX_WIRE_BONUS_PER_LEVEL,
  SPREAD_ANGLES_BY_LEVEL,
  WIRE_SPEED,
} from './constants'

export type Upgrades = {
  spreadLevel: number
  fireSpeedLevel: number
  maxWireLevel: number
}

export const INITIAL_UPGRADES: Upgrades = {
  spreadLevel: 0,
  fireSpeedLevel: 0,
  maxWireLevel: 0,
}

export function getSpreadAngles(spreadLevel: number): number[] {
  return SPREAD_ANGLES_BY_LEVEL[spreadLevel] ?? SPREAD_ANGLES_BY_LEVEL[0]
}

export function getBurstCount(spreadLevel: number): number {
  return getSpreadAngles(spreadLevel).length
}

export function getEffectiveWireSpeed(fireSpeedLevel: number): number {
  return WIRE_SPEED * (1 + FIRE_SPEED_BONUS_PER_LEVEL * fireSpeedLevel)
}

export function getEffectiveMaxWireCount(upgrades: Upgrades): number {
  const fromLevel = BASE_MAX_WIRE_COUNT + upgrades.maxWireLevel * MAX_WIRE_BONUS_PER_LEVEL
  return Math.max(fromLevel, getBurstCount(upgrades.spreadLevel))
}
