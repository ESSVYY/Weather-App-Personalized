"use client";

import Link from "next/link";
import { ArrowDown, BrainCircuit, Sparkles } from "lucide-react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getGreetingTheme, getWeatherGreeting, greetingThemeGradients } from "@/lib/greetingThemes";
import { softEase } from "@/lib/animationConfig";
import type { WeatherData } from "@/types/weather";
import { RotatingGreeting } from "@/components/greeting/RotatingGreeting";
import { chooseWeatherJoke, weatherJokes } from "@/lib/weatherJokes";
import { DEFAULT_DISPLAY_NAME, DISPLAY_NAME_CHANGED_EVENT, DISPLAY_NAME_STORAGE_KEY, normalizeDisplayName, visibleDisplayName } from "@/lib/profile";

type StoredCache = { data?: WeatherData };

export function GreetingSection({ scriptClassName }: { scriptClassName: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherFailed, setWeatherFailed] = useState(false);
  const [scrollStarted, setScrollStarted] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [joke, setJoke] = useState(weatherJokes[0]);
  const [displayName, setDisplayName] = useState(DEFAULT_DISPLAY_NAME);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const contentOpacity = useTransform(scrollYProgress, [0, 0.48, 0.92], [1, 0.92, 0]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : -52]);
  const atmosphereY = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : 38]);

  useEffect(() => {
    const nameChanged = (event: Event) => setDisplayName(normalizeDisplayName((event as CustomEvent<string>).detail));
    try {
      const savedName = localStorage.getItem(DISPLAY_NAME_STORAGE_KEY);
      if (savedName !== null) queueMicrotask(() => setDisplayName(normalizeDisplayName(savedName)));
    } catch { /* The default name remains available without storage. */ }
    window.addEventListener(DISPLAY_NAME_CHANGED_EVENT, nameChanged);
    return () => window.removeEventListener(DISPLAY_NAME_CHANGED_EVENT, nameChanged);
  }, []);

  useEffect(() => {
    const readCache = () => {
      try {
        const raw = localStorage.getItem("atmos-weather-cache-v1");
        const cached = raw ? JSON.parse(raw) as StoredCache : null;
        if (cached?.data?.current && typeof cached.data.current.temperature === "number" && Array.isArray(cached.data.days) && cached.data.days.length) setWeather(cached.data);
      } catch { /* A corrupt cache should never block the welcome screen. */ }
    };
    const updated = (event: Event) => { setWeather((event as CustomEvent<WeatherData>).detail); setWeatherFailed(false); };
    const failed = () => setWeatherFailed(true);
    const visibility = () => setPageVisible(!document.hidden);
    queueMicrotask(() => { readCache(); setPageVisible(!document.hidden); });
    window.addEventListener("atmos-weather-updated", updated);
    window.addEventListener("atmos-weather-error", failed);
    document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener("atmos-weather-updated", updated); window.removeEventListener("atmos-weather-error", failed); document.removeEventListener("visibilitychange", visibility); };
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (value) => { if (value > 0.025 && !scrollStarted) setScrollStarted(true); });

  const theme = useMemo(() => getGreetingTheme(weather), [weather]);
  const sentence = getWeatherGreeting(weather, weatherFailed);
  const scrollToWeather = () => document.getElementById("weather")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });

  useEffect(() => {
    try {
      const previousId = localStorage.getItem("atmos-last-weather-joke") ?? undefined;
      const next = chooseWeatherJoke(theme, previousId);
      localStorage.setItem("atmos-last-weather-joke", next.id);
      queueMicrotask(() => setJoke(next));
    } catch { /* Keep the deterministic first joke if storage or randomness is unavailable. */ }
  }, [theme]);

  return (
    <section ref={sectionRef} className={`greeting-section greeting-${theme}`} aria-labelledby="greeting-name">
      <motion.div className="greeting-atmosphere" style={{ y: atmosphereY }} aria-hidden>
        <span className="greeting-glow glow-one" /><span className="greeting-glow glow-two" />
        <div className="greeting-cloud cloud-one"><i /><i /><i /></div>
        <div className="greeting-cloud cloud-two"><i /><i /></div>
        <div className="greeting-haze" />
      </motion.div>
      <div className="hero-contrast-veil" aria-hidden="true" />
      <nav className="greeting-actions" aria-label="Explore Atmos">
        <Link href="/analysis" className="about-pill intelligence-pill"><BrainCircuit aria-hidden /> Weather Intelligence</Link>
        <Link href="/about" className="about-pill"><Sparkles aria-hidden /> About Me</Link>
      </nav>
      <motion.div className="greeting-content" style={{ opacity: contentOpacity, y: contentY }}>
        <div className="greeting-script" role="img" aria-label={`Welcome, ${visibleDisplayName(displayName)}.`}>
          <span aria-hidden="true"><RotatingGreeting className={scriptClassName} /></span>
        </div>
        <motion.h1 id="greeting-name" className="greeting-name" style={{ backgroundImage: greetingThemeGradients[theme] }} initial={{ opacity: 0, y: reducedMotion ? 0 : 18, filter: reducedMotion ? "blur(0px)" : "blur(7px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: reducedMotion ? .25 : .68, delay: reducedMotion ? .04 : .2, ease: softEase }}>
          {visibleDisplayName(displayName).toLocaleUpperCase()}<span className="name-shine" aria-hidden />
        </motion.h1>
        <motion.div className="greeting-support" initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: reducedMotion ? .08 : .72, ease: softEase }} aria-live="polite">
          <p>{sentence}</p><span className="weather-joke">“{joke.text}”</span>
        </motion.div>
      </motion.div>
      <motion.button className={`scroll-indicator ${scrollStarted ? "stopped" : ""} ${pageVisible ? "" : "paused"}`} onClick={scrollToWeather} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reducedMotion ? .08 : 1.15, duration: .5 }} aria-label="Scroll to see the live weather">
        <span>Scroll to see the weather</span><ArrowDown aria-hidden />
      </motion.button>
    </section>
  );
}
