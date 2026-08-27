"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import { multilingualGreetings, type MultilingualGreeting } from "@/lib/multilingualGreetings";

const GREETING_HOLD_MS = 5000;
const TYPE_LATIN_MS = 55;
const TYPE_NATIVE_MS = 70;
const BACKSPACE_MS = 38;
const BETWEEN_WORDS_MS = 120;
const HISTORY_KEY = "weather-app-recent-greetings";
const LATIN_LOCALES = new Set(["en", "mi", "es", "vi", "pt", "la", "fr", "ms"]);

type RotatingGreetingProps = { className?: string };
type Phase = "typing" | "holding" | "backspacing";

function splitGraphemes(text: string, locale: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(locale, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }
  return Array.from(text);
}

function randomIndex(max: number) {
  if (max <= 1) return 0;
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % max;
}

function shuffledBag(excludedId: string, recentIds: string[]) {
  const recent = new Set(recentIds.slice(-5));
  const preferred = multilingualGreetings.filter(({ id }) => id !== excludedId && !recent.has(id));
  const remaining = multilingualGreetings.filter(({ id }) => id !== excludedId && recent.has(id));
  const items = [...preferred, ...remaining];
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function readHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(-5) : [];
  } catch {
    return [];
  }
}

function saveHistory(ids: string[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(ids.slice(-5))); } catch { /* Storage is optional. */ }
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const onAbort = () => { window.clearTimeout(timer); resolve(); };
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function RotatingGreeting({ className = "" }: RotatingGreetingProps) {
  const reducedMotion = useReducedMotion();
  const initialGreeting = multilingualGreetings.find(({ id }) => id === "maori") ?? multilingualGreetings[0];
  const [greeting, setGreeting] = useState<MultilingualGreeting>(initialGreeting);
  const [typedText, setTypedText] = useState(initialGreeting.text);
  const [phase, setPhase] = useState<Phase>("holding");

  useEffect(() => {
    if (reducedMotion) return;
    const controller = new AbortController();

    const rotate = async () => {
      let current = initialGreeting;
      let history = readHistory();
      let bag = shuffledBag(current.id, history);

      while (!controller.signal.aborted) {
        setPhase("holding");
        await wait(GREETING_HOLD_MS, controller.signal);
        if (controller.signal.aborted) return;

        const currentGraphemes = splitGraphemes(current.text, current.locale);
        setPhase("backspacing");
        for (let length = currentGraphemes.length - 1; length >= 0 && !controller.signal.aborted; length -= 1) {
          setTypedText(currentGraphemes.slice(0, length).join(""));
          await wait(BACKSPACE_MS, controller.signal);
        }
        await wait(BETWEEN_WORDS_MS, controller.signal);
        if (controller.signal.aborted) return;

        if (bag.length === 0) bag = shuffledBag(current.id, history);
        const next = bag.shift() ?? initialGreeting;
        current = next.id === current.id
          ? multilingualGreetings.find(({ id }) => id !== current.id) ?? initialGreeting
          : next;
        setGreeting(current);
        setPhase("typing");
        const nextGraphemes = splitGraphemes(current.text, current.locale);
        const typeDelay = LATIN_LOCALES.has(current.locale) ? TYPE_LATIN_MS : TYPE_NATIVE_MS;
        for (let length = 1; length <= nextGraphemes.length && !controller.signal.aborted; length += 1) {
          setTypedText(nextGraphemes.slice(0, length).join(""));
          await wait(typeDelay, controller.signal);
        }
        history = [...history, current.id].slice(-5);
        saveHistory(history);
      }
    };

    void rotate();
    return () => controller.abort();
  }, [initialGreeting, reducedMotion]);

  const isLatin = LATIN_LOCALES.has(greeting.locale);
  const isLong = useMemo(() => splitGraphemes(greeting.text, greeting.locale).length > 10, [greeting]);

  return (
    <span className={`multilingual-greeting-shell ${isLong ? "is-long" : ""}`}>
      <span className={`multilingual-greeting ${isLatin ? className : ""}`} dir={greeting.direction} lang={greeting.locale}>
        <span>{typedText}</span>
        {!reducedMotion && phase !== "holding" && <span className="multilingual-cursor" aria-hidden />}
      </span>
    </span>
  );
}
