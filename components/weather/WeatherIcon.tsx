import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Moon, Sun } from "lucide-react";
import { weatherKind } from "@/lib/weatherCodes";

export function WeatherIcon({ code, isDay = true, size = 28 }: { code: number; isDay?: boolean; size?: number }) {
  const kind = weatherKind(code);
  const props = { size, strokeWidth: 1.55, "aria-hidden": true as const };
  if (kind === "clear") return isDay ? <Sun {...props} className="weather-icon sun-icon" /> : <Moon {...props} className="weather-icon moon-icon" />;
  if (kind === "partly-cloudy") return isDay ? <CloudSun {...props} className="weather-icon cloud-icon" /> : <Cloud {...props} className="weather-icon cloud-icon" />;
  if (kind === "fog") return <CloudFog {...props} className="weather-icon cloud-icon" />;
  if (kind === "rain") return <CloudRain {...props} className="weather-icon rain-icon" />;
  if (kind === "storm") return <CloudLightning {...props} className="weather-icon storm-icon" />;
  if (kind === "snow") return <CloudSnow {...props} className="weather-icon snow-icon" />;
  return <Cloud {...props} className="weather-icon cloud-icon" />;
}
