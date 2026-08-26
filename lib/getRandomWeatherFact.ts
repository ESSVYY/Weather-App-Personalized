import { weatherFacts, type WeatherFact } from "@/lib/weatherFacts";

export function getRandomWeatherFact(previousFactId?: string): WeatherFact {
  const available = weatherFacts.length > 1
    ? weatherFacts.filter((fact) => fact.id !== previousFactId)
    : weatherFacts;
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return available[values[0] % available.length];
}
