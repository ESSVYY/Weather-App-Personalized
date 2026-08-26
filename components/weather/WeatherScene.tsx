import { RainCanvas } from "@/components/effects/RainCanvas";
import { weatherKind } from "@/lib/weatherCodes";
import type { QualityMode, WeatherDay } from "@/types/weather";

export function WeatherScene({ day, isDay, quality }: { day: WeatherDay; isDay: boolean; quality: QualityMode }) {
  const kind = weatherKind(day.weatherCode);
  const wet = kind === "rain" || kind === "storm";
  return (
    <div className={`weather-scene theme-${kind} ${isDay ? "day" : "night"}`} aria-hidden>
      <div className="ambient-glow" />
      <div className="atmosphere" />
      {quality !== "battery" && <>
        <div className="cloud-layer cloud-back"><i /><i /><i /></div>
        <div className="cloud-layer cloud-mid"><i /><i /></div>
        {quality === "high" && <div className="cloud-layer cloud-front"><i /><i /></div>}
      </>}
      <div className="horizon">
        <span className="rangitoto" /><span className="tower" /><span className="city city-one" /><span className="city city-two" />
        <span className="bridge" /><span className="water" />
      </div>
      {wet && <RainCanvas intensity={Math.max(.4, day.rain / 12)} wind={day.windDirection} quality={quality} />}
      {kind === "fog" && <div className="fog-layer" />}
      <div className="scene-vignette" />
    </div>
  );
}
