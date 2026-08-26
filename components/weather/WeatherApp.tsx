"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue } from "motion/react";
import { CloudRain, Compass, Droplets, LocateFixed, MapPin, Navigation, RefreshCw, Search, Settings, Sunrise, Sunset, Wind, X, Zap } from "lucide-react";
import { useWeather, AUCKLAND } from "@/hooks/useWeather";
import { searchLocations } from "@/lib/openMeteo";
import { compassDirection, weatherDescription } from "@/lib/weatherCodes";
import type { Location, QualityMode, WeatherData, WeatherDay } from "@/types/weather";
import { WeatherIcon } from "./WeatherIcon";
import { WeatherScene } from "./WeatherScene";
import { TemperatureGraph } from "./TemperatureGraph";

const spring = { type: "spring" as const, stiffness: 210, damping: 26, mass: .85 };
const qualityOptions: Array<{ value: QualityMode; label: string; note: string }> = [
  { value: "auto", label: "Automatic", note: "Adapts to your device" },
  { value: "high", label: "High", note: "Full atmospheric detail" },
  { value: "balanced", label: "Balanced", note: "Fewer effects" },
  { value: "battery", label: "Battery saver", note: "Mostly static scenery" },
];

function getDayPeriod(day: WeatherDay, data: WeatherData, index: number) {
  if (index === 0) return { temperature: data.current.temperature, apparent: data.current.apparentTemperature, humidity: data.current.humidity, wind: data.current.windSpeed, gusts: data.current.windGusts, direction: data.current.windDirection, code: data.current.weatherCode, isDay: data.current.isDay };
  const hour = day.hours.find((item) => item.time.endsWith("T12:00")) ?? day.hours[0];
  return { temperature: hour?.temperature ?? day.temperatureMax, apparent: hour?.apparentTemperature ?? day.apparentMax, humidity: hour?.humidity ?? 0, wind: hour?.windSpeed ?? day.windSpeed, gusts: hour?.windGusts ?? day.windGusts, direction: hour?.windDirection ?? day.windDirection, code: hour?.weatherCode ?? day.weatherCode, isDay: true };
}

function formatDay(date: string, long = false) {
  return new Intl.DateTimeFormat("en-NZ", { weekday: long ? "long" : "short", month: long ? "long" : undefined, day: long ? "numeric" : undefined }).format(new Date(`${date}T12:00:00`));
}
const formatTime = (iso: string) => new Intl.DateTimeFormat("en-NZ", { hour: "numeric", minute: "2-digit" }).format(new Date(iso));

function DayHero({ data, day, index }: { data: WeatherData; day: WeatherDay; index: number }) {
  const period = getDayPeriod(day, data, index);
  return (
    <div className="day-hero">
      <p className="day-kicker">{index === 0 ? "Right now" : formatDay(day.date, true)}</p>
      <div className="hero-condition"><WeatherIcon code={period.code} isDay={period.isDay} size={74} /></div>
      <div className="temperature" aria-label={`${Math.round(period.temperature)} degrees Celsius`}><span>{Math.round(period.temperature)}</span><sup>°</sup></div>
      <h1>{weatherDescription(period.code)}</h1>
      <p className="hero-detail">Feels like {Math.round(period.apparent)}° <span /> H:{Math.round(day.temperatureMax)}° &nbsp; L:{Math.round(day.temperatureMin)}°</p>
      <div className="metric-row">
        <div><CloudRain /><span>Rain</span><strong>{day.precipitationProbability}%</strong></div>
        <div><Wind /><span>Wind</span><strong>{Math.round(period.wind)} km/h</strong></div>
        <div><Droplets /><span>Humidity</span><strong>{Math.round(period.humidity)}%</strong></div>
        <div><Zap /><span>UV</span><strong>{Math.round(day.uvIndex)}</strong></div>
      </div>
    </div>
  );
}

function SwipeDeck({ data, index, setIndex, quality }: { data: WeatherData; index: number; setIndex: (index: number) => void; quality: QualityMode }) {
  const x = useMotionValue(0); const busy = useRef(false);
  const settle = (direction: number) => {
    if (busy.current || !direction) return;
    const target = index + direction;
    if (target < 0 || target >= data.days.length) { animate(x, 0, spring); return; }
    busy.current = true;
    animate(x, direction > 0 ? -window.innerWidth : window.innerWidth, spring).then(() => { x.set(0); setIndex(target); busy.current = false; });
  };
  return (
    <div className="swipe-viewport">
      {[-1, 0, 1].map((offset) => {
        const itemIndex = index + offset; const day = data.days[itemIndex];
        if (!day) return null;
        return <motion.section key={`${day.date}-${offset}`} className="day-slide" style={{ x, left: `${offset * 100}%` }} drag={offset === 0 ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={1} dragMomentum={false} onDragEnd={(_, info) => {
          const direction = (info.offset.x < -80 || info.velocity.x < -650) ? 1 : (info.offset.x > 80 || info.velocity.x > 650) ? -1 : 0;
          if (direction && index + direction >= 0 && index + direction < data.days.length) settle(direction); else animate(x, 0, spring);
        }}>
          <WeatherScene day={day} isDay={getDayPeriod(day, data, itemIndex).isDay} quality={quality} />
          <DayHero data={data} day={day} index={itemIndex} />
        </motion.section>;
      })}
    </div>
  );
}

function HourlyForecast({ day, currentTime }: { day: WeatherDay; currentTime: string }) {
  const [selected, setSelected] = useState(() => {
    const match = day.hours.findIndex((hour) => hour.time.slice(0, 13) === currentTime.slice(0, 13));
    return Math.max(0, match);
  });
  return <>
    <div className="hourly-strip">
      {day.hours.map((hour, hourIndex) => <button key={hour.time} className={hourIndex === selected ? "hour selected" : "hour"} onClick={() => setSelected(hourIndex)} aria-label={`${formatTime(hour.time)}, ${Math.round(hour.temperature)} degrees, ${hour.precipitationProbability} percent chance of rain`}>
        <span>{hourIndex === 0 && day.date === currentTime.slice(0, 10) ? "Now" : formatTime(hour.time).replace(":00", "")}</span>
        <WeatherIcon code={hour.weatherCode} size={24} />
        <strong>{Math.round(hour.temperature)}°</strong>
        {hour.precipitationProbability > 10 && <small>{hour.precipitationProbability}%</small>}
      </button>)}
    </div>
    <TemperatureGraph hours={day.hours} selected={selected} />
  </>;
}

function ForecastSheet({ data, selectedDay, setSelectedDay }: { data: WeatherData; selectedDay: number; setSelectedDay: (value: number) => void }) {
  const [snap, setSnap] = useState<"collapsed" | "half" | "full">("collapsed");
  const day = data.days[selectedDay]; const period = getDayPeriod(day, data, selectedDay);
  return <motion.aside className={`forecast-sheet sheet-${snap}`} drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={.12} onDragEnd={(_, info) => {
    if (info.offset.y < -80 || info.velocity.y < -500) setSnap(snap === "collapsed" ? "half" : "full");
    else if (info.offset.y > 80 || info.velocity.y > 500) setSnap(snap === "full" ? "half" : "collapsed");
  }} layout transition={spring} aria-label="Forecast details">
    <button className="sheet-handle" onClick={() => setSnap(snap === "collapsed" ? "half" : snap === "half" ? "full" : "collapsed")} aria-label={`${snap === "full" ? "Collapse" : "Expand"} forecast details`}><span /></button>
    <div className="sheet-summary">
      <div><WeatherIcon code={day.weatherCode} size={32} /><p><b>{selectedDay === 0 ? "Today" : formatDay(day.date, true)}</b><span>{weatherDescription(day.weatherCode)}</span></p></div>
      <p><strong>{Math.round(day.temperatureMax)}°</strong> / {Math.round(day.temperatureMin)}°</p>
      <p><CloudRain /> {day.precipitationProbability}%</p>
    </div>
    <div className="sheet-scroll">
      <section className="sheet-section"><div className="section-heading"><h2>Hourly forecast</h2><span>{day.precipitation.toFixed(1)} mm expected</span></div><HourlyForecast key={day.date} day={day} currentTime={data.current.time} /></section>
      <section className="sheet-section week-section"><div className="section-heading"><h2>Eight-day outlook</h2><span>Tap a day to view</span></div>
        <div className="daily-list">{data.days.map((item, itemIndex) => <button key={item.date} onClick={() => { setSelectedDay(itemIndex); setSnap("collapsed"); }} className={itemIndex === selectedDay ? "daily selected" : "daily"}>
          <span>{itemIndex === 0 ? "Today" : formatDay(item.date)}</span><WeatherIcon code={item.weatherCode} size={25}/><small><CloudRain />{item.precipitationProbability}%</small><small><Wind />{Math.round(item.windSpeed)}</small><em>{Math.round(item.temperatureMin)}°</em><strong>{Math.round(item.temperatureMax)}°</strong>
        </button>)}</div>
      </section>
      <section className="detail-grid">
        <div><Compass /><span>Wind</span><strong>{compassDirection(period.direction)} {Math.round(period.wind)} km/h</strong><small>Gusting {Math.round(period.gusts)} km/h</small></div>
        <div><Droplets /><span>Rainfall</span><strong>{day.rain.toFixed(1)} mm</strong><small>{day.precipitationProbability}% probability</small></div>
        <div><Zap /><span>UV index</span><strong>{Math.round(day.uvIndex)}</strong><small>{day.uvIndex >= 6 ? "High — use protection" : day.uvIndex >= 3 ? "Moderate" : "Low"}</small></div>
        <div><Navigation /><span>Visibility</span><strong>{Math.round((day.hours[12]?.visibility ?? 0) / 1000)} km</strong><small>At midday</small></div>
        <div><Sunrise /><span>Sunrise</span><strong>{formatTime(day.sunrise)}</strong><small>Local time</small></div>
        <div><Sunset /><span>Sunset</span><strong>{formatTime(day.sunset)}</strong><small>Local time</small></div>
      </section>
    </div>
  </motion.aside>;
}

function LocationSearch({ open, close, select }: { open: boolean; close: () => void; select: (location: Location) => void }) {
  const [query, setQuery] = useState(""); const [results, setResults] = useState<Location[]>([]); const [searching, setSearching] = useState(false); const [searched, setSearched] = useState(false);
  useEffect(() => { if (query.trim().length < 2) return; const controller = new AbortController(); const timer = setTimeout(async () => { setSearching(true); try { setResults(await searchLocations(query, controller.signal)); setSearched(true); } catch { setResults([]); } finally { setSearching(false); } }, 350); return () => { clearTimeout(timer); controller.abort(); }; }, [query]);
  return <AnimatePresence>{open && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <motion.div className="modal search-modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={spring} role="dialog" aria-modal="true" aria-label="Search for a location">
      <div className="modal-head"><div><span>CHANGE LOCATION</span><h2>Where are you?</h2></div><button onClick={close} aria-label="Close search"><X /></button></div>
      <label className="search-box"><Search /><input autoFocus value={query} onChange={(e) => { const next = e.target.value; setQuery(next); if (next.trim().length < 2) { setResults([]); setSearched(false); setSearching(false); } }} placeholder="Search a city or place" /></label>
      <button className="location-result home" onClick={() => { select(AUCKLAND); close(); }}><MapPin /><span><b>Auckland</b><small>New Zealand · Default</small></span></button>
      <div className="search-results">{searching ? <p className="search-status">Searching the world…</p> : results.map((item) => <button className="location-result" key={`${item.latitude}-${item.longitude}`} onClick={() => { select(item); close(); }}><MapPin /><span><b>{item.name}</b><small>{item.country}</small></span></button>)}{searched && !searching && !results.length && <p className="search-status">No matching places found. Try a nearby city.</p>}</div>
    </motion.div>
  </motion.div>}</AnimatePresence>;
}

function SettingsPanel({ open, close, quality, setQuality }: { open: boolean; close: () => void; quality: QualityMode; setQuality: (mode: QualityMode) => void }) {
  return <AnimatePresence>{open && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && close()}><motion.div className="modal settings-modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={spring} role="dialog" aria-modal="true" aria-label="Weather app settings">
    <div className="modal-head"><div><span>ATMOSPHERE</span><h2>Visual quality</h2></div><button onClick={close} aria-label="Close settings"><X /></button></div>
    <p className="settings-copy">Choose how much motion and weather detail to render. Reduced-motion preferences are always respected.</p>
    <div className="quality-list">{qualityOptions.map((option) => <button key={option.value} className={quality === option.value ? "selected" : ""} onClick={() => setQuality(option.value)}><span><b>{option.label}</b><small>{option.note}</small></span><i /></button>)}</div>
  </motion.div></motion.div>}</AnimatePresence>;
}

function LoadingState() { return <main className="weather-app loading-state"><div className="loading-sky"><div className="loading-brand">ATMOS <span>AUCKLAND</span></div><div className="skeleton temperature-skeleton"/><div className="skeleton line-skeleton"/><div className="loading-pulse">Reading the sky</div></div><div className="loading-sheet"><div className="skeleton row-skeleton"/><div className="skeleton graph-skeleton"/></div></main>; }

export default function WeatherApp() {
  const { location, data, loading, refreshing, error, offline, setLocation, refresh } = useWeather();
  const [selectedDay, setSelectedDay] = useState(0); const [searchOpen, setSearchOpen] = useState(false); const [settingsOpen, setSettingsOpen] = useState(false); const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [quality, setQualityState] = useState<QualityMode>("auto");
  const qualityResolved = useMemo<QualityMode>(() => quality !== "auto" ? quality : typeof navigator !== "undefined" && ((navigator.hardwareConcurrency ?? 8) <= 4 || navigator.connection?.saveData) ? "balanced" : "high", [quality]);
  useEffect(() => { const saved = localStorage.getItem("atmos-quality") as QualityMode | null; if (saved) queueMicrotask(() => setQualityState(saved)); if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js"); }, []);
  useEffect(() => { if (!data || location.name !== "Auckland" || !navigator.geolocation) return; const timer = window.setTimeout(() => navigator.geolocation.getCurrentPosition((position) => setLocation({ name: "My location", country: "Current position", latitude: position.coords.latitude, longitude: position.coords.longitude }), (failure) => { if (failure.code === failure.PERMISSION_DENIED) setGeoMessage("Location access is off — showing Auckland instead."); }, { timeout: 8000, maximumAge: 600000 }), 1600); return () => clearTimeout(timer); }, [data, location.name, setLocation]);
  const setQuality = (mode: QualityMode) => { setQualityState(mode); localStorage.setItem("atmos-quality", mode); };
  if (loading && !data) return <LoadingState />;
  if (error || !data) return <main className="error-page"><div><WeatherIcon code={3} size={56}/><p>FORECAST UNAVAILABLE</p><h1>The sky went quiet.</h1><span>{error}</span><button onClick={refresh}><RefreshCw /> Try again</button></div></main>;
  const selected = data.days[selectedDay] ?? data.days[0];
  return <main className="weather-app">
    <header className="topbar">
      <button className="location-button" onClick={() => setSearchOpen(true)} aria-label={`Change location, currently ${location.name}`}><MapPin /><span><b>{location.name}</b><small>{new Intl.DateTimeFormat("en-NZ", { weekday: "long", month: "long", day: "numeric", timeZone: data.timezone }).format(new Date())}</small></span></button>
      <div className="top-actions"><button onClick={() => setSearchOpen(true)} aria-label="Search locations"><Search /></button><button onClick={() => setSettingsOpen(true)} aria-label="Open settings"><Settings /></button></div>
    </header>
    {(offline || geoMessage || refreshing) && <div className="status-pill" role="status">{refreshing ? <><RefreshCw className="spin"/> Refreshing weather…</> : offline ? `Offline · Updated ${formatTime(data.updatedAt)}` : geoMessage}<button onClick={() => setGeoMessage(null)} aria-label="Dismiss message"><X /></button></div>}
    <SwipeDeck data={data} index={selectedDay} setIndex={setSelectedDay} quality={qualityResolved} />
    <ForecastSheet data={data} selectedDay={selectedDay} setSelectedDay={setSelectedDay} />
    <LocationSearch open={searchOpen} close={() => setSearchOpen(false)} select={(next) => { setSelectedDay(0); setLocation(next); }} />
    <SettingsPanel open={settingsOpen} close={() => setSettingsOpen(false)} quality={quality} setQuality={setQuality} />
    <button className="geo-button" onClick={() => navigator.geolocation?.getCurrentPosition((position) => setLocation({ name: "My location", country: "Current position", latitude: position.coords.latitude, longitude: position.coords.longitude }), () => setGeoMessage("Your location isn’t available. You can search for a city instead."))} aria-label="Use my current location"><LocateFixed /></button>
    <span className="sr-only" aria-live="polite">Showing {formatDay(selected.date, true)}, {weatherDescription(selected.weatherCode)}</span>
  </main>;
}

declare global { interface Navigator { connection?: { saveData?: boolean } } }
