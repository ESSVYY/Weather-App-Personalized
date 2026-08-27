"use client";

import type { CSSProperties } from "react";
import { CloudRain, Droplets, Wind } from "lucide-react";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { compassDirection, weatherDescription } from "@/lib/weatherCodes";
import type { WeatherDay } from "@/types/weather";

type TimelineStyle = CSSProperties & Record<`--${string}`, string | number>;

function hourOf(iso: string) { return Number(iso.slice(11, 13)); }
function formatTime(iso: string) { return new Intl.DateTimeFormat("en-NZ", { hour: "numeric", minute: "2-digit" }).format(new Date(iso)); }

function phaseFor(hour: number, sunrise: number, sunset: number) {
  if (hour < sunrise - 1) return "night";
  if (hour < sunrise + 1) return "sunrise";
  if (hour < 11) return "morning";
  if (hour < 14) return "midday";
  if (hour < sunset - 1) return "afternoon";
  if (hour < sunset + 1) return "sunset";
  if (hour < sunset + 2) return "twilight";
  return "night";
}

const skyByPhase: Record<string, string> = {
  night: "#081727", sunrise: "#cc7f73", morning: "#77b5d6", midday: "#63add8",
  afternoon: "#76afd0", sunset: "#d47768", twilight: "#3f4e72",
};

export function InteractiveDayTimeline({ day, selectedIndex, onSelect }: { day: WeatherDay; selectedIndex: number; onSelect: (index: number) => void }) {
  const hour = day.hours[selectedIndex] ?? day.hours[0];
  const clockHour = hourOf(hour.time);
  const sunriseHour = hourOf(day.sunrise);
  const sunsetHour = hourOf(day.sunset);
  const phase = phaseFor(clockHour, sunriseHour, sunsetHour);
  const daylightProgress = Math.min(1, Math.max(0, (clockHour - sunriseHour) / Math.max(1, sunsetHour - sunriseHour)));
  const isNight = phase === "night" || phase === "twilight";
  const sceneStyle: TimelineStyle = {
    "--timeline-sky": skyByPhase[phase],
    "--sun-x": `${10 + daylightProgress * 80}%`,
    "--sun-y": `${68 - Math.sin(daylightProgress * Math.PI) * 54}%`,
    "--cloud-opacity": Math.max(.08, hour.cloudCover / 100),
    "--rain-opacity": Math.min(.9, hour.precipitationProbability / 100),
    "--wind-duration": `${Math.max(5, 22 - hour.windSpeed / 2)}s`,
  };

  return (
    <section className="intelligence-card timeline-card" aria-labelledby="day-timeline-title">
      <div className="intelligence-card-head"><div><span>INTERACTIVE DAY</span><h2 id="day-timeline-title">Move through the atmosphere</h2></div><strong>{phase}</strong></div>
      <div className={`timeline-scene phase-${phase}`} style={sceneStyle} aria-label={`${formatTime(hour.time)}: ${weatherDescription(hour.weatherCode)}, ${Math.round(hour.temperature)} degrees`}>
        <div className="timeline-stars" aria-hidden>{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
        <div className={isNight ? "timeline-moon" : "timeline-sun"} aria-hidden />
        <div className="timeline-clouds" aria-hidden><i /><i /><i /></div>
        {hour.precipitationProbability >= 25 && <div className="timeline-rain" aria-hidden>{Array.from({ length: 16 }, (_, index) => <i key={index} />)}</div>}
        <div className="timeline-horizon" aria-hidden />
        <div className="timeline-reading">
          <span>{formatTime(hour.time)}</span><WeatherIcon code={hour.weatherCode} size={48} />
          <strong>{Math.round(hour.temperature)}°</strong><p>{weatherDescription(hour.weatherCode)}</p>
          <div><span><CloudRain />{hour.precipitationProbability}%</span><span><Wind />{Math.round(hour.windSpeed)} km/h {compassDirection(hour.windDirection)}</span><span><Droplets />{hour.humidity}%</span></div>
          <small>Feels like {Math.round(hour.apparentTemperature)}° · gusts {Math.round(hour.windGusts)} km/h</small>
        </div>
      </div>
      <label className="timeline-control">
        <span><b>{formatTime(day.hours[0].time)}</b><b>{formatTime(day.hours[day.hours.length - 1].time)}</b></span>
        <input type="range" min="0" max={Math.max(0, day.hours.length - 1)} value={selectedIndex} onChange={(event) => onSelect(Number(event.target.value))} aria-label="Select an hour of the day" />
        <div className="timeline-ticks" aria-hidden>{day.hours.filter((_, index) => index % 3 === 0).map((item) => <i key={item.time} />)}</div>
      </label>
    </section>
  );
}
