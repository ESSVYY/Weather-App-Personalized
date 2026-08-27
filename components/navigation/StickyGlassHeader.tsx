"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrainCircuit, CloudSun, Info, MapPin, Search, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { WeatherData } from "@/types/weather";

export function StickyGlassHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [compact, setCompact] = useState(false);
  const [locationName, setLocationName] = useState("Auckland");
  const frame = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("atmos-weather-cache-v1");
      const parsed = raw ? JSON.parse(raw) as { data?: WeatherData } : null;
      if (parsed?.data?.location?.name) queueMicrotask(() => setLocationName(parsed.data!.location.name));
    } catch { /* Auckland remains the safe header label. */ }
    const weatherUpdated = (event: Event) => setLocationName((event as CustomEvent<WeatherData>).detail.location.name);
    const scroll = () => {
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => { frame.current = null; setCompact(window.scrollY > 72); });
    };
    window.addEventListener("atmos-weather-updated", weatherUpdated);
    window.addEventListener("scroll", scroll, { passive: true });
    scroll();
    return () => { if (frame.current !== null) cancelAnimationFrame(frame.current); window.removeEventListener("atmos-weather-updated", weatherUpdated); window.removeEventListener("scroll", scroll); };
  }, []);

  const openSearch = () => {
    if (pathname === "/") window.dispatchEvent(new Event("atmos-open-location-search"));
    else router.push("/?search=1#weather");
  };

  const openSettings = () => {
    if (pathname === "/") window.dispatchEvent(new Event("atmos-open-settings"));
    else router.push("/?settings=1#weather");
  };

  return <header className={`glass-header-shell ${compact ? "compact" : ""}`}>
    <div className="glass-header">
      <Link className="glass-brand" href="/" aria-label="Atmos weather home"><CloudSun aria-hidden /><span><b>ATMOS</b><small>Weather, interpreted</small></span></Link>
      <button className="glass-location" onClick={openSearch} aria-label={`Change location, currently ${locationName}`}><MapPin aria-hidden /><span>{locationName}</span></button>
      <nav aria-label="Primary navigation">
        <Link className={`glass-button ${pathname === "/" ? "active" : ""}`} href="/#weather"><CloudSun aria-hidden /><span>Weather</span></Link>
        <Link className={`glass-button ${pathname === "/analysis" ? "active" : ""}`} href="/analysis"><BrainCircuit aria-hidden /><span>Intelligence</span></Link>
        <Link className={`glass-button ${pathname === "/about" ? "active" : ""}`} href="/about"><Info aria-hidden /><span>About Me</span></Link>
        <button className="glass-button search" onClick={openSearch} aria-label="Search for a city"><Search aria-hidden /></button>
        <button className="glass-button search" onClick={openSettings} aria-label="Open visual settings"><Settings aria-hidden /></button>
      </nav>
    </div>
  </header>;
}
