import { useEffect, useRef } from 'react'

export function useGameLoop(onTick: (deltaMs: number) => void) {
  const onTickRef = useRef(onTick)
  onTickRef.current = onTick

  useEffect(() => {
    let rafId: number
    let lastTime: number | null = null

    const loop = (time: number) => {
      if (lastTime !== null) onTickRef.current(time - lastTime)
      lastTime = time
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [])
}
