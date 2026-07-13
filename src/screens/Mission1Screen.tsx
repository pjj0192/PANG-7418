import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import './Mission1Screen.css'
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  HIT_EFFECT_DURATION_MS,
  INITIAL_LIVES,
  INVINCIBILITY_DURATION_MS,
  ITEM_DESPAWN_Y,
  ITEM_DROP_CHANCE,
  ITEM_INVINCIBILITY_DURATION_MS,
  ITEM_LABELS,
  ITEM_PICKUP_EFFECT_DURATION_MS,
  ITEM_TYPES,
  HEAL_AMOUNT,
  MAX_LIVES,
  MUZZLE_FLASH_DURATION_MS,
  MUZZLE_OFFSET_X,
  MUZZLE_OFFSET_Y,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  PLAYER_WIDTH,
  PLAYER_Y,
  SPREAD_MAX_LEVEL,
  FIRE_SPEED_MAX_LEVEL,
  MAX_WIRE_MAX_LEVEL,
  WIRE_SPAWN_OFFSET_Y,
} from '../game/constants'
import type { ItemType } from '../game/constants'
import { useGameLoop } from '../game/useGameLoop'
import Player from '../game/Player'
import Wire from '../game/Wire'
import MuzzleFlash from '../game/MuzzleFlash'
import HitEffect from '../game/HitEffect'
import BubbleView from '../game/Bubble'
import ItemView from '../game/Item'
import ItemPickupEffect from '../game/ItemPickupEffect'
import InvincibilityBar from '../game/InvincibilityBar'
import { stepBubble } from '../game/bubblePhysics'
import type { Bubble } from '../game/bubblePhysics'
import { stepItem } from '../game/itemPhysics'
import type { Item } from '../game/itemPhysics'
import { findBubbleHittingPlayer, resolveItemPickups, resolveWireBubbleCollisions } from '../game/collision'
import {
  INITIAL_UPGRADES,
  getEffectiveMaxWireCount,
  getEffectiveWireSpeed,
  getSpreadAngles,
} from '../game/upgrades'
import type { Upgrades } from '../game/upgrades'

type WireState = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
}

type MuzzleFlashState = {
  id: number
  x: number
  y: number
}

type HitEffectState = {
  id: number
  x: number
  y: number
}

type PickupEffectState = {
  id: number
  x: number
  y: number
  label: string
}

const INITIAL_BUBBLES: Bubble[] = [
  { id: 0, x: GAME_WIDTH * 0.3, y: 120, vx: 0.12, vy: 0, size: 'large' },
  { id: 1, x: GAME_WIDTH * 0.7, y: 200, vx: -0.1, vy: 0, size: 'large' },
]

function Mission1Screen() {
  const [playerX, setPlayerX] = useState(GAME_WIDTH / 2)
  const [wires, setWires] = useState<WireState[]>([])
  const [flashes, setFlashes] = useState<MuzzleFlashState[]>([])
  const [bubbles, setBubbles] = useState<Bubble[]>(INITIAL_BUBBLES)
  const [isCleared, setIsCleared] = useState(false)
  const [lives, setLives] = useState(INITIAL_LIVES)
  const [isInvincible, setIsInvincible] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [hitEffects, setHitEffects] = useState<HitEffectState[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [upgrades, setUpgrades] = useState<Upgrades>(INITIAL_UPGRADES)
  const [itemInvincibleMs, setItemInvincibleMs] = useState(0)
  const [pickupEffects, setPickupEffects] = useState<PickupEffectState[]>([])

  const pressedKeys = useRef(new Set<string>())
  const playerXRef = useRef(playerX)
  playerXRef.current = playerX
  const wiresRef = useRef(wires)
  wiresRef.current = wires
  const bubblesRef = useRef(bubbles)
  bubblesRef.current = bubbles
  const itemsRef = useRef(items)
  itemsRef.current = items
  const upgradesRef = useRef(upgrades)
  upgradesRef.current = upgrades
  const isInvincibleRef = useRef(isInvincible)
  isInvincibleRef.current = isInvincible
  const itemInvincibleMsRef = useRef(itemInvincibleMs)
  itemInvincibleMsRef.current = itemInvincibleMs
  const isGameOverRef = useRef(isGameOver)
  isGameOverRef.current = isGameOver
  const nextWireId = useRef(0)
  const nextFlashId = useRef(0)
  const nextHitEffectId = useRef(0)
  const nextBubbleId = useRef(INITIAL_BUBBLES.length)
  const nextItemId = useRef(0)
  const nextPickupEffectId = useRef(0)
  const flashTimeouts = useRef(new Set<ReturnType<typeof setTimeout>>())
  const hitEffectTimeouts = useRef(new Set<ReturnType<typeof setTimeout>>())
  const pickupEffectTimeouts = useRef(new Set<ReturnType<typeof setTimeout>>())
  const invincibleTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const applyItemEffect = (type: ItemType) => {
    switch (type) {
      case 'spread':
        setUpgrades((u) => ({ ...u, spreadLevel: Math.min(u.spreadLevel + 1, SPREAD_MAX_LEVEL) }))
        break
      case 'fireSpeed':
        setUpgrades((u) => ({ ...u, fireSpeedLevel: Math.min(u.fireSpeedLevel + 1, FIRE_SPEED_MAX_LEVEL) }))
        break
      case 'maxWire':
        setUpgrades((u) => ({ ...u, maxWireLevel: Math.min(u.maxWireLevel + 1, MAX_WIRE_MAX_LEVEL) }))
        break
      case 'heal':
        setLives((l) => Math.min(l + HEAL_AMOUNT, MAX_LIVES))
        break
      case 'invincible':
        itemInvincibleMsRef.current = ITEM_INVINCIBILITY_DURATION_MS
        setItemInvincibleMs(itemInvincibleMsRef.current)
        break
    }
  }

  const fireWire = () => {
    const burstAngles = getSpreadAngles(upgradesRef.current.spreadLevel)
    const effectiveMaxWireCount = getEffectiveMaxWireCount(upgradesRef.current)
    const effectiveWireSpeed = getEffectiveWireSpeed(upgradesRef.current.fireSpeedLevel)

    setWires((current) => {
      if (current.length + burstAngles.length > effectiveMaxWireCount) return current

      const spawnX = playerXRef.current
      const spawnY = PLAYER_Y - WIRE_SPAWN_OFFSET_Y
      const newWires: WireState[] = burstAngles.map((angleDeg) => {
        const angleRad = (angleDeg * Math.PI) / 180
        return {
          id: nextWireId.current++,
          x: spawnX,
          y: spawnY,
          vx: Math.sin(angleRad) * effectiveWireSpeed,
          vy: Math.cos(angleRad) * effectiveWireSpeed,
        }
      })
      return [...current, ...newWires]
    })

    const flashId = nextFlashId.current++
    setFlashes((current) => [
      ...current,
      { id: flashId, x: playerXRef.current + MUZZLE_OFFSET_X, y: PLAYER_Y + MUZZLE_OFFSET_Y },
    ])
    const timeoutId = setTimeout(() => {
      setFlashes((current) => current.filter((flash) => flash.id !== flashId))
      flashTimeouts.current.delete(timeoutId)
    }, MUZZLE_FLASH_DURATION_MS)
    flashTimeouts.current.add(timeoutId)
  }

  useEffect(() => {
    const timeouts = flashTimeouts.current
    return () => {
      timeouts.forEach(clearTimeout)
      timeouts.clear()
    }
  }, [])

  useEffect(() => {
    const timeouts = hitEffectTimeouts.current
    return () => {
      timeouts.forEach(clearTimeout)
      timeouts.clear()
    }
  }, [])

  useEffect(() => {
    const timeouts = pickupEffectTimeouts.current
    return () => {
      timeouts.forEach(clearTimeout)
      timeouts.clear()
    }
  }, [])

  useEffect(() => {
    return () => clearTimeout(invincibleTimeoutRef.current)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        pressedKeys.current.add(e.code)
      }
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        fireWire()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeys.current.delete(e.code)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useGameLoop((deltaMs) => {
    let dx = 0
    if (pressedKeys.current.has('ArrowLeft')) dx -= PLAYER_SPEED * deltaMs
    if (pressedKeys.current.has('ArrowRight')) dx += PLAYER_SPEED * deltaMs

    if (dx !== 0) {
      const halfWidth = PLAYER_WIDTH / 2
      setPlayerX((x) => Math.min(GAME_WIDTH - halfWidth, Math.max(halfWidth, x + dx)))
    }

    const movedWires = wiresRef.current
      .map((wire) => ({ ...wire, x: wire.x + wire.vx * deltaMs, y: wire.y - wire.vy * deltaMs }))
      .filter((wire) => wire.y > 0 && wire.x > 0 && wire.x < GAME_WIDTH)
    const movedBubbles = bubblesRef.current.map((bubble) => stepBubble(bubble, deltaMs))

    const { wires: nextWires, bubbles: nextBubbles, hitPositions } = resolveWireBubbleCollisions(
      movedWires,
      movedBubbles,
      () => nextBubbleId.current++,
    )

    setWires(nextWires)
    setBubbles(nextBubbles)

    if (nextBubbles.length === 0) {
      setIsCleared(true)
    }

    // 아이템 낙하: 기존 아이템 이동 + 발 높이를 지난 것 소멸, 이번 tick의 충돌 위치에서 확률적으로 새 아이템 생성
    const fallenItems = itemsRef.current
      .map((item) => stepItem(item, deltaMs))
      .filter((item) => item.y < ITEM_DESPAWN_Y)
    const spawnedItems: Item[] = hitPositions.flatMap((pos) =>
      Math.random() < ITEM_DROP_CHANCE
        ? [
            {
              id: nextItemId.current++,
              x: pos.x,
              y: pos.y,
              vy: 0,
              type: ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)],
            },
          ]
        : [],
    )
    const allItems = [...fallenItems, ...spawnedItems]

    const playerRect = {
      left: playerXRef.current - PLAYER_WIDTH / 2,
      top: PLAYER_Y,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
    }

    const { pickedUp, remaining } = resolveItemPickups(playerRect, allItems)
    setItems(remaining)

    if (pickedUp.length > 0) {
      pickedUp.forEach((item) => {
        applyItemEffect(item.type)

        const pickupEffectId = nextPickupEffectId.current++
        setPickupEffects((current) => [
          ...current,
          { id: pickupEffectId, x: item.x, y: item.y, label: ITEM_LABELS[item.type] },
        ])
        const pickupTimeoutId = setTimeout(() => {
          setPickupEffects((current) => current.filter((effect) => effect.id !== pickupEffectId))
          pickupEffectTimeouts.current.delete(pickupTimeoutId)
        }, ITEM_PICKUP_EFFECT_DURATION_MS)
        pickupEffectTimeouts.current.add(pickupTimeoutId)
      })
    }

    // 아이템 무적 잔여시간 감소
    if (itemInvincibleMsRef.current > 0) {
      itemInvincibleMsRef.current = Math.max(0, itemInvincibleMsRef.current - deltaMs)
      setItemInvincibleMs(itemInvincibleMsRef.current)
    }

    const isImmune = isInvincibleRef.current || itemInvincibleMsRef.current > 0

    if (!isImmune && !isGameOverRef.current) {
      const hitBubble = findBubbleHittingPlayer(playerRect, nextBubbles)

      if (hitBubble) {
        setLives((current) => {
          const next = current - 1
          if (next <= 0) setIsGameOver(true)
          return next
        })

        const hitEffectId = nextHitEffectId.current++
        setHitEffects((current) => [
          ...current,
          { id: hitEffectId, x: playerXRef.current, y: PLAYER_Y + PLAYER_HEIGHT / 2 },
        ])
        const hitEffectTimeoutId = setTimeout(() => {
          setHitEffects((current) => current.filter((effect) => effect.id !== hitEffectId))
          hitEffectTimeouts.current.delete(hitEffectTimeoutId)
        }, HIT_EFFECT_DURATION_MS)
        hitEffectTimeouts.current.add(hitEffectTimeoutId)

        setIsInvincible(true)
        isInvincibleRef.current = true
        clearTimeout(invincibleTimeoutRef.current)
        invincibleTimeoutRef.current = setTimeout(() => {
          setIsInvincible(false)
          isInvincibleRef.current = false
        }, INVINCIBILITY_DURATION_MS)
      }
    }
  })

  const lifeRatio = Math.max(lives, 0) / INITIAL_LIVES
  const isShielded = itemInvincibleMs > 0

  return (
    <div className="mission1-screen">
      <h2>Mission 1</h2>
      <div
        className="game-stage"
        style={
          {
            '--game-width': `${GAME_WIDTH}px`,
            '--game-height': `${GAME_HEIGHT}px`,
          } as CSSProperties
        }
      >
        <div className="game-area">
          {bubbles.map((bubble) => (
            <BubbleView key={bubble.id} x={bubble.x} y={bubble.y} size={bubble.size} />
          ))}
          {items.map((item) => (
            <ItemView key={item.id} x={item.x} y={item.y} type={item.type} />
          ))}
          {wires.map((wire) => (
            <Wire key={wire.id} x={wire.x} y={wire.y} />
          ))}
          <Player x={playerX} isInvincible={isInvincible} isShielded={isShielded} />
          {isShielded && (
            <InvincibilityBar
              x={playerX}
              y={PLAYER_Y - 14}
              ratio={itemInvincibleMs / ITEM_INVINCIBILITY_DURATION_MS}
            />
          )}
          {flashes.map((flash) => (
            <MuzzleFlash key={flash.id} x={flash.x} y={flash.y} />
          ))}
          {hitEffects.map((effect) => (
            <HitEffect key={effect.id} x={effect.x} y={effect.y} />
          ))}
          {pickupEffects.map((effect) => (
            <ItemPickupEffect key={effect.id} x={effect.x} y={effect.y} label={effect.label} />
          ))}
          {isCleared && (
            <div className="clear-overlay">
              <p>STAGE CLEAR</p>
            </div>
          )}
          {isGameOver && (
            <div className="game-over-overlay">
              <p>GAME OVER</p>
            </div>
          )}
        </div>
        <div className="health-bar">
          <div className="health-bar__track">
            <div className="health-bar__mask" style={{ height: `${(1 - lifeRatio) * 100}%` }} />
          </div>
          <span className="health-bar__label">{Math.max(lives, 0)}</span>
        </div>
      </div>
    </div>
  )
}

export default Mission1Screen
