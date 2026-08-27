"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchWeather } from "@/lib/openMeteo";
import type { Location, WeatherData } from "@/types/weather";

export const AUCKLAND: Location = {
  name: "Auckland", country: "New Zealand", latitude: -36.8485, longitude: 174.7633,
  timezone: "Pacific/Auckland",
};

const CACHE_KEY = "atmos-weather-cache-v1";
const LOCATION_KEY = "atmos-location-v1";
const MAX_AGE = 10 * 60 * 1000;
const SLOW_THRESHOLD_MS = 8_000;

export type LoadingStatus = "idle" | "loading" | "success" | "error";
export type LocationRequestStatus = "idle" | "searching" | "switching" | "success" | "error" | "cancelled";
export type AppLoadingState = {
  primaryWeather: boolean;
  location: boolean;
  analytics: boolean;
  microclimates: boolean;
};

type Cache = { data: WeatherData; savedAt: number };
type RequestChannel = "primary" | "location";

const announceWeather = (next: WeatherData) => window.dispatchEvent(new CustomEvent<WeatherData>("atmos-weather-updated", { detail: next }));
const sameLocation = (first: Location, second: Location) => first.latitude === second.latitude && first.longitude === second.longitude;
export const getLocationKey = (location: Location) => `${location.latitude.toFixed(4)}:${location.longitude.toFixed(4)}:${location.timezone ?? ""}`;

function isLocation(value: unknown): value is Location {
  if (!value || typeof value !== "object") return false;
  const location = value as Partial<Location>;
  return typeof location.name === "string" && typeof location.country === "string"
    && typeof location.latitude === "number" && Number.isFinite(location.latitude)
    && typeof location.longitude === "number" && Number.isFinite(location.longitude);
}

function isWeatherData(value: unknown): value is WeatherData {
  if (!value || typeof value !== "object") return false;
  const weather = value as Partial<WeatherData>;
  const numberKeys = ["temperatureMax", "temperatureMin", "precipitationProbability", "windSpeed", "rain"] as const;
  const hourNumberKeys = ["temperature", "apparentTemperature", "precipitationProbability", "weatherCode", "windSpeed", "humidity"] as const;
  return isLocation(weather.location) && typeof weather.timezone === "string"
    && typeof weather.updatedAt === "string" && Boolean(weather.current)
    && typeof weather.current?.time === "string" && typeof weather.current.temperature === "number" && Number.isFinite(weather.current.temperature)
    && Array.isArray(weather.days) && weather.days.length > 0
    && weather.days.every((day) => day && typeof day.date === "string"
      && numberKeys.every((key) => typeof day[key] === "number" && Number.isFinite(day[key]))
      && Array.isArray(day.hours) && day.hours.length > 0
      && day.hours.every((hour) => hour && typeof hour.time === "string" && hourNumberKeys.every((key) => typeof hour[key] === "number" && Number.isFinite(hour[key]))));
}

function readCache(): Cache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Cache>;
    if (!isWeatherData(parsed.data) || typeof parsed.savedAt !== "number" || !Number.isFinite(parsed.savedAt)) throw new Error("Invalid weather cache");
    return { data: parsed.data, savedAt: parsed.savedAt };
  } catch {
    try { localStorage.removeItem(CACHE_KEY); } catch { /* Storage may be unavailable. */ }
    return null;
  }
}

function readSavedLocation(): Location | null {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isLocation(parsed)) throw new Error("Invalid saved location");
    return parsed;
  } catch {
    try { localStorage.removeItem(LOCATION_KEY); } catch { /* Storage may be unavailable. */ }
    return null;
  }
}

function normalizeWeatherError(cause: unknown) {
  if (cause instanceof Error && cause.name === "TimeoutError") return "The weather service took too long to answer.";
  return "We couldn’t reach the forecast. Check your connection and try again.";
}

export function useWeather() {
  const [location, setLocationState] = useState<Location>(AUCKLAND);
  const [data, setData] = useState<WeatherData | null>(null);
  const [primaryStatus, setPrimaryStatus] = useState<LoadingStatus>("idle");
  const [locationStatus, setLocationStatus] = useState<LocationRequestStatus>("idle");
  const [pendingLocation, setPendingLocation] = useState<Location | null>(null);
  const [failedLocation, setFailedLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [cached, setCached] = useState(false);
  const [slow, setSlow] = useState(false);
  const dataRef = useRef<WeatherData | null>(null);
  const locationRef = useRef<Location>(AUCKLAND);
  const mountedRef = useRef(false);
  const controllers = useRef<Record<RequestChannel, AbortController | null>>({ primary: null, location: null });
  const requestIds = useRef<Record<RequestChannel, number>>({ primary: 0, location: 0 });

  const commitWeather = useCallback((next: WeatherData, target: Location, fromCache: boolean) => {
    dataRef.current = next;
    locationRef.current = target;
    setData(next);
    setLocationState(target);
    setCached(fromCache);
    announceWeather(next);
  }, []);

  const load = useCallback(async (target: Location, force = false, channel: RequestChannel = "primary") => {
    const requestId = requestIds.current[channel] + 1;
    requestIds.current[channel] = requestId;
    controllers.current[channel]?.abort();
    const controller = new AbortController();
    controllers.current[channel] = controller;
    const setStatus = channel === "primary" ? setPrimaryStatus : setLocationStatus;
    const setChannelError = channel === "primary" ? setError : setLocationError;
    const targetCache = readCache();
    const matchingCache = targetCache && sameLocation(targetCache.data.location, target) ? targetCache : null;

    if (!force && matchingCache && Date.now() - matchingCache.savedAt < MAX_AGE) {
      if (mountedRef.current) {
        commitWeather(matchingCache.data, target, true);
        setStatus("success");
      }
      return matchingCache.data;
    }

    if (channel === "location") {
      setPendingLocation(target);
      setFailedLocation(null);
      setLocationStatus("switching");
    } else setPrimaryStatus("loading");
    setChannelError(null);
    const slowTimer = channel === "primary" ? window.setTimeout(() => {
      if (mountedRef.current && requestIds.current.primary === requestId && !dataRef.current) setSlow(true);
    }, SLOW_THRESHOLD_MS) : null;

    try {
      const next = await fetchWeather(target, controller.signal);
      if (!mountedRef.current || requestIds.current[channel] !== requestId) return null;
      commitWeather(next, target, false);
      setOffline(false);
      setStatus("success");
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: next, savedAt: Date.now() } satisfies Cache)); } catch { /* Fresh data still renders without caching. */ }
      if (channel === "location") try { localStorage.setItem(LOCATION_KEY, JSON.stringify(target)); } catch { /* Persistence is optional. */ }
      return next;
    } catch (cause) {
      if (!mountedRef.current || requestIds.current[channel] !== requestId) return null;
      if (cause instanceof Error && cause.name === "AbortError") {
        if (channel === "location") setLocationStatus("cancelled");
        else setPrimaryStatus(dataRef.current ? "success" : "idle");
        return null;
      }
      if (process.env.NODE_ENV === "development") console.error(`[weather] ${channel} request failed`, cause);
      if (matchingCache) {
        commitWeather(matchingCache.data, target, true);
        setOffline(true);
        setStatus("success");
        return matchingCache.data;
      }
      if (channel === "primary" && dataRef.current) {
        setOffline(true);
        setStatus("success");
        return dataRef.current;
      }
      setChannelError(normalizeWeatherError(cause));
      if (channel === "location") {
        setFailedLocation(target);
        setLocationError(cause instanceof Error && cause.name === "TimeoutError"
          ? `That location is taking longer than expected. Your ${locationRef.current.name} forecast is still available.`
          : `I couldn’t load weather for ${target.name}. Your ${locationRef.current.name} forecast is still available.`);
      }
      setStatus("error");
      if (channel === "primary" && !dataRef.current) window.dispatchEvent(new Event("atmos-weather-error"));
      return null;
    } finally {
      if (slowTimer !== null) window.clearTimeout(slowTimer);
      if (mountedRef.current && requestIds.current[channel] === requestId) {
        setSlow(false);
        if (channel === "location") setPendingLocation(null);
      }
    }
  }, [commitWeather]);

  useEffect(() => {
    mountedRef.current = true;
    let active = true;
    const controllerRegistry = controllers.current;
    const availableCache = readCache();
    if (availableCache) queueMicrotask(() => {
      if (active && mountedRef.current) commitWeather(availableCache.data, availableCache.data.location, true);
    });

    const start = async () => {
      const aucklandWeather = await load(AUCKLAND, true, "primary");
      if (!active || !mountedRef.current || !aucklandWeather) return;
      const savedLocation = readSavedLocation();
      if (savedLocation && !sameLocation(savedLocation, AUCKLAND)) void load(savedLocation, true, "location");
    };
    void start();

    const online = () => { setOffline(false); void load(dataRef.current?.location ?? AUCKLAND, true, "primary"); };
    const offlineHandler = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineHandler);
    return () => {
      active = false;
      mountedRef.current = false;
      controllerRegistry.primary?.abort();
      controllerRegistry.location?.abort();
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineHandler);
    };
  }, [commitWeather, load]);

  const setLocation = useCallback((next: Location) => {
    if (getLocationKey(next) === getLocationKey(location) || (pendingLocation && getLocationKey(next) === getLocationKey(pendingLocation))) return;
    void load(next, true, "location");
  }, [load, location, pendingLocation]);

  const cancelLocationSwitch = useCallback(() => {
    requestIds.current.location += 1;
    controllers.current.location?.abort();
    setPendingLocation(null);
    setLocationStatus("cancelled");
    setLocationError(null);
  }, []);

  const retryLocation = useCallback(() => {
    if (failedLocation) void load(failedLocation, true, "location");
  }, [failedLocation, load]);

  const dismissLocationError = useCallback(() => {
    setLocationStatus("idle");
    setLocationError(null);
    setFailedLocation(null);
  }, []);

  const useAuckland = useCallback(() => {
    try { localStorage.setItem(LOCATION_KEY, JSON.stringify(AUCKLAND)); } catch { /* Remembering the location is optional. */ }
    setLocationState(AUCKLAND);
    locationRef.current = AUCKLAND;
    void load(AUCKLAND, true, "primary");
  }, [load]);

  const loadingState = useMemo<AppLoadingState>(() => ({
    primaryWeather: primaryStatus === "idle" || primaryStatus === "loading",
    location: locationStatus === "switching" || locationStatus === "searching",
    analytics: false,
    microclimates: false,
  }), [locationStatus, primaryStatus]);
  const loading = loadingState.primaryWeather && data === null;
  const refreshing = data !== null && (primaryStatus === "loading" || locationStatus === "switching");

  return {
    location, committedLocation: location, pendingLocation, failedLocation, data, loading, loadingState, primaryStatus, locationStatus, refreshing,
    error, locationError, offline, cached, slow, setLocation, cancelLocationSwitch, retryLocation, dismissLocationError, useAuckland,
    refresh: () => load(dataRef.current?.location ?? location, true, "primary"),
  };
}
