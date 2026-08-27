"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  Activity, ArrowLeft, BarChart3, BrainCircuit, CloudRain, Compass, Eye,
  Gauge, Layers3, MapPin, Minus, SlidersHorizontal, Sparkles, Sun, Thermometer,
  TrendingDown, TrendingUp, Wind,
} from "lucide-react";
import { InteractiveDayTimeline } from "@/components/analysis/InteractiveDayTimeline";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { useWeather } from "@/hooks/useWeather";
import { fetchMicroclimateWeather } from "@/lib/openMeteo";
import { compassDirection, weatherDescription } from "@/lib/weatherCodes";
import { derivePersonalFit, deriveWeatherIntelligence, type IntelligenceMetric, type WeatherPreferences } from "@/lib/analysis/deriveWeatherIntelligence";
import type { Location } from "@/types/weather";

const SNAPSHOT_KEY = "atmos-intelligence-snapshot-v1";
const MEMORY_KEY = "atmos-weather-memory-v1";
const PREFERENCES_KEY = "atmos-weather-fit-v1";
const MICROCLIMATE_KEY = "atmos-microclimates-v1";
const MICROCLIMATE_MAX_AGE = 15 * 60 * 1000;
const defaultPreferences: WeatherPreferences = { temperature: 19, rain: 30, wind: 22, humidity: 65, uv: 6 };

type Snapshot = { temperature: number; rain: number; wind: number; cloud: number; savedAt: string };
type MemoryDay = { date: string; location: string; high: number; rain: number; wind: number; comfort: number; rhythm: number };
type MicroResult = { name: string; temperature: number; rain: number; wind: number; weatherCode: number };
type MicroCache = { savedAt: number; results: MicroResult[] };

const microclimates: Location[] = [
  { name: "Auckland CBD", country: "New Zealand", latitude: -36.8485, longitude: 174.7633 },
  { name: "North Shore", country: "New Zealand", latitude: -36.787, longitude: 174.776 },
  { name: "Waitākere", country: "New Zealand", latitude: -36.851, longitude: 174.544 },
  { name: "Manukau", country: "New Zealand", latitude: -36.994, longitude: 174.879 },
  { name: "Auckland Airport", country: "New Zealand", latitude: -37.008, longitude: 174.785 },
  { name: "Waiheke Island", country: "New Zealand", latitude: -36.793, longitude: 175.039 },
  { name: "Piha", country: "New Zealand", latitude: -36.954, longitude: 174.474 },
];

function safeParse<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? "") as T; } catch { return fallback; }
}

function isPreferences(value: unknown): value is WeatherPreferences {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<WeatherPreferences>;
  return [item.temperature, item.rain, item.wind, item.humidity, item.uv].every((entry) => typeof entry === "number" && Number.isFinite(entry));
}

function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Snapshot>;
  return [item.temperature, item.rain, item.wind, item.cloud].every((entry) => typeof entry === "number" && Number.isFinite(entry)) && typeof item.savedAt === "string";
}

function isMemoryDay(value: unknown): value is MemoryDay {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MemoryDay>;
  return typeof item.date === "string" && typeof item.location === "string" && [item.high, item.rain, item.wind, item.comfort, item.rhythm].every((entry) => typeof entry === "number" && Number.isFinite(entry));
}

function isMicroCache(value: unknown): value is MicroCache {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MicroCache>;
  return typeof item.savedAt === "number" && Array.isArray(item.results) && item.results.every((result) => result && typeof result.name === "string" && typeof result.temperature === "number");
}

function MeterList({ items }: { items: IntelligenceMetric[] }) {
  return <div className="intelligence-meters">{items.map((item) => <div key={item.label} className="intelligence-meter"><div><span>{item.label}</span><b>{item.display}</b></div><i><span style={{ width: `${item.value}%` }} /></i>{item.note && <small>{item.note}</small>}</div>)}</div>;
}

function TrendIcon({ direction }: { direction: "rising" | "falling" | "stable" }) {
  return direction === "rising" ? <TrendingUp aria-hidden /> : direction === "falling" ? <TrendingDown aria-hidden /> : <Minus aria-hidden />;
}

export function WeatherIntelligencePage() {
  const { data, location, loading, error, refresh } = useWeather();
  const reducedMotion = useReducedMotion();
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(12);
  const [preferences, setPreferences] = useState<WeatherPreferences>(defaultPreferences);
  const [previous, setPrevious] = useState<Snapshot | null>(null);
  const [memory, setMemory] = useState<MemoryDay[]>([]);
  const [microResults, setMicroResults] = useState<MicroResult[]>([]);
  const [microStatus, setMicroStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [microReload, setMicroReload] = useState(0);
  const initializedDataRef = useRef<string | null>(null);

  const day = data?.days[selectedDay] ?? data?.days[0];
  const intelligence = useMemo(() => day ? deriveWeatherIntelligence(day, data?.days[selectedDay + 1]) : null, [data?.days, day, selectedDay]);
  const fitScore = useMemo(() => day ? derivePersonalFit(day, preferences) : 0, [day, preferences]);

  useEffect(() => {
    const storedPreferences = safeParse<unknown>(PREFERENCES_KEY, null);
    const savedPreferences = isPreferences(storedPreferences) ? storedPreferences : defaultPreferences;
    queueMicrotask(() => setPreferences(savedPreferences));
  }, []);

  useEffect(() => {
    if (!data || !intelligence || initializedDataRef.current === data.updatedAt) return;
    initializedDataRef.current = data.updatedAt;
    const storedSnapshot = safeParse<unknown>(SNAPSHOT_KEY, null);
    const savedSnapshot = isSnapshot(storedSnapshot) ? storedSnapshot : null;
    const snapshot: Snapshot = {
      temperature: data.current.temperature, rain: data.current.precipitation,
      wind: data.current.windSpeed, cloud: data.current.cloudCover, savedAt: data.updatedAt,
    };
    const storedMemory = safeParse<unknown>(MEMORY_KEY, []);
    const savedMemory = Array.isArray(storedMemory) ? storedMemory.filter(isMemoryDay) : [];
    const today: MemoryDay = {
      date: data.days[0].date, location: data.location.name, high: data.days[0].temperatureMax,
      rain: data.days[0].rain, wind: data.days[0].windSpeed,
      comfort: derivePersonalFit(data.days[0], defaultPreferences), rhythm: deriveWeatherIntelligence(data.days[0], data.days[1]).rhythm,
    };
    const nextMemory = [...savedMemory.filter((item) => !(item.date === today.date && item.location === today.location)), today].slice(-30);
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
      localStorage.setItem(MEMORY_KEY, JSON.stringify(nextMemory));
    } catch { /* Analytics remain available without persistence. */ }
    queueMicrotask(() => { setPrevious(savedSnapshot); setMemory(nextMemory); });
  }, [data, intelligence]);

  useEffect(() => {
    if (!data) return;
    const controller = new AbortController();
    const storedMicroclimates = safeParse<unknown>(MICROCLIMATE_KEY, null);
    const cachedMicroclimates = isMicroCache(storedMicroclimates) ? storedMicroclimates : null;
    if (cachedMicroclimates && Date.now() - cachedMicroclimates.savedAt < MICROCLIMATE_MAX_AGE && cachedMicroclimates.results.length) {
      queueMicrotask(() => { setMicroResults(cachedMicroclimates.results); setMicroStatus("success"); });
      return () => controller.abort();
    }
    const timer = window.setTimeout(() => {
      setMicroStatus("loading");
      void Promise.allSettled(microclimates.map((place) => fetchMicroclimateWeather(place, controller.signal))).then((results) => {
        if (controller.signal.aborted) return;
        const successful = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
        setMicroResults(successful);
        setMicroStatus(successful.length ? "success" : "error");
        if (successful.length) try { localStorage.setItem(MICROCLIMATE_KEY, JSON.stringify({ savedAt: Date.now(), results: successful } satisfies MicroCache)); } catch { /* Microclimates remain visible without caching. */ }
      });
    }, 500);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [data, microReload]);

  const updatePreference = (key: keyof WeatherPreferences, value: number) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next)); } catch { /* Preferences are still usable for this visit. */ }
  };

  if (loading && !data) return <main className="intelligence-page intelligence-loading"><div><BrainCircuit /><span>WEATHER INTELLIGENCE</span><h1>Reading the shape of the day…</h1><i /></div></main>;
  if (error || !data || !day || !intelligence) return <main className="intelligence-page intelligence-loading"><div><CloudRain /><span>FORECAST UNAVAILABLE</span><h1>The analysis needs a live sky.</h1><button onClick={refresh}>Try again</button><Link href="/">Return home</Link></div></main>;

  const changeItems = previous ? [
    { label: "Temperature", value: data.current.temperature - previous.temperature, unit: "°" },
    { label: "Rain now", value: data.current.precipitation - previous.rain, unit: " mm" },
    { label: "Wind", value: data.current.windSpeed - previous.wind, unit: " km/h" },
    { label: "Cloud", value: data.current.cloudCover - previous.cloud, unit: "%" },
  ] : [];
  const memoryLeaders = memory.length ? [
    { label: "Warmest", item: [...memory].sort((a, b) => b.high - a.high)[0], value: (item: MemoryDay) => `${Math.round(item.high)}°` },
    { label: "Wettest", item: [...memory].sort((a, b) => b.rain - a.rain)[0], value: (item: MemoryDay) => `${item.rain.toFixed(1)} mm` },
    { label: "Windiest", item: [...memory].sort((a, b) => b.wind - a.wind)[0], value: (item: MemoryDay) => `${Math.round(item.wind)} km/h` },
    { label: "Most comfortable", item: [...memory].sort((a, b) => b.comfort - a.comfort)[0], value: (item: MemoryDay) => `${item.comfort}/100` },
    { label: "Most changeable", item: [...memory].sort((a, b) => b.rhythm - a.rhythm)[0], value: (item: MemoryDay) => `${Math.round(item.rhythm)}/100` },
  ] : [];

  return (
    <main className={`intelligence-page ${reducedMotion ? "reduced-motion" : ""}`}>
      <header className="intelligence-nav">
        <Link href="/" className="intelligence-back"><ArrowLeft aria-hidden /> Live weather</Link>
        <div><BrainCircuit aria-hidden /><span>ATMOS / INTELLIGENCE</span></div>
        <Link href="/about" className="intelligence-about">About Me</Link>
      </header>

      <section className="intelligence-hero" aria-labelledby="intelligence-title">
        <div><span className="intelligence-kicker"><Sparkles aria-hidden /> LIVE FORECAST INTERPRETATION</span><h1 id="intelligence-title">Weather<br />Intelligence</h1><p>{intelligence.summary}</p></div>
        <aside><span><MapPin />{location.name}</span><strong>{Math.round(data.current.temperature)}°</strong><p>{weatherDescription(data.current.weatherCode)}</p><small>Updated from the same forecast powering Atmos</small></aside>
      </section>

      <nav className="analysis-day-tabs" aria-label="Choose forecast day">{data.days.map((item, index) => <button key={item.date} className={selectedDay === index ? "active" : ""} onClick={() => { setSelectedDay(index); setSelectedHour(12); }}><span>{index === 0 ? "Today" : new Intl.DateTimeFormat("en-NZ", { weekday: "short" }).format(new Date(`${item.date}T12:00:00`))}</span><b>{Math.round(item.temperatureMax)}°</b><small>{item.precipitationProbability}% rain</small></button>)}</nav>

      <InteractiveDayTimeline key={day.date} day={day} selectedIndex={Math.min(selectedHour, day.hours.length - 1)} onSelect={setSelectedHour} />

      <div className="intelligence-grid">
        <section className="intelligence-card dna-card" aria-labelledby="dna-title"><div className="intelligence-card-head"><div><span>WEATHER DNA</span><h2 id="dna-title">The day’s fingerprint</h2></div><BarChart3 /></div><div className="dna-bars" role="img" aria-label={intelligence.dna.map((item) => `${item.label} ${Math.round(item.value)} percent`).join(", ")}>{intelligence.dna.map((item) => <div key={item.label}><i style={{ height: `${Math.max(8, item.value)}%` }} /><span>{item.label}</span><b>{item.display}</b></div>)}</div></section>

        <section className="intelligence-card" aria-labelledby="changed-title"><div className="intelligence-card-head"><div><span>WHAT CHANGED?</span><h2 id="changed-title">Since the last reading</h2></div><Activity /></div>{changeItems.length ? <div className="change-list">{changeItems.map((item) => <div key={item.label}><span>{item.label}</span><b className={item.value > 0 ? "up" : item.value < 0 ? "down" : "stable"}>{item.value > 0 ? "+" : ""}{item.value.toFixed(1)}{item.unit}</b></div>)}</div> : <p className="intelligence-empty">This is the first saved reading. Return later and Atmos will show exactly what moved.</p>}</section>

        <section className="intelligence-card" aria-labelledby="momentum-title"><div className="intelligence-card-head"><div><span>WEATHER MOMENTUM</span><h2 id="momentum-title">Where conditions are heading</h2></div><TrendingUp /></div><div className="momentum-list">{intelligence.momentum.map((item) => <div key={item.label}><TrendIcon direction={item.direction} /><span>{item.label}<small>{item.direction}</small></span><b>{item.change > 0 ? "+" : ""}{item.change.toFixed(1)}{item.unit}</b></div>)}</div></section>

        <section className="intelligence-card" aria-labelledby="balance-title"><div className="intelligence-card-head"><div><span>ATMOSPHERE BALANCE</span><h2 id="balance-title">Five forces in balance</h2></div><Gauge /></div><MeterList items={intelligence.balance} /></section>

        <section className="intelligence-card personal-fit-card" aria-labelledby="fit-title"><div className="intelligence-card-head"><div><span>PERSONAL WEATHER FIT</span><h2 id="fit-title">Your comfort, explained</h2></div><SlidersHorizontal /></div><div className="fit-score"><strong>{fitScore}</strong><span>/100 fit</span></div><div className="preference-grid">{([
          ["temperature", "Ideal temperature", 5, 30, "°"], ["rain", "Rain tolerance", 0, 100, "%"], ["wind", "Wind tolerance", 5, 50, " km/h"], ["humidity", "Ideal humidity", 30, 90, "%"], ["uv", "UV tolerance", 1, 12, ""],
        ] as const).map(([key, label, min, max, unit]) => <label key={key}><span>{label}<b>{preferences[key]}{unit}</b></span><input type="range" min={min} max={max} value={preferences[key]} onChange={(event) => updatePreference(key, Number(event.target.value))} /></label>)}</div><small className="fit-note">Equal-weight score across temperature distance, rain, wind, humidity and UV tolerance.</small></section>

        <section className="intelligence-card activity-card" aria-labelledby="activity-title"><div className="intelligence-card-head"><div><span>ACTIVITY MATRIX</span><h2 id="activity-title">When the day works best</h2></div><Activity /></div><div className="activity-matrix"><div className="matrix-head"><span>Activity</span><b>Morning</b><b>Afternoon</b><b>Evening</b></div>{intelligence.activities.map((activity) => <div key={activity.name}><span>{activity.name}</span>{activity.scores.map((score) => <b key={score.period} className={score.score >= 70 ? "great" : score.score >= 45 ? "fair" : "poor"} aria-label={`${score.period}: ${score.score} out of 100`}>{score.score}</b>)}</div>)}</div></section>

        <section className="intelligence-card sky-card" aria-labelledby="sky-title"><div className="intelligence-card-head"><div><span>SKY QUALITY INDEX</span><h2 id="sky-title">Clarity above Auckland</h2></div><Eye /></div><div className="orb-score"><i style={{ "--score": `${intelligence.skyScore * 3.6}deg` } as React.CSSProperties}><span>{intelligence.skyScore}</span></i><div><b>{intelligence.skyScore >= 75 ? "Excellent sky" : intelligence.skyScore >= 50 ? "Good openings" : "Soft visibility"}</b><p>{intelligence.visibility.toFixed(1)} km average visibility, adjusted for cloud and rain. Sunset and stargazing favour lower cloud windows.</p></div></div></section>

        <section className="intelligence-card personality-card" aria-labelledby="personality-title"><div className="intelligence-card-head"><div><span>WEATHER PERSONALITY</span><h2 id="personality-title">{intelligence.personality}</h2></div><Sparkles /></div><p>Derived from the day’s dominant sky, wind and rate of change—not a generic forecast label.</p><div className="personality-tags"><span>{weatherDescription(day.weatherCode)}</span><span>{Math.round(day.windSpeed)} km/h wind</span><span>{Math.round(intelligence.rhythm)} rhythm</span></div></section>

        <section className="intelligence-card rhythm-card" aria-labelledby="rhythm-title"><div className="intelligence-card-head"><div><span>WEATHER RHYTHM</span><h2 id="rhythm-title">How changeable is today?</h2></div><Activity /></div><div className="rhythm-score"><strong>{Math.round(intelligence.rhythm)}</strong><i><span style={{ width: `${intelligence.rhythm}%` }} /></i><b>{intelligence.rhythm < 35 ? "Steady" : intelligence.rhythm < 65 ? "Evolving" : "Restless"}</b></div><p>Tracks hour-to-hour movement in temperature, rain probability and wind.</p></section>

        <section className="intelligence-card micro-card" aria-labelledby="micro-title"><div className="intelligence-card-head"><div><span>AUCKLAND MICROCLIMATE LENS</span><h2 id="micro-title">Seven places, one region</h2></div><MapPin /></div>{microResults.length ? <div className="micro-list">{microResults.map((place) => <div key={place.name}><WeatherIcon code={place.weatherCode} size={27} /><span><b>{place.name}</b><small>{place.rain}% rain · {Math.round(place.wind)} km/h</small></span><strong>{Math.round(place.temperature)}°</strong></div>)}</div> : microStatus === "error" ? <div className="intelligence-empty"><p>Microclimate comparisons are unavailable. The primary forecast and all local analytics remain ready.</p><button onClick={() => setMicroReload((value) => value + 1)}>Retry comparisons</button></div> : <p className="intelligence-empty">{microStatus === "loading" ? "Comparing live Open‑Meteo forecasts across the isthmus, coasts and islands…" : "Microclimate comparisons will load after the main analysis."}</p>}<small className="data-note">Direct forecast comparisons; cached for 15 minutes; no separate prediction model.</small></section>

        <section className="intelligence-card layers-card" aria-labelledby="layers-title"><div className="intelligence-card-head"><div><span>WEATHER LAYERS</span><h2 id="layers-title">The atmosphere, separated</h2></div><Layers3 /></div><div className="layer-stack">{intelligence.layers.map((layer, index) => <div key={layer.label} style={{ "--layer-width": `${Math.max(18, layer.value)}%`, "--layer-index": index } as React.CSSProperties}><span>{layer.label}</span><i /><b>{layer.display}</b></div>)}</div></section>

        <section className="intelligence-card journey-card" aria-labelledby="temp-title"><div className="intelligence-card-head"><div><span>TEMPERATURE JOURNEY</span><h2 id="temp-title">Warming and cooling</h2></div><Thermometer /></div><p>{intelligence.temperatureJourney}</p><div className="temperature-curve" role="img" aria-label="Hourly temperature curve">{day.hours.map((hour) => <i key={hour.time} style={{ height: `${25 + (hour.temperature - day.temperatureMin) / Math.max(1, day.temperatureMax - day.temperatureMin) * 70}%` }} title={`${hour.time.slice(11)} ${hour.temperature}°`} />)}</div></section>

        <section className="intelligence-card rain-structure-card" aria-labelledby="rain-title"><div className="intelligence-card-head"><div><span>RAIN STRUCTURE</span><h2 id="rain-title">{intelligence.rainStructure}</h2></div><CloudRain /></div><div className="rain-strip" role="img" aria-label="Hourly rain probability">{day.hours.map((hour) => <i key={hour.time} style={{ opacity: Math.max(.08, hour.precipitationProbability / 100), height: `${Math.max(6, hour.precipitationProbability)}%` }} />)}</div><p>{day.rain.toFixed(1)} mm forecast across the day · peak probability {day.precipitationProbability}%.</p></section>

        <section className="intelligence-card wind-card" aria-labelledby="wind-title"><div className="intelligence-card-head"><div><span>WIND JOURNEY</span><h2 id="wind-title">Speed, gusts and direction</h2></div><Wind /></div><div className="wind-journey">{intelligence.windJourney.map((item) => <div key={item.time}><span>{item.time}</span><i style={{ width: `${Math.min(100, item.speed * 2.2)}%` }}><b style={{ left: `${Math.min(96, item.gust * 2.2)}%` }} /></i><strong>{Math.round(item.speed)}<small> {compassDirection(item.direction)}</small></strong></div>)}</div><small className="data-note">Bar: sustained wind · marker: gust</small></section>

        <section className="intelligence-card contrast-card" aria-labelledby="contrast-title"><div className="intelligence-card-head"><div><span>WEATHER CONTRAST MODE</span><h2 id="contrast-title">Today versus tomorrow</h2></div><Compass /></div>{intelligence.contrast.length ? <div className="contrast-list">{intelligence.contrast.map((item) => <div key={item.label}><span>{item.label}</span><b>{item.today}</b><i>→</i><b>{item.other}</b><small>{item.note}</small></div>)}</div> : <p className="intelligence-empty">The final forecast day has no tomorrow to compare.</p>}<p className="contrast-note">Morning/evening contrast appears in Momentum; place contrast appears in the Microclimate Lens; saved-reading contrast appears in What Changed.</p></section>

        <section className="intelligence-card memory-card" aria-labelledby="memory-title"><div className="intelligence-card-head"><div><span>WEATHER MEMORY</span><h2 id="memory-title">A local record that grows</h2></div><Sun /></div><div className="memory-leaders">{memoryLeaders.map(({ label, item, value }) => <div key={label}><span>{label}</span><b>{value(item)}</b><small>{new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short" }).format(new Date(`${item.date}T12:00:00`))}</small></div>)}</div><p>Stored only in this browser. Atmos remembers up to 30 daily summaries for warmest, wettest, windiest, most comfortable and most changeable days.</p></section>
      </div>

      <footer className="intelligence-footer"><span>Weather intelligence, not weather certainty.</span><Link href="/">Return to the live sky <ArrowLeft aria-hidden /></Link></footer>
    </main>
  );
}
