export type Location = {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

export type WeatherHour = {
  time: string;
  temperature: number;
  apparentTemperature: number;
  precipitationProbability: number;
  precipitation: number;
  rain: number;
  weatherCode: number;
  cloudCover: number;
  visibility: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  humidity: number;
  uvIndex: number;
};

export type WeatherDay = {
  date: string;
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
  apparentMax: number;
  apparentMin: number;
  sunrise: string;
  sunset: string;
  uvIndex: number;
  precipitation: number;
  rain: number;
  precipitationProbability: number;
  windSpeed: number;
  windGusts: number;
  windDirection: number;
  hours: WeatherHour[];
};

export type CurrentWeather = {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  rain: number;
  weatherCode: number;
  cloudCover: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  isDay: boolean;
};

export type WeatherData = {
  location: Location;
  timezone: string;
  updatedAt: string;
  current: CurrentWeather;
  days: WeatherDay[];
};

export type QualityMode = "auto" | "high" | "balanced" | "battery";
