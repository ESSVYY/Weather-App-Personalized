import { weatherKind } from "@/lib/weatherCodes";
import type { WeatherData } from "@/types/weather";

export type GreetingTheme = "clear" | "cloudy" | "rain" | "wind" | "sunset" | "night";

export const greetingThemeGradients: Record<GreetingTheme, string> = {
  clear: "linear-gradient(115deg, #0757c7 0%, #1687e8 55%, #59c3f0 100%)",
  cloudy: "linear-gradient(115deg, #34536f 0%, #5f778d 55%, #8294a4 100%)",
  rain: "linear-gradient(115deg, #183b66 0%, #2d638e 55%, #66869d 100%)",
  wind: "linear-gradient(115deg, #405a70 0%, #607d92 55%, #92a8b6 100%)",
  sunset: "linear-gradient(115deg, #384cb7 0%, #725bc7 58%, #e68a67 100%)",
  night: "linear-gradient(115deg, #7592e8 0%, #a6b8f5 55%, #d3dbf7 100%)",
};

export function getLocalHour(timezone = "Pacific/Auckland"): number {
  const hour = new Intl.DateTimeFormat("en-NZ", {
    hour: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).formatToParts(new Date()).find((part) => part.type === "hour")?.value;
  return Number(hour ?? 12) % 24;
}

export function getGreeting(hour: number): string {
  if (hour < 6) return "Still awake?";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Hello";
  if (hour < 22) return "Good evening";
  return "Still awake?";
}

export function getGreetingTheme(data: WeatherData | null): GreetingTheme {
  if (!data) return "clear";
  const hour = getLocalHour(data.timezone);
  if (!data.current.isDay || hour >= 21 || hour < 6) return "night";
  if (hour >= 17 && hour < 21) return "sunset";
  if (data.current.windSpeed >= 30) return "wind";
  const kind = weatherKind(data.current.weatherCode);
  if (kind === "rain" || kind === "storm" || kind === "snow") return "rain";
  if (kind === "cloudy" || kind === "partly-cloudy" || kind === "fog") return "cloudy";
  return "clear";
}

export function getWeatherGreeting(data: WeatherData | null, failed = false): string {
  if (failed) return "I couldn’t update the weather just yet.";
  if (!data) return "Let me check the weather for you.";
  const theme = getGreetingTheme(data);
  if (theme === "night") return "Here’s what tonight looks like.";
  if (data.current.temperature < 10 || data.current.apparentTemperature < 8) return "It feels chilly outside today.";
  if (theme === "rain") return "You may want to take an umbrella.";
  if (theme === "wind") return "It’s a little breezy outside.";
  if (theme === "cloudy") return "Let’s see what the clouds are bringing.";
  if (data.current.temperature >= 22) return "It looks bright outside today.";
  if (theme === "sunset") return "Let’s see what tonight looks like.";
  return "Clear skies are waiting for you.";
}
