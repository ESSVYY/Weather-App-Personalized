import Link from "next/link";
import { ArrowLeft, CloudSun, ExternalLink, MapPin, Sparkles } from "lucide-react";
import packageJson from "@/package.json";
import { WeatherFactCard } from "@/components/about/WeatherFactCard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "About Me", description: "Meet Saksham Varma, the designer and developer of Atmos Weather." };

const features = ["Current temperature", "Feels-like temperature", "Hourly conditions", "Today and the next seven days", "Rain probability and rainfall", "Wind speed and direction", "Humidity", "UV index", "Sunrise and sunset", "Location search", "Lightweight weather-responsive animations"];

export default function AboutPage() {
  return (
    <main className="about-page">
      <div className="about-sky" aria-hidden><span /><span /><i /></div>
      <div className="about-shell">
        <header className="about-header"><Link href="/" className="about-back"><ArrowLeft aria-hidden /> Back to weather</Link><div className="about-mark" aria-hidden><CloudSun /></div></header>
        <section className="about-hero" aria-labelledby="about-title"><div className="about-eyebrow"><Sparkles aria-hidden /> ABOUT THE CREATOR</div><h1 id="about-title">About Me</h1><p className="about-intro">Hello, I’m Saksham Varma.</p><p>I am a Business Analytics graduate from the University of Auckland and the designer and developer of this weather app.</p><p>I created this app to make everyday weather information feel clearer, calmer, and more personal. It combines live forecast data with lightweight animation, thoughtful interaction, and a design that responds to the weather around you.</p></section>

        <div className="about-grid">
          <section className="about-section"><div className="about-eyebrow">THE IDEA</div><h2>Why I made this app</h2><p>Weather apps often show a large amount of information at once. I wanted to create a simpler experience that makes temperature, rain, wind, and the coming week easy to understand without feeling overwhelming.</p></section>
          <section className="about-section"><div className="about-eyebrow">EVERYDAY FORECASTING</div><h2>What the app provides</h2><ul className="feature-list">{features.map((feature) => <li key={feature}>{feature}</li>)}</ul></section>
          <section className="about-section"><div className="about-eyebrow">LIVE INFORMATION</div><h2>Weather data</h2><p>Weather information is provided using Open-Meteo. The app regularly requests updated forecast information for the selected location and presents it in a clear visual format.</p><a className="external-link" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Visit Open-Meteo <ExternalLink aria-hidden /></a></section>
          <section className="about-section"><div className="about-eyebrow">YOUR CHOICE</div><h2>Location and privacy</h2><p>Location access is optional. You can use Auckland as the default location, search for another place, or allow the app to use your device location. The most recently selected location may be stored on your device so the app can remember it later.</p></section>
        </div>

        <WeatherFactCard />

        <section className="about-section author-section"><div><div className="about-eyebrow">APP DETAILS</div><h2>Made in Auckland</h2><p>A calm weather experience designed around useful information and thoughtful interaction.</p></div><dl><div><dt>Created by</dt><dd>Saksham Varma</dd></div><div><dt>Education</dt><dd>Business Analytics, University of Auckland</dd></div><div><dt>Weather provider</dt><dd>Open-Meteo</dd></div><div><dt>Default location</dt><dd>Auckland, New Zealand</dd></div><div><dt>Version</dt><dd>{packageJson.version}</dd></div></dl></section>
        <section className="disclaimer"><MapPin aria-hidden /><div><h2>Forecast disclaimer</h2><p>Weather forecasts are estimates and can change as new information becomes available. For severe weather warnings, emergencies, marine conditions, or safety decisions in New Zealand, always check official local weather and emergency services.</p><a className="external-link" href="https://www.metservice.com/" target="_blank" rel="noopener noreferrer">Check official New Zealand weather warnings <ExternalLink aria-hidden /></a></div></section>
        <footer className="about-footer"><span>Atmos Weather</span><Link href="/">Return to the live forecast</Link></footer>
      </div>
    </main>
  );
}
