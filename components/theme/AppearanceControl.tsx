"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useRef } from "react";
import { useAppearance } from "@/components/theme/ThemeProvider";
import type { AppearancePreference } from "@/lib/theme";

const options: Array<{ value: AppearancePreference; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function AppearanceControl() {
  const { preference, setPreference } = useAppearance();
  const group = useRef<HTMLDivElement>(null);
  const moveSelection = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = options.findIndex((option) => option.value === preference);
    const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (current + (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
    setPreference(options[next].value);
    group.current?.querySelector<HTMLButtonElement>(`[data-appearance="${options[next].value}"]`)?.focus();
  };
  return <section className="appearance-setting" aria-labelledby="appearance-title">
    <div className="settings-section-heading"><span>INTERFACE</span><h3 id="appearance-title">Appearance</h3></div>
    <div ref={group} className="appearance-control" role="radiogroup" aria-label="Appearance preference" onKeyDown={moveSelection}>
      {options.map(({ value, label, icon: Icon }) => <button key={value} data-appearance={value} type="button" role="radio" aria-checked={preference === value} tabIndex={preference === value ? 0 : -1} className={preference === value ? "selected" : ""} onClick={() => setPreference(value)}><Icon aria-hidden /><span>{label}</span><i aria-hidden /></button>)}
    </div>
    <p>System follows your device and updates automatically.</p>
  </section>;
}
