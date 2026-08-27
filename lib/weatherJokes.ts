import type { GreetingTheme } from "@/lib/greetingThemes";

export type WeatherJoke = { id: string; text: string; themes?: GreetingTheme[] };

export const weatherJokes: WeatherJoke[] = [
  { id: "forecast-mind", text: "Auckland weather checked the forecast—then changed its mind." },
  { id: "four-seasons", text: "Four seasons today. The fifth is waiting near the harbour." },
  { id: "umbrella", text: "The umbrella is less an accessory and more a trusted colleague.", themes: ["rain", "cloudy"] },
  { id: "cloud-meeting", text: "The clouds have called another meeting over the Waitematā.", themes: ["cloudy", "rain"] },
  { id: "breeze", text: "Auckland’s breeze has arrived with several strong opinions.", themes: ["wind"] },
  { id: "sunset", text: "The sky is signing off with unusually good stationery.", themes: ["sunset"] },
  { id: "night-shift", text: "The city is quiet; the clouds are covering the night shift.", themes: ["night"] },
  { id: "bright-window", text: "The sunshine found a gap in the calendar.", themes: ["clear"] },
];

export function chooseWeatherJoke(theme: GreetingTheme, previousId?: string) {
  const themed = weatherJokes.filter((joke) => !joke.themes || joke.themes.includes(theme));
  const available = (themed.length > 1 ? themed.filter(({ id }) => id !== previousId) : themed);
  if (available.length === 0) return weatherJokes[0];
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return available[values[0] % available.length];
}
