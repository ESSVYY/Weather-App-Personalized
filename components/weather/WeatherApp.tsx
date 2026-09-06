"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, animate, motion, useMotionValue } from "motion/react";
import { CloudRain, Compass, Droplets, LocateFixed, MapPin, Navigation, RefreshCw, Search, Settings, Sunrise, Sunset, Wind, X, Zap } from "lucide-react";
import { useWeather, AUCKLAND } from "@/hooks/useWeather";
import { searchLocations } from "@/lib/openMeteo";
import { compassDirection, weatherDescription } from "@/lib/weatherCodes";
import { softEase } from "@/lib/animationConfig";
import type { Location, QualityMode, WeatherData, WeatherDay } from "@/types/weather";
import { WeatherIcon } from "./WeatherIcon";
import { WeatherScene } from "./WeatherScene";
import { TemperatureGraph } from "./TemperatureGraph";
import { AppearanceControl } from "@/components/theme/AppearanceControl";
import { DEFAULT_DISPLAY_NAME, DISPLAY_NAME_CHANGED_EVENT, DISPLAY_NAME_MAX_LENGTH, DISPLAY_NAME_STORAGE_KEY, normalizeDisplayName } from "@/lib/profile";

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

type SearchStatus = "idle" | "typing" | "loading" | "success" | "empty" | "error";
function LocationSearch({ open, close, select }: { open: boolean; close: () => void; select: (location: Location) => void }) {
  const [query, setQuery] = useState(""); const [results, setResults] = useState<Location[]>([]); const [status, setStatus] = useState<SearchStatus>("idle"); const [activeIndex, setActiveIndex] = useState(0); const requestId = useRef(0);
  useEffect(() => { const trimmed = query.trim(); if (!open || trimmed.length < 2) return; const controller = new AbortController(); const id = ++requestId.current; const timer = setTimeout(async () => { setStatus("loading"); try { const next = await searchLocations(trimmed, controller.signal); if (id !== requestId.current) return; setResults(next); setActiveIndex(0); setStatus(next.length ? "success" : "empty"); } catch (cause) { if (id === requestId.current && (!(cause instanceof Error) || cause.name !== "AbortError")) setStatus("error"); } }, 300); return () => { clearTimeout(timer); controller.abort(); }; }, [open, query]);
  const choose = (item: Location) => { select(item); close(); };
  return <AnimatePresence>{open && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <motion.div className="modal search-modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={spring} role="dialog" aria-modal="true" aria-label="Search for a location" onKeyDown={(event) => { if (event.key === "Escape") close(); }}>
      <div className="modal-head"><div><span>CHANGE LOCATION</span><h2>Where are you?</h2></div><button onClick={close} aria-label="Close search"><X /></button></div>
      <label className="search-box"><Search /><input autoFocus value={query} role="combobox" aria-expanded={results.length > 0} aria-controls="location-results" aria-activedescendant={results[activeIndex] ? `location-${activeIndex}` : undefined} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((value) => Math.min(results.length - 1, value + 1)); } if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((value) => Math.max(0, value - 1)); } if (event.key === "Enter" && results[activeIndex]) { event.preventDefault(); choose(results[activeIndex]); } }} onChange={(e) => { const next = e.target.value; setQuery(next); setStatus(next.trim().length ? "typing" : "idle"); if (next.trim().length < 2) setResults([]); }} placeholder="Search a city or place" /></label>
      <button className="location-result home" onClick={() => choose(AUCKLAND)}><MapPin /><span><b>Auckland</b><small>New Zealand · Default</small></span></button>
      <div className="search-results" id="location-results" role="listbox">{results.map((item, index) => <button id={`location-${index}`} role="option" aria-selected={index === activeIndex} className={`location-result ${index === activeIndex ? "active" : ""}`} key={`${item.latitude}-${item.longitude}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(item)}><MapPin /><span><b>{item.name}</b><small>{item.country}</small></span></button>)}{status === "loading" && <p className="search-status">Searching the world…</p>}{status === "empty" && <p className="search-status">No matching locations.</p>}{status === "error" && <p className="search-status">Location search is temporarily unavailable. Your current weather is still available.</p>}</div>
    </motion.div>
  </motion.div>}</AnimatePresence>;
}

function SettingsPanel({ open, close, quality, setQuality, displayName, setDisplayName }: { open: boolean; close: () => void; quality: QualityMode; setQuality: (mode: QualityMode) => void; displayName: string; setDisplayName: (name: string) => void }) {
  return <AnimatePresence>{open && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && close()}><motion.div className="modal settings-modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={spring} role="dialog" aria-modal="true" aria-label="Weather app settings">
    <div className="modal-head"><div><span>ATMOSPHERE</span><h2>Settings</h2></div><button onClick={close} aria-label="Close settings"><X /></button></div>
    <p className="settings-copy">Personalise your welcome and choose how Atmos looks and moves.</p>
    <div className="name-setting">
      <div className="settings-section-heading"><span>PERSONALISATION</span><h3>Your greeting name</h3></div>
      <label htmlFor="display-name"><span>Name</span><b>{displayName.length}/{DISPLAY_NAME_MAX_LENGTH}</b></label>
      <input id="display-name" type="text" value={displayName} maxLength={DISPLAY_NAME_MAX_LENGTH} onChange={(event) => setDisplayName(event.target.value)} placeholder={DEFAULT_DISPLAY_NAME} autoComplete="nickname" />
      <p>Up to 12 characters allowed. Leave it empty to use Saksham.</p>
    </div>
    <AppearanceControl />
    <div className="settings-section-heading quality-heading"><span>PERFORMANCE</span><h3>Visual quality</h3></div>
    <div className="quality-list">{qualityOptions.map((option) => <button key={option.value} className={quality === option.value ? "selected" : ""} onClick={() => setQuality(option.value)}><span><b>{option.label}</b><small>{option.note}</small></span><i /></button>)}</div>
    <Link className="settings-about-link" href="/about">About Me <span>Meet the designer and developer</span></Link>
  </motion.div></motion.div>}</AnimatePresence>;
}

function getPositionWithTimeout(timeoutMs = 5000) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("Geolocation is unavailable")); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 10 * 60 * 1000 });
  });
}

function LoadingState({ slow, retry, useAuckland }: { slow: boolean; retry: () => void; useAuckland: () => void }) { return <main className="weather-app loading-state"><div className="loading-sky"><div className="loading-brand">ATMOS <span>AUCKLAND</span></div><div className="skeleton temperature-skeleton"/><div className="skeleton line-skeleton"/><div className="loading-pulse">Reading the sky</div>{slow && <div className="loading-recovery" role="status"><strong>The sky is taking a little longer to answer.</strong><span>Auckland remains the default—location permission is not required.</span><div><button onClick={retry}><RefreshCw /> Retry weather</button><button onClick={useAuckland}><MapPin /> Use Auckland</button></div></div>}</div><div className="loading-sheet"><div className="skeleton row-skeleton"/><div className="skeleton graph-skeleton"/></div></main>; }

export default function WeatherApp() {
  const { location, pendingLocation, failedLocation, locationStatus, locationError, data, loading, refreshing, error, offline, cached, slow, setLocation, cancelLocationSwitch, retryLocation, dismissLocationError, useAuckland, refresh } = useWeather();
  const [selectedDay, setSelectedDay] = useState(0); const [searchOpen, setSearchOpen] = useState(false); const [settingsOpen, setSettingsOpen] = useState(false); const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [quality, setQualityState] = useState<QualityMode>("auto");
  const [displayName, setDisplayNameState] = useState(DEFAULT_DISPLAY_NAME);
  const qualityResolved = useMemo<QualityMode>(() => quality !== "auto" ? quality : typeof navigator !== "undefined" && ((navigator.hardwareConcurrency ?? 8) <= 4 || navigator.connection?.saveData) ? "balanced" : "high", [quality]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("atmos-quality") as QualityMode | null;
      const savedName = localStorage.getItem(DISPLAY_NAME_STORAGE_KEY);
      if (saved) queueMicrotask(() => setQualityState(saved));
      if (savedName !== null) queueMicrotask(() => setDisplayNameState(normalizeDisplayName(savedName)));
    } catch { /* Defaults remain available without storage. */ }
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    else void navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations.map((registration) => registration.unregister()))).catch(() => undefined);
  }, []);
  useEffect(() => {
    const openSearch = () => setSearchOpen(true);
    const openSettings = () => setSettingsOpen(true);
    window.addEventListener("atmos-open-location-search", openSearch);
    window.addEventListener("atmos-open-settings", openSettings);
    const params = new URLSearchParams(window.location.search);
    if (params.get("search") === "1") queueMicrotask(openSearch);
    if (params.get("settings") === "1") queueMicrotask(openSettings);
    return () => { window.removeEventListener("atmos-open-location-search", openSearch); window.removeEventListener("atmos-open-settings", openSettings); };
  }, []);
  useEffect(() => { if (!data || location.name !== "Auckland" || !navigator.geolocation) return; let active = true; const timer = window.setTimeout(() => { void getPositionWithTimeout(5000).then((position) => { if (active) setLocation({ name: "My location", country: "Current position", latitude: position.coords.latitude, longitude: position.coords.longitude }); }).catch((failure: GeolocationPositionError | Error) => { if (active && "code" in failure && failure.code === 1) setGeoMessage("Location access is off — showing Auckland instead."); }); }, 1600); return () => { active = false; clearTimeout(timer); }; }, [data, location.name, setLocation]);
  const setQuality = (mode: QualityMode) => { setQualityState(mode); window.dispatchEvent(new CustomEvent("atmos-quality-changed", { detail: mode })); try { localStorage.setItem("atmos-quality", mode); } catch { /* The setting still applies for this visit. */ } };
  const setDisplayName = (name: string) => {
    const next = normalizeDisplayName(name);
    setDisplayNameState(next);
    window.dispatchEvent(new CustomEvent(DISPLAY_NAME_CHANGED_EVENT, { detail: next }));
    try { localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, next); } catch { /* The name still applies for this visit. */ }
  };
  if (loading && !data) return <LoadingState slow={slow} retry={refresh} useAuckland={useAuckland} />;
  if (!data) return <main className="error-page"><div><WeatherIcon code={3} size={56}/><p>FORECAST UNAVAILABLE</p><h1>I couldn’t read the sky just yet.</h1><span>{error}</span><button onClick={refresh}><RefreshCw /> Try again</button><button onClick={useAuckland}><MapPin /> Use Auckland</button></div></main>;
  const selected = data.days[selectedDay] ?? data.days[0];
  return <main className={`weather-app ${getDayPeriod(selected, data, selectedDay).isDay ? "is-day" : "is-night"}`}>
    <header className="topbar">
      <button className="location-button" onClick={() => setSearchOpen(true)} aria-label={`Change location, currently ${location.name}`}><MapPin /><span><b>{location.name}</b><small>{new Intl.DateTimeFormat("en-NZ", { weekday: "long", month: "long", day: "numeric", timeZone: data.timezone }).format(new Date())}</small></span></button>
      <div className="top-actions"><button onClick={() => setSearchOpen(true)} aria-label="Search locations"><Search /></button><button onClick={() => setSettingsOpen(true)} aria-label="Open settings"><Settings /></button></div>
    </header>
    <AnimatePresence>{locationStatus === "switching" && pendingLocation && <motion.div className="location-switch-toast" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .4, ease: softEase }} role="status"><RefreshCw className="spin" /><span><b>Loading {pendingLocation.name}…</b><small>Your {location.name} forecast stays visible.</small></span><button onClick={cancelLocationSwitch}>Cancel</button></motion.div>}{locationStatus === "error" && <motion.div className="location-switch-toast error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} role="alert"><MapPin /><span><b>{failedLocation?.name ?? "That location"} couldn’t be loaded.</b><small>{locationError}</small></span><button onClick={retryLocation}>Retry</button><button onClick={dismissLocationError}>Dismiss</button></motion.div>}</AnimatePresence>
    {(offline || cached || geoMessage || (refreshing && locationStatus !== "switching")) && <div className="status-pill" role="status">{refreshing ? <><RefreshCw className="spin"/> Refreshing weather…</> : offline ? `Offline · Updated ${formatTime(data.updatedAt)}` : cached ? `Cached forecast · Refreshing in the background` : geoMessage}<button onClick={() => setGeoMessage(null)} aria-label="Dismiss message"><X /></button></div>}
    <AnimatePresence mode="sync" initial={false}><motion.div className="weather-data-stage" key={`${data.location.latitude}-${data.location.longitude}`} initial={{ opacity: .35, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .45, ease: softEase }}><SwipeDeck data={data} index={selectedDay} setIndex={setSelectedDay} quality={qualityResolved} /><ForecastSheet data={data} selectedDay={selectedDay} setSelectedDay={setSelectedDay} /></motion.div></AnimatePresence>
    <LocationSearch open={searchOpen} close={() => setSearchOpen(false)} select={(next) => { setSelectedDay(0); setLocation(next); }} />
    <SettingsPanel open={settingsOpen} close={() => setSettingsOpen(false)} quality={quality} setQuality={setQuality} displayName={displayName} setDisplayName={setDisplayName} />
    <button className="geo-button" onClick={() => { void getPositionWithTimeout(5000).then((position) => setLocation({ name: "My location", country: "Current position", latitude: position.coords.latitude, longitude: position.coords.longitude })).catch(() => setGeoMessage("Your location isn’t available. You can search for a city instead.")); }} aria-label="Use my current location"><LocateFixed /></button>
    <span className="sr-only" aria-live="polite">Showing {formatDay(selected.date, true)}, {weatherDescription(selected.weatherCode)}</span>
  </main>;
}

declare global { interface Navigator { connection?: { saveData?: boolean } } }
