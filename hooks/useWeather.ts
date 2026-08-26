"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWeather } from "@/lib/openMeteo";
import type { Location, WeatherData } from "@/types/weather";

export const AUCKLAND: Location = { name: "Auckland", country: "New Zealand", latitude: -36.8485, longitude: 174.7633 };
const CACHE_KEY = "atmos-weather-cache-v1";
const LOCATION_KEY = "atmos-location-v1";
const MAX_AGE = 10 * 60 * 1000;

const announceWeather = (next: WeatherData) => window.dispatchEvent(new CustomEvent<WeatherData>("atmos-weather-updated", { detail: next }));

type Cache = { data: WeatherData; savedAt: number };

export function useWeather() {
  const [location, setLocationState] = useState<Location>(AUCKLAND);
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(async (target: Location, force = false) => {
    controller.current?.abort();
    controller.current = new AbortController();
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    const cached = cachedRaw ? JSON.parse(cachedRaw) as Cache : null;
    const same = cached?.data.location.latitude === target.latitude && cached?.data.location.longitude === target.longitude;
    if (!force && cached && same && Date.now() - cached.savedAt < MAX_AGE) {
      setData(cached.data); setLoading(false); announceWeather(cached.data); return;
    }
    if (data) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const next = await fetchWeather(target, controller.current.signal);
      setData(next); setOffline(false);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: next, savedAt: Date.now() }));
      announceWeather(next);
    } catch (cause) {
      if ((cause as Error).name === "AbortError") return;
      if (cached && same) { setData(cached.data); setOffline(true); }
      else { setError("We couldn’t reach the forecast. Check your connection and try again."); window.dispatchEvent(new Event("atmos-weather-error")); }
    } finally { setLoading(false); setRefreshing(false); }
  }, [data]);

  useEffect(() => {
    const saved = localStorage.getItem(LOCATION_KEY);
    const initial = saved ? JSON.parse(saved) as Location : AUCKLAND;
    queueMicrotask(() => { setLocationState(initial); void load(initial); });
    const online = () => { setOffline(false); void load(initial, true); };
    const offlineHandler = () => setOffline(true);
    window.addEventListener("online", online); window.addEventListener("offline", offlineHandler);
    return () => { controller.current?.abort(); window.removeEventListener("online", online); window.removeEventListener("offline", offlineHandler); };
  // Initial load only; subsequent loads are explicit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocation = useCallback((next: Location) => {
    setLocationState(next); localStorage.setItem(LOCATION_KEY, JSON.stringify(next)); void load(next, true);
  }, [load]);

  return { location, data, loading, refreshing, error, offline, setLocation, refresh: () => load(location, true) };
}
