import { Borel } from "next/font/google";
import WeatherApp from "@/components/weather/WeatherApp";
import { GreetingSection } from "@/components/greeting/GreetingSection";

const borel = Borel({ weight: "400", subsets: ["latin"], display: "swap" });

export default function Home() {
  return <main className="home-experience"><GreetingSection scriptClassName={borel.className} /><section id="weather" className="weather-section" aria-label="Live weather forecast"><WeatherApp /></section></main>;
}
