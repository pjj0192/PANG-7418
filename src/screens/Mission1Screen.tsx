import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import './Mission1Screen.css'
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  HIT_EFFECT_DURATION_MS,
  INITIAL_LIVES,
  INVINCIBILITY_DURATION_MS,
  MAX_WIRE_COUNT,
  MUZZLE_FLASH_DURATION_MS,
  MUZZLE_OFFSET_X,
  MUZZLE_OFFSET_Y,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  PLAYER_WIDTH,
  PLAYER_Y,
  WIRE_SPAWN_OFFSET_Y,
  WIRE_SPEED,
} from '../game/constants'
import { useGameLoop } from '../game/useGameLoop'
import Player from '../game/Player'
import Wire from '../game/Wire'
import MuzzleFlash from '../game/MuzzleFlash'
import HitEffect from '../game/HitEffect'
import BubbleView from '../game/Bubble'
import { stepBubble } from '../game/bubblePhysics'
import type { Bubble } from '../game/bubblePhysics'
import { findBubbleHittingPlayer, resolveWireBubbleCollisions } from '../game/collision'

type WireState = {
  id: number
  x: number
  y: number
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

  const pressedKeys = useRef(new Set<string>())
  const playerXRef = useRef(playerX)
  playerXRef.current = playerX
  const wiresRef = useRef(wires)
  wiresRef.current = wires
  const bubblesRef = useRef(bubbles)
  bubblesRef.current = bubbles
  const isInvincibleRef = useRef(isInvincible)
  isInvincibleRef.current = isInvincible
  const isGameOverRef = useRef(isGameOver)
  isGameOverRef.current = isGameOver
  const nextWireId = useRef(0)
  const nextFlashId = useRef(0)
  const nextHitEffectId = useRef(0)
  const nextBubbleId = useRef(INITIAL_BUBBLES.length)
  const flashTimeouts = useRef(new Set<ReturnType<typeof setTimeout>>())
  const hitEffectTimeouts = useRef(new Set<ReturnType<typeof setTimeout>>())
  const invincibleTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const fireWire = () => {
    setWires((current) => {
      if (current.length >= MAX_WIRE_COUNT) return current
      const wire: WireState = {
        id: nextWireId.current++,
        x: playerXRef.current,
        y: PLAYER_Y - WIRE_SPAWN_OFFSET_Y,
      }
      return [...current, wire]
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
      .map((wire) => ({ ...wire, y: wire.y - WIRE_SPEED * deltaMs }))
      .filter((wire) => wire.y > 0)
    const movedBubbles = bubblesRef.current.map((bubble) => stepBubble(bubble, deltaMs))

    const { wires: nextWires, bubbles: nextBubbles } = resolveWireBubbleCollisions(
      movedWires,
      movedBubbles,
      () => nextBubbleId.current++,
    )

    setWires(nextWires)
    setBubbles(nextBubbles)

    if (nextBubbles.length === 0) {
      setIsCleared(true)
    }

    if (!isInvincibleRef.current && !isGameOverRef.current) {
      const playerRect = {
        left: playerXRef.current - PLAYER_WIDTH / 2,
        top: PLAYER_Y,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
      }
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
          {wires.map((wire) => (
            <Wire key={wire.id} x={wire.x} y={wire.y} />
          ))}
          <Player x={playerX} isInvincible={isInvincible} />
          {flashes.map((flash) => (
            <MuzzleFlash key={flash.id} x={flash.x} y={flash.y} />
          ))}
          {hitEffects.map((effect) => (
            <HitEffect key={effect.id} x={effect.x} y={effect.y} />
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
