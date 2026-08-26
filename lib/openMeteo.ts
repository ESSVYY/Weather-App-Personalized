import type { Location, WeatherData, WeatherDay, WeatherHour } from "@/types/weather";

type CurrentRaw = Record<"temperature_2m" | "apparent_temperature" | "relative_humidity_2m" | "precipitation" | "rain" | "weather_code" | "cloud_cover" | "wind_speed_10m" | "wind_direction_10m" | "wind_gusts_10m" | "is_day", number> & { time: string };

type ForecastRaw = {
  timezone: string;
  current: CurrentRaw;
  hourly: Record<string, number[] | string[]> & { time: string[] };
  daily: Record<string, number[] | string[]> & { time: string[]; sunrise: string[]; sunset: string[] };
};

const currentFields = "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day";
const hourlyFields = "temperature_2m,apparent_temperature,precipitation_probability,precipitation,rain,weather_code,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,relative_humidity_2m,uv_index";
const dailyFields = "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,rain_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant";

const nums = (record: ForecastRaw["hourly"] | ForecastRaw["daily"], key: string) => record[key] as number[];

export async function fetchWeather(location: Location, signal?: AbortSignal): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(location.latitude), longitude: String(location.longitude), current: currentFields,
    hourly: hourlyFields, daily: dailyFields, timezone: "auto", forecast_days: "8",
    temperature_unit: "celsius", wind_speed_unit: "kmh", precipitation_unit: "mm",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
  if (!response.ok) throw new Error("Weather service is unavailable");
  const raw = await response.json() as ForecastRaw;

  const hours: WeatherHour[] = raw.hourly.time.map((time, index) => ({
    time,
    temperature: nums(raw.hourly, "temperature_2m")[index],
    apparentTemperature: nums(raw.hourly, "apparent_temperature")[index],
    precipitationProbability: nums(raw.hourly, "precipitation_probability")[index],
    precipitation: nums(raw.hourly, "precipitation")[index],
    rain: nums(raw.hourly, "rain")[index],
    weatherCode: nums(raw.hourly, "weather_code")[index],
    cloudCover: nums(raw.hourly, "cloud_cover")[index],
    visibility: nums(raw.hourly, "visibility")[index],
    windSpeed: nums(raw.hourly, "wind_speed_10m")[index],
    windDirection: nums(raw.hourly, "wind_direction_10m")[index],
    windGusts: nums(raw.hourly, "wind_gusts_10m")[index],
    humidity: nums(raw.hourly, "relative_humidity_2m")[index],
    uvIndex: nums(raw.hourly, "uv_index")[index],
  }));

  const days: WeatherDay[] = raw.daily.time.map((date, index) => ({
    date,
    weatherCode: nums(raw.daily, "weather_code")[index],
    temperatureMax: nums(raw.daily, "temperature_2m_max")[index],
    temperatureMin: nums(raw.daily, "temperature_2m_min")[index],
    apparentMax: nums(raw.daily, "apparent_temperature_max")[index],
    apparentMin: nums(raw.daily, "apparent_temperature_min")[index],
    sunrise: raw.daily.sunrise[index], sunset: raw.daily.sunset[index],
    uvIndex: nums(raw.daily, "uv_index_max")[index],
    precipitation: nums(raw.daily, "precipitation_sum")[index],
    rain: nums(raw.daily, "rain_sum")[index],
    precipitationProbability: nums(raw.daily, "precipitation_probability_max")[index],
    windSpeed: nums(raw.daily, "wind_speed_10m_max")[index],
    windGusts: nums(raw.daily, "wind_gusts_10m_max")[index],
    windDirection: nums(raw.daily, "wind_direction_10m_dominant")[index],
    hours: hours.filter((hour) => hour.time.startsWith(date)),
  }));

  return {
    location: { ...location, timezone: raw.timezone }, timezone: raw.timezone,
    updatedAt: new Date().toISOString(), days,
    current: {
      time: raw.current.time, temperature: raw.current.temperature_2m,
      apparentTemperature: raw.current.apparent_temperature, humidity: raw.current.relative_humidity_2m,
      precipitation: raw.current.precipitation, rain: raw.current.rain, weatherCode: raw.current.weather_code,
      cloudCover: raw.current.cloud_cover, windSpeed: raw.current.wind_speed_10m,
      windDirection: raw.current.wind_direction_10m, windGusts: raw.current.wind_gusts_10m,
      isDay: Boolean(raw.current.is_day),
    },
  };
}

export async function searchLocations(query: string, signal?: AbortSignal): Promise<Location[]> {
  const params = new URLSearchParams({ name: query, count: "6", language: "en", format: "json" });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal });
  if (!response.ok) throw new Error("Location search failed");
  const data = await response.json() as { results?: Array<{ name: string; country: string; latitude: number; longitude: number; timezone?: string; admin1?: string }> };
  return (data.results ?? []).map((item) => ({
    name: item.admin1 && item.admin1 !== item.name ? `${item.name}, ${item.admin1}` : item.name,
    country: item.country, latitude: item.latitude, longitude: item.longitude, timezone: item.timezone,
  }));
}
