import React from 'react'
import './Landing.css'

export default function Landing({ onEnter }) {
  return (
    <div className="landing-root" role="main">
      <div className="landing-card" aria-labelledby="landing-title">
        <div className="landing-brand" aria-hidden>
          <div className="landing-logo">ST</div>
        </div>
        <h1 id="landing-title">Welcome to ShareTea POS</h1>
        <p className="landing-sub">Select your interface</p>

        <div className="landing-actions">
          <button
            className="landing-btn primary"
            onClick={onEnter}
            aria-label="Open customer interface"
          >
            Customer Interface
          </button>

          <button
            className="landing-btn secondary"
            onClick={() => alert('Other views coming soon')}
            aria-label="Other views"
          >
            Other Views
          </button>
        </div>


      </div>
    </div>
  )
}
