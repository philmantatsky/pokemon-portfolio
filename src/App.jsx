import { useState } from 'react'
import StartScreen from './components/StartScreen'
import StarterSelection from './components/StarterSelection'
import Battle from './components/Battle'
import Portfolio from './components/Portfolio'

export default function App() {
  const [screen, setScreen] = useState('start')
  const [starter, setStarter] = useState(null)

  if (screen === 'start') {
    return <StartScreen onStart={() => setScreen('select')} />
  }

  if (screen === 'select') {
    return (
      <StarterSelection
        onSelect={(chosen) => {
          setStarter(chosen)
          setScreen('battle')
        }}
        onSkip={() => setScreen('portfolio')}
        starter={starter}
      />
    )
  }

  if (screen === 'battle') {
    return <Battle starter={starter} onFinish={() => setScreen('portfolio')} />
  }

  if (screen === 'portfolio') {
    return <Portfolio onExit={() => setScreen('start')} />
  }

  return null
}
