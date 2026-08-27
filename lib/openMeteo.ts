import type { Location, WeatherData, WeatherDay, WeatherHour } from "@/types/weather";

type CurrentRaw = Record<string, unknown> & { time: string };

type ForecastRaw = {
  timezone: string;
  current: CurrentRaw;
  hourly: Record<string, unknown> & { time: string[] };
  daily: Record<string, unknown> & { time: string[]; sunrise?: string[]; sunset?: string[] };
};

const currentFields = "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day";
const hourlyFields = "temperature_2m,apparent_temperature,precipitation_probability,precipitation,rain,weather_code,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,relative_humidity_2m,uv_index";
const dailyFields = "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,rain_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant";

function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const externalSignal = init.signal;
  const forwardAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) forwardAbort();
  else externalSignal?.addEventListener("abort", forwardAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(new DOMException("Weather request timed out", "TimeoutError")), timeoutMs);

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", forwardAbort);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isForecastRaw(value: unknown): value is ForecastRaw {
  if (!isRecord(value) || typeof value.timezone !== "string" || !isRecord(value.current) || !isRecord(value.hourly) || !isRecord(value.daily)) return false;
  return typeof value.current.time === "string"
    && typeof value.current.temperature_2m === "number" && Number.isFinite(value.current.temperature_2m)
    && Array.isArray(value.hourly.time) && value.hourly.time.length > 0
    && value.hourly.time.every((time) => typeof time === "string")
    && Array.isArray(value.hourly.temperature_2m) && value.hourly.temperature_2m.length === value.hourly.time.length
    && Array.isArray(value.daily.time) && value.daily.time.length > 0
    && value.daily.time.every((time) => typeof time === "string")
    && Array.isArray(value.daily.temperature_2m_max) && value.daily.temperature_2m_max.length === value.daily.time.length
    && Array.isArray(value.daily.temperature_2m_min) && value.daily.temperature_2m_min.length === value.daily.time.length;
}

const numberValue = (record: Record<string, unknown>, key: string, fallback = 0) => {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const numberAt = (record: Record<string, unknown>, key: string, index: number, fallback = 0) => {
  const values = record[key];
  return Array.isArray(values) && typeof values[index] === "number" && Number.isFinite(values[index]) ? values[index] : fallback;
};

const stringAt = (record: Record<string, unknown>, key: string, index: number, fallback: string) => {
  const values = record[key];
  return Array.isArray(values) && typeof values[index] === "string" ? values[index] : fallback;
};

export async function fetchWeather(location: Location, signal?: AbortSignal): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(location.latitude), longitude: String(location.longitude), current: currentFields,
    hourly: hourlyFields, daily: dailyFields, timezone: "auto", forecast_days: "8",
    temperature_unit: "celsius", wind_speed_unit: "kmh", precipitation_unit: "mm",
  });
  const response = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?${params}`, { signal }, 10_000);
  if (!response.ok) throw new Error(`Weather request failed with status ${response.status}`);
  const payload: unknown = await response.json();
  if (!isForecastRaw(payload)) throw new Error("Weather response was incomplete");
  const raw = payload;

  const hours: WeatherHour[] = raw.hourly.time.map((time, index) => ({
    time,
    temperature: numberAt(raw.hourly, "temperature_2m", index),
    apparentTemperature: numberAt(raw.hourly, "apparent_temperature", index, numberAt(raw.hourly, "temperature_2m", index)),
    precipitationProbability: numberAt(raw.hourly, "precipitation_probability", index),
    precipitation: numberAt(raw.hourly, "precipitation", index),
    rain: numberAt(raw.hourly, "rain", index),
    weatherCode: numberAt(raw.hourly, "weather_code", index),
    cloudCover: numberAt(raw.hourly, "cloud_cover", index),
    visibility: numberAt(raw.hourly, "visibility", index, 10_000),
    windSpeed: numberAt(raw.hourly, "wind_speed_10m", index),
    windDirection: numberAt(raw.hourly, "wind_direction_10m", index),
    windGusts: numberAt(raw.hourly, "wind_gusts_10m", index),
    humidity: numberAt(raw.hourly, "relative_humidity_2m", index),
    uvIndex: numberAt(raw.hourly, "uv_index", index),
  }));

  const days: WeatherDay[] = raw.daily.time.map((date, index) => ({
    date,
    weatherCode: numberAt(raw.daily, "weather_code", index),
    temperatureMax: numberAt(raw.daily, "temperature_2m_max", index),
    temperatureMin: numberAt(raw.daily, "temperature_2m_min", index),
    apparentMax: numberAt(raw.daily, "apparent_temperature_max", index, numberAt(raw.daily, "temperature_2m_max", index)),
    apparentMin: numberAt(raw.daily, "apparent_temperature_min", index, numberAt(raw.daily, "temperature_2m_min", index)),
    sunrise: stringAt(raw.daily, "sunrise", index, `${date}T06:00`), sunset: stringAt(raw.daily, "sunset", index, `${date}T18:00`),
    uvIndex: numberAt(raw.daily, "uv_index_max", index),
    precipitation: numberAt(raw.daily, "precipitation_sum", index),
    rain: numberAt(raw.daily, "rain_sum", index),
    precipitationProbability: numberAt(raw.daily, "precipitation_probability_max", index),
    windSpeed: numberAt(raw.daily, "wind_speed_10m_max", index),
    windGusts: numberAt(raw.daily, "wind_gusts_10m_max", index),
    windDirection: numberAt(raw.daily, "wind_direction_10m_dominant", index),
    hours: hours.filter((hour) => hour.time.startsWith(date)),
  }));

  return {
    location: { ...location, timezone: raw.timezone }, timezone: raw.timezone,
    updatedAt: new Date().toISOString(), days,
    current: {
      time: raw.current.time, temperature: numberValue(raw.current, "temperature_2m"),
      apparentTemperature: numberValue(raw.current, "apparent_temperature", numberValue(raw.current, "temperature_2m")), humidity: numberValue(raw.current, "relative_humidity_2m"),
      precipitation: numberValue(raw.current, "precipitation"), rain: numberValue(raw.current, "rain"), weatherCode: numberValue(raw.current, "weather_code"),
      cloudCover: numberValue(raw.current, "cloud_cover"), windSpeed: numberValue(raw.current, "wind_speed_10m"),
      windDirection: numberValue(raw.current, "wind_direction_10m"), windGusts: numberValue(raw.current, "wind_gusts_10m"),
      isDay: Boolean(numberValue(raw.current, "is_day")),
    },
  };
}

export async function searchLocations(query: string, signal?: AbortSignal): Promise<Location[]> {
  const params = new URLSearchParams({ name: query, count: "6", language: "en", format: "json" });
  const response = await fetchWithTimeout(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal }, 8_000);
  if (!response.ok) throw new Error("Location search failed");
  const data = await response.json() as { results?: Array<{ name: string; country: string; latitude: number; longitude: number; timezone?: string; admin1?: string }> };
  return (data.results ?? []).map((item) => ({
    name: item.admin1 && item.admin1 !== item.name ? `${item.name}, ${item.admin1}` : item.name,
    country: item.country, latitude: item.latitude, longitude: item.longitude, timezone: item.timezone,
  }));
}

export async function fetchMicroclimateWeather(location: Location, signal?: AbortSignal) {
  const params = new URLSearchParams({
    latitude: String(location.latitude), longitude: String(location.longitude),
    current: "temperature_2m,weather_code,wind_speed_10m",
    daily: "precipitation_probability_max", timezone: "auto", forecast_days: "1", wind_speed_unit: "kmh",
  });
  const response = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?${params}`, { signal }, 8_000);
  if (!response.ok) throw new Error("Microclimate forecast is unavailable");
  const raw = await response.json() as {
    current: { temperature_2m: number; weather_code: number; wind_speed_10m: number };
    daily: { precipitation_probability_max: number[] };
  };
  return {
    name: location.name, temperature: raw.current.temperature_2m,
    rain: raw.daily.precipitation_probability_max[0] ?? 0,
    wind: raw.current.wind_speed_10m, weatherCode: raw.current.weather_code,
  };
}
