import { useState } from 'react'
import './App.css'
import MainScreen from './screens/MainScreen'
import Mission1Screen from './screens/Mission1Screen'

type Screen = 'main' | 'mission1'

function App() {
  const [screen, setScreen] = useState<Screen>('main')

  return (
    <div className="app-screen">
      {screen === 'mission1' ? (
        <Mission1Screen />
      ) : (
        <MainScreen onStart={() => setScreen('mission1')} />
      )}
    </div>
  )
}

export default App
