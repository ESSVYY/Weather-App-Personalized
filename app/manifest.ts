import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atmos — Auckland Weather", short_name: "Atmos", description: "A cinematic live weather forecast.",
    start_url: "/", display: "standalone", background_color: "#294f70", theme_color: "#497da6",
    orientation: "portrait-primary", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }],
  };
}
