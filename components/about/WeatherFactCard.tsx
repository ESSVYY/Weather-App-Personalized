"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { factTransition } from "@/lib/animationConfig";
import { getRandomWeatherFact } from "@/lib/getRandomWeatherFact";
import type { WeatherFact } from "@/lib/weatherFacts";

const LAST_FACT_KEY = "atmos-last-weather-fact";

export function WeatherFactCard() {
  const [fact, setFact] = useState<WeatherFact | null>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    queueMicrotask(() => {
      let previous: string | undefined;
      try { previous = sessionStorage.getItem(LAST_FACT_KEY) ?? undefined; } catch { /* Session storage is optional. */ }
      const next = getRandomWeatherFact(previous);
      try { sessionStorage.setItem(LAST_FACT_KEY, next.id); } catch { /* The fact still renders without persistence. */ }
      setFact(next);
    });
  }, []);
  const another = () => {
    const next = getRandomWeatherFact(fact?.id);
    try { sessionStorage.setItem(LAST_FACT_KEY, next.id); } catch { /* The fact still changes without persistence. */ }
    setFact(next);
  };
  return (
    <section className="about-section fact-section" aria-labelledby="weather-fact-heading">
      <div className="about-eyebrow">A SMALL WONDER</div><h2 id="weather-fact-heading">Weather fact</h2>
      <div className="weather-fact-card">
        <span className="fact-quote open" aria-hidden>“</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={fact?.id ?? "loading"} initial={{ opacity: 0, y: reducedMotion ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -5 }} transition={reducedMotion ? { duration: .12 } : factTransition}>
            <blockquote>{fact ? `“${fact.fact}”` : "Selecting a weather fact…"}</blockquote>
            {fact && <p>{fact.region}</p>}
          </motion.div>
        </AnimatePresence>
        <span className="fact-quote close" aria-hidden>”</span>
        <button onClick={another} disabled={!fact}><RefreshCw aria-hidden /> Show another fact</button>
      </div>
    </section>
  );
}
