const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

export interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  location: string;
}

export async function getWeather(lat: number = 37.7749, lon: number = -122.4194): Promise<WeatherData> {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${OPENWEATHER_API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch weather');
  
  const data = await response.json();
  
  return {
    temp: Math.round(data.main.temp),
    description: data.weather[0].description,
    icon: data.weather[0].icon,
    location: data.name,
  };
}
