import { useEffect, useMemo } from 'react'
import './MainScreen.css'

type MainScreenProps = {
  onStart: () => void
}

const BUBBLE_COUNT = 12

function MainScreen({ onStart }: MainScreenProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault()
        onStart()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onStart])

  const bubbles = useMemo(
    () =>
      Array.from({ length: BUBBLE_COUNT }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 20 + Math.random() * 50,
        duration: 8 + Math.random() * 10,
        delay: Math.random() * 10,
      })),
    [],
  )

  return (
    <div className="main-screen">
      <div className="bubble-field">
        {bubbles.map((b) => (
          <span
            key={b.id}
            className="floating-bubble"
            style={{
              left: `${b.left}%`,
              width: `${b.size}px`,
              height: `${b.size}px`,
              animationDuration: `${b.duration}s`,
              animationDelay: `${b.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="main-content">
        <h1 className="title">PANG</h1>
        <button type="button" className="start-button" onClick={onStart}>
          시작하기
        </button>
        <p className="controls-guide">방향키: 이동 &nbsp;/&nbsp; Space: Wire 발사</p>
      </div>
    </div>
  )
}

export default MainScreen
