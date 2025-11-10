// Lightweight weather service with a fallback mock.
// It's written to attempt a real fetch if a Vite env var VITE_WEATHER_API_KEY is provided,
// otherwise it returns a realistic mock. The app can use this module and call the
// exported functions; no API key is required for the mock path.

const MOCKS = {
  warm: { tempC: 24, description: 'Sunny', location: 'Local' },
  cool: { tempC: 12, description: 'Cloudy', location: 'Local' },
}

async function fetchOpenWeather(lat, lon) {
  const key = import.meta.env.VITE_WEATHER_API_KEY
  if (!key) throw new Error('No WEATHER API key configured')
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Weather fetch failed')
  const data = await res.json()
  return {
    tempC: Math.round(data.main.temp),
    description: data.weather && data.weather[0] && data.weather[0].description,
    raw: data,
  }
}

export async function getWeather({ lat, lon } = {}) {
  // Try real API when key present, otherwise use a mock based on coordinates (if any)
  try {
    if (lat != null && lon != null && import.meta.env.VITE_WEATHER_API_KEY) {
      return await fetchOpenWeather(lat, lon)
    }
  } catch (e) {
    // fall through to mock
    // console.warn('Real weather failed:', e)
  }

  // Provide a mock based on small heuristic so recommendations differ
  if (lat && lat % 2 === 0) return MOCKS.cool
  return MOCKS.warm
}

export function formatTemperature(t) {
  if (t == null) return '--'
  return `${t}°C`
}
