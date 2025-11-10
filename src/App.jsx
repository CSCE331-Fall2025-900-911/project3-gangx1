import './App.css'
import Kiosk from './Kiosk'
import Landing from './Landing'
import { useState } from 'react'

function App() {
  // Show a simple landing page first. The Landing button switches to the customer kiosk view.
  const [view, setView] = useState('landing') // 'landing' | 'kiosk'

  if (view === 'kiosk') return <Kiosk />

  return <Landing onEnter={() => setView('kiosk')} />
}

export default App

