import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import './Mission1Screen.css'
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  MAX_WIRE_COUNT,
  MUZZLE_FLASH_DURATION_MS,
  MUZZLE_OFFSET_X,
  MUZZLE_OFFSET_Y,
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

function Mission1Screen() {
  const [playerX, setPlayerX] = useState(GAME_WIDTH / 2)
  const [wires, setWires] = useState<WireState[]>([])
  const [flashes, setFlashes] = useState<MuzzleFlashState[]>([])

  const pressedKeys = useRef(new Set<string>())
  const playerXRef = useRef(playerX)
  playerXRef.current = playerX
  const nextWireId = useRef(0)
  const nextFlashId = useRef(0)
  const flashTimeouts = useRef(new Set<ReturnType<typeof setTimeout>>())

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

    setWires((current) => {
      if (current.length === 0) return current
      return current
        .map((wire) => ({ ...wire, y: wire.y - WIRE_SPEED * deltaMs }))
        .filter((wire) => wire.y > 0)
    })
  })

  return (
    <div className="mission1-screen">
      <h2>Mission 1</h2>
      <div
        className="game-area"
        style={
          {
            '--game-width': `${GAME_WIDTH}px`,
            '--game-height': `${GAME_HEIGHT}px`,
          } as CSSProperties
        }
      >
        {wires.map((wire) => (
          <Wire key={wire.id} x={wire.x} y={wire.y} />
        ))}
        <Player x={playerX} />
        {flashes.map((flash) => (
          <MuzzleFlash key={flash.id} x={flash.x} y={flash.y} />
        ))}
      </div>
    </div>
  )
}

export default Mission1Screen
