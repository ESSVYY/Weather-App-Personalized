import { weatherDescription, weatherKind } from "@/lib/weatherCodes";
import type { WeatherDay, WeatherHour } from "@/types/weather";

export type IntelligenceMetric = { label: string; value: number; display: string; note?: string };
export type TrendMetric = { label: string; direction: "rising" | "falling" | "stable"; change: number; unit: string };
export type WeatherPreferences = { temperature: number; rain: number; wind: number; humidity: number; uv: number };

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const deltaMean = (hours: WeatherHour[], key: keyof WeatherHour) => {
  const width = Math.max(2, Math.floor(hours.length / 4));
  const first = mean(hours.slice(0, width).map((hour) => Number(hour[key])));
  const last = mean(hours.slice(-width).map((hour) => Number(hour[key])));
  return last - first;
};
const trend = (change: number, threshold: number): TrendMetric["direction"] => change > threshold ? "rising" : change < -threshold ? "falling" : "stable";
const formatHour = (iso: string) => new Intl.DateTimeFormat("en-NZ", { hour: "numeric" }).format(new Date(iso));

function daylightHours(day: WeatherDay) {
  return Math.max(0, (new Date(day.sunset).getTime() - new Date(day.sunrise).getTime()) / 3_600_000);
}

export function deriveWeatherIntelligence(day: WeatherDay, tomorrow?: WeatherDay) {
  const hours = day.hours;
  const temperatures = hours.map(({ temperature }) => temperature);
  const rain = hours.map(({ precipitationProbability }) => precipitationProbability);
  const wind = hours.map(({ windSpeed }) => windSpeed);
  const humidity = hours.map((hour) => hour.humidity);
  const cloud = hours.map(({ cloudCover }) => cloudCover);
  const visibility = mean(hours.map((hour) => hour.visibility / 1000));
  const range = day.temperatureMax - day.temperatureMin;
  const wetHours = hours.filter((hour) => hour.precipitationProbability >= 40);
  const changeScore = mean(hours.slice(1).map((hour, index) => (
    Math.abs(hour.temperature - hours[index].temperature) * 5
    + Math.abs(hour.precipitationProbability - hours[index].precipitationProbability) * .35
    + Math.abs(hour.windSpeed - hours[index].windSpeed) * 1.5
  )));
  const rhythm = clamp(changeScore * 2.4);
  const kind = weatherKind(day.weatherCode);
  const dominant = weatherDescription(day.weatherCode).toLowerCase();
  const summary = day.precipitationProbability >= 65
    ? `${dominant} shapes the day, with rain most likely ${wetHours.length ? `around ${formatHour(wetHours[0].time)}` : "in passing bursts"} and a high near ${Math.round(day.temperatureMax)}°.`
    : day.windSpeed >= 28
      ? `A breezy ${dominant} day builds toward ${Math.round(day.temperatureMax)}°, with gusts reaching ${Math.round(day.windGusts)} km/h.`
      : `${dominant[0].toUpperCase()}${dominant.slice(1)} conditions carry the day from ${Math.round(day.temperatureMin)}° to ${Math.round(day.temperatureMax)}° with ${rhythm < 35 ? "a steady rhythm" : "noticeable changes"}.`;

  const dna: IntelligenceMetric[] = [
    { label: "Warmth", value: clamp((mean(temperatures) + 2) * 3.3), display: `${Math.round(mean(temperatures))}° avg` },
    { label: "Moisture", value: clamp(mean(humidity)), display: `${Math.round(mean(humidity))}%` },
    { label: "Rain", value: clamp(mean(rain)), display: `${Math.round(day.precipitationProbability)}% peak` },
    { label: "Wind", value: clamp(mean(wind) * 2.6), display: `${Math.round(mean(wind))} km/h` },
    { label: "Cloud", value: clamp(mean(cloud)), display: `${Math.round(mean(cloud))}%` },
    { label: "UV", value: clamp(day.uvIndex * 10), display: `${day.uvIndex.toFixed(1)} max` },
    { label: "Daylight", value: clamp(daylightHours(day) / 16 * 100), display: `${daylightHours(day).toFixed(1)} h` },
    { label: "Variability", value: rhythm, display: `${Math.round(rhythm)}/100` },
  ];

  const momentum: TrendMetric[] = [
    { label: "Temperature", change: deltaMean(hours, "temperature"), direction: trend(deltaMean(hours, "temperature"), 1), unit: "°" },
    { label: "Rain risk", change: deltaMean(hours, "precipitationProbability"), direction: trend(deltaMean(hours, "precipitationProbability"), 8), unit: "%" },
    { label: "Wind", change: deltaMean(hours, "windSpeed"), direction: trend(deltaMean(hours, "windSpeed"), 3), unit: " km/h" },
    { label: "Humidity", change: deltaMean(hours, "humidity"), direction: trend(deltaMean(hours, "humidity"), 5), unit: "%" },
    { label: "Cloud cover", change: deltaMean(hours, "cloudCover"), direction: trend(deltaMean(hours, "cloudCover"), 8), unit: "%" },
  ];

  const balance: IntelligenceMetric[] = [
    { label: "Dry ↔ Wet", value: clamp(mean(rain)), display: mean(rain) > 50 ? "Wet leaning" : "Dry leaning" },
    { label: "Calm ↔ Windy", value: clamp(mean(wind) * 2.7), display: mean(wind) > 22 ? "Windy" : "Mostly calm" },
    { label: "Clear ↔ Cloudy", value: clamp(mean(cloud)), display: mean(cloud) > 60 ? "Cloud-led" : "Open sky" },
    { label: "Cool ↔ Warm", value: clamp((mean(temperatures) + 2) * 3.3), display: mean(temperatures) > 20 ? "Warm" : mean(temperatures) < 13 ? "Cool" : "Temperate" },
    { label: "Comfortable ↔ Harsh", value: clamp((mean(rain) + mean(wind) * 2 + Math.max(0, day.uvIndex - 5) * 8) / 3), display: "Exposure load" },
  ];

  const periodSlices = {
    Morning: hours.filter((hour) => Number(hour.time.slice(11, 13)) >= 6 && Number(hour.time.slice(11, 13)) < 12),
    Afternoon: hours.filter((hour) => Number(hour.time.slice(11, 13)) >= 12 && Number(hour.time.slice(11, 13)) < 18),
    Evening: hours.filter((hour) => Number(hour.time.slice(11, 13)) >= 18),
  };
  const activities = [
    ["Walking", 1, 1, 1], ["Running", 1.2, 1.2, .8], ["Cycling", 1, 1.4, 1],
    ["Photography", .8, .7, .8], ["Beach", .2, .5, .6], ["Outdoor dining", .6, .7, .5],
    ["Gardening", .8, .8, .7], ["Laundry drying", .6, 1.1, .7], ["Driving", .5, .7, .8], ["Stargazing", .3, .3, 1.2],
  ].map(([name, rainWeight, windWeight, lightWeight]) => ({
    name: String(name),
    scores: Object.entries(periodSlices).map(([period, slice]) => {
      const safeSlice = slice.length ? slice : hours;
      const rainPenalty = mean(safeSlice.map((hour) => hour.precipitationProbability)) * Number(rainWeight) * .55;
      const windPenalty = mean(safeSlice.map((hour) => hour.windSpeed)) * Number(windWeight) * 1.1;
      const cloudPenalty = name === "Stargazing" ? mean(safeSlice.map((hour) => hour.cloudCover)) * Number(lightWeight) * .7 : 0;
      const comfort = 100 - Math.abs(mean(safeSlice.map((hour) => hour.temperature)) - 19) * 4;
      return { period, score: Math.round(clamp(comfort - rainPenalty - windPenalty - cloudPenalty + (name === "Beach" ? day.uvIndex * 2 : 0))) };
    }),
  }));

  const skyScore = Math.round(clamp(visibility * 2 + (100 - mean(cloud)) * .45 - mean(rain) * .25));
  const personality = kind === "rain" ? "The Silver Rain Day"
    : day.windSpeed >= 26 && mean(cloud) < 55 ? "The Bright but Breezy Day"
      : rhythm >= 58 ? "The Restless Coastal Day"
        : mean(cloud) < 35 ? "The Calm Blue Day" : "The Soft Harbour Day";
  const peakIndex = temperatures.indexOf(Math.max(...temperatures));
  const temperatureJourney = `The day warms by ${range.toFixed(1)}° from its low, reaching its peak near ${formatHour(hours[peakIndex]?.time ?? `${day.date}T15:00`)} before ${deltaMean(hours, "temperature") < 0 ? "cooling into evening" : "holding its warmth"}.`;
  const rainStructure = day.precipitation < .2 ? "Mostly dry with only a brief wet window"
    : wetHours.length <= 3 && day.precipitation >= 4 ? "Intense short rain"
      : wetHours.length <= 4 ? "Short showers"
        : wetHours.length <= 9 ? "Intermittent showers" : "Long light rain";
  const contrast = tomorrow ? [
    { label: "Temperature", today: `${Math.round(day.temperatureMax)}°`, other: `${Math.round(tomorrow.temperatureMax)}°`, note: `${tomorrow.temperatureMax - day.temperatureMax >= 0 ? "+" : ""}${(tomorrow.temperatureMax - day.temperatureMax).toFixed(1)}° tomorrow` },
    { label: "Rain risk", today: `${day.precipitationProbability}%`, other: `${tomorrow.precipitationProbability}%`, note: tomorrow.precipitationProbability > day.precipitationProbability ? "Wetter tomorrow" : "Drier tomorrow" },
    { label: "Wind", today: `${Math.round(day.windSpeed)} km/h`, other: `${Math.round(tomorrow.windSpeed)} km/h`, note: tomorrow.windSpeed > day.windSpeed ? "Windier tomorrow" : "Calmer tomorrow" },
  ] : [];

  return {
    summary, dna, momentum, balance, activities, skyScore, visibility, personality, rhythm,
    layers: [
      { label: "Sky", value: 100 - mean(cloud), display: `${Math.round(100 - mean(cloud))}% open` },
      { label: "Cloud", value: mean(cloud), display: `${Math.round(mean(cloud))}% cover` },
      { label: "Rain", value: mean(rain), display: `${Math.round(mean(rain))}% risk` },
      { label: "Wind", value: clamp(mean(wind) * 2.6), display: `${Math.round(mean(wind))} km/h` },
      { label: "Humidity", value: mean(humidity), display: `${Math.round(mean(humidity))}%` },
      { label: "Ground comfort", value: clamp(100 - mean(rain) * .6 - mean(wind)), display: "Modelled comfort" },
    ],
    temperatureJourney, rainStructure,
    windJourney: hours.filter((_, index) => index % 3 === 0).map((hour) => ({ time: formatHour(hour.time), speed: hour.windSpeed, gust: hour.windGusts, direction: hour.windDirection })),
    contrast,
  };
}

export function derivePersonalFit(day: WeatherDay, preferences: WeatherPreferences) {
  const avgTemperature = mean(day.hours.map((hour) => hour.temperature));
  const avgHumidity = mean(day.hours.map((hour) => hour.humidity));
  const components = [
    clamp(100 - Math.abs(avgTemperature - preferences.temperature) * 8),
    clamp(100 - Math.max(0, day.precipitationProbability - preferences.rain) * 1.4),
    clamp(100 - Math.max(0, day.windSpeed - preferences.wind) * 3),
    clamp(100 - Math.abs(avgHumidity - preferences.humidity) * 2),
    clamp(100 - Math.max(0, day.uvIndex - preferences.uv) * 12),
  ];
  return Math.round(mean(components));
}
