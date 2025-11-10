import React, { useEffect, useState, useRef } from 'react'
import './Kiosk.css'
import useWeather from './hooks/useWeather'
import { formatTemperature } from './services/weatherService'

const MENU_ITEMS = [
  { id: 'classic-milk-tea', name: 'Classic Milk Tea', price: '$3.50' },
  { id: 'taro-milk-tea', name: 'Taro Milk Tea', price: '$4.00' },
  { id: 'pearl-milk-tea', name: 'Pearl Milk Tea', price: '$4.25' },
]

export default function Kiosk() {
  const [order, setOrder] = useState([])
  const [selected, setSelected] = useState(null)
  const [textSize, setTextSize] = useState('normal') // normal, large, xlarge
  const [translateLoaded, setTranslateLoaded] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const holdTimer = useRef(null)
  const { weather, loading: weatherLoading, error: weatherError, refresh: refreshWeather } = useWeather({ mock: false })

  useEffect(() => {
    // Gentle greeting via Web Speech API for guidance; helpful for elderly users.
    speak(
      'Welcome to the self-service kiosk. Tap any drink to select it, then confirm your order at the bottom.'
    )
    // Respect user's browser zoom; we also expose an in-app text size control.
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  function speak(text) {
    if (!('speechSynthesis' in window)) return
    const msg = new SpeechSynthesisUtterance(text)
    setSpeaking(true)
    msg.onend = () => setSpeaking(false)
    window.speechSynthesis.speak(msg)
  }

  function addToOrder(item) {
    setOrder((o) => [...o, item])
    speak(`${item.name} added to order.`)
  }

  function selectItem(item) {
    // require confirm to prevent accidental taps from tremor
    setSelected(item)
    // announce selection
    speak(`Selected ${item.name}. Please confirm.`)
  }

  function confirmSelection() {
    if (selected) {
      addToOrder(selected)
      setSelected(null)
    }
  }

  function clearOrder() {
    setOrder([])
    speak('Order cleared')
  }

  function loadGoogleTranslate() {
    if (translateLoaded) return
    // inject Google Translate element script
    window.googleTranslateElementInit = function () {
      try {
        /* global google */
        new window.google.translate.TranslateElement(
          { pageLanguage: 'en', layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE },
          'google_translate_element'
        )
      } catch (e) {
        // ignore init errors
        // console.warn(e)
      }
    }
    const s = document.createElement('script')
    s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
    s.async = true
    s.onload = () => setTranslateLoaded(true)
    document.body.appendChild(s)
  }

  // for tremors: require a long-press to auto-confirm selection
  function startHoldConfirm() {
    holdTimer.current = setTimeout(() => {
      confirmSelection()
    }, 700) // 700ms hold
  }
  function cancelHoldConfirm() {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  return (
    <div className={`kiosk-root text-${textSize}`}>
      <header className="kiosk-header" role="banner">
        <div className="kiosk-brand" aria-hidden>
          <div className="logo">ST</div>
          <h1 className="kiosk-title">ShareTea — Self Service Kiosk</h1>
        </div>
        <div className="weather-badge" aria-live="polite">
          {weatherLoading ? (
            <div className="weather-loading">Loading weather...</div>
          ) : weather ? (
            <div>
              <div className="temp">{formatTemperature(weather.tempC)}</div>
              <div className="cond">{weather.description}</div>
            </div>
          ) : (
            <div className="weather-mock">Weather unavailable</div>
          )}
          <button className="refresh-weather" onClick={refreshWeather} aria-label="Refresh weather">↻</button>
        </div>
        <div className="controls">
          <div className="text-size-controls" role="group" aria-label="Text size controls">
            <button
              className={`size-btn ${textSize === 'normal' ? 'active' : ''}`}
              onClick={() => setTextSize('normal')}
              aria-pressed={textSize === 'normal'}
            >
              A
            </button>
            <button
              className={`size-btn ${textSize === 'large' ? 'active' : ''}`}
              onClick={() => setTextSize('large')}
              aria-pressed={textSize === 'large'}
            >
              A+
            </button>
            <button
              className={`size-btn ${textSize === 'xlarge' ? 'active' : ''}`}
              onClick={() => setTextSize('xlarge')}
              aria-pressed={textSize === 'xlarge'}
            >
              A++
            </button>
          </div>

          <div className="translate-controls">
            <button
              className="translate-btn"
              onClick={loadGoogleTranslate}
              aria-label="Translate this page"
            >
              Translate
            </button>
            <div id="google_translate_element" aria-hidden={!translateLoaded}></div>
          </div>
        </div>
      </header>

      <main className="kiosk-main" role="main">
        <section className="menu" aria-label="Menu">
          {MENU_ITEMS.map((item) => (
            <article
              key={item.id}
              className={`menu-card ${selected && selected.id === item.id ? 'selected' : ''}`}
            >
              <div className="menu-card-content">
                <h2 className="menu-name">{item.name}</h2>
                <div className="menu-meta">{item.price}</div>
              </div>

              <div className="menu-actions">
                <button
                  className="select-btn"
                  onClick={() => selectItem(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') selectItem(item)
                  }}
                  aria-pressed={selected && selected.id === item.id}
                >
                  Select
                </button>
                <button
                  className="add-btn"
                  onMouseDown={startHoldConfirm}
                  onMouseUp={cancelHoldConfirm}
                  onMouseLeave={cancelHoldConfirm}
                  onTouchStart={startHoldConfirm}
                  onTouchEnd={cancelHoldConfirm}
                  onClick={() => addToOrder(item)}
                  aria-label={`Add ${item.name} to order`}
                >
                  + Add
                </button>
              </div>
            </article>
          ))}
        </section>

        <aside className="order-panel" aria-label="Order summary">
          <div className="recommendation">
            <h4>Recommended for you</h4>
            {weather ? (
              <div className="recommend-list">
                {weather.tempC <= 15 ? (
                  <div>
                    <div className="rec-title">It's cool — try a warm drink</div>
                    <ul>
                      {MENU_ITEMS.slice(0, 2).map((it) => (
                        <li key={it.id}>{it.name}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div>
                    <div className="rec-title">It's warm — try something cold</div>
                    <ul>
                      {MENU_ITEMS.slice(1).map((it) => (
                        <li key={it.id}>{it.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="rec-fallback">No recommendation available</div>
            )}
          </div>
          <h3>Order</h3>
          <ul>
            {order.length === 0 && <li className="empty">No items yet</li>}
            {order.map((it, idx) => (
              <li key={idx}>{it.name} <span className="price">{it.price}</span></li>
            ))}
          </ul>

          <div className="order-actions">
            <button className="confirm-btn" onClick={confirmSelection} disabled={!selected && order.length === 0}>
              {selected ? `Confirm ${selected.name}` : 'Checkout'}
            </button>
            <button className="clear-btn" onClick={clearOrder}>Clear</button>
          </div>
        </aside>
      </main>

      <footer className="kiosk-footer" role="contentinfo">
        <button
          className="help-btn"
          onClick={() => speak('Touch an item to select it. Use the translate button to change language. Use text size controls to increase readable text.')}
        >
          Help
        </button>
       
      </footer>
    </div>
  )
}
