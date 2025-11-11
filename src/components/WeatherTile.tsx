import { useEffect, useState } from 'react';
import { getWeather, WeatherData } from '@/lib/weather';
import { Cloud, CloudRain, Sun } from 'lucide-react';
import { Card } from '@/components/ui/card';

export const WeatherTile = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWeather()
      .then(setWeather)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !weather) {
    return (
      <Card className="p-4 bg-muted">
        <div className="animate-pulse space-y-2">
          <div className="h-8 w-8 rounded bg-muted-foreground/20" />
          <div className="h-4 w-20 rounded bg-muted-foreground/20" />
        </div>
      </Card>
    );
  }

  const WeatherIcon = weather.description.includes('rain') ? CloudRain : 
                      weather.description.includes('cloud') ? Cloud : Sun;

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10">
      <div className="flex items-center gap-3">
        <WeatherIcon className="h-10 w-10 text-primary" />
        <div>
          <div className="text-2xl font-bold">{weather.temp}°F</div>
          <div className="text-sm text-muted-foreground capitalize">{weather.description}</div>
        </div>
      </div>
    </Card>
  );
};
