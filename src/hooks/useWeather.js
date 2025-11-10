import { useEffect, useState, useCallback } from 'react'
import { getWeather } from '../services/weatherService'

// Minimal hook to provide weather to components. It tries geolocation, falls back to mock.
export default function useWeather(opts = { mock: false }) {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchWeather = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (opts.mock) {
        const w = await getWeather()
        setWeather(w)
        setLoading(false)
        return
      }

      // Try browser geolocation first
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const w = await getWeather({ lat: pos.coords.latitude, lon: pos.coords.longitude })
            setWeather(w)
            setLoading(false)
          },
          async () => {
            // If geolocation fails, use mock fallback
            const w = await getWeather()
            setWeather(w)
            setLoading(false)
          },
          { timeout: 5000 }
        )
      } else {
        const w = await getWeather()
        setWeather(w)
        setLoading(false)
      }
    } catch (e) {
      setError(e.message || String(e))
      setLoading(false)
    }
  }, [opts.mock])

  useEffect(() => {
    fetchWeather()
  }, [fetchWeather])

  return { weather, loading, error, refresh: fetchWeather }
}
