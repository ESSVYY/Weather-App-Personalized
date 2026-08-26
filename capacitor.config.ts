import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sakshamvarma.atmosweather",
  appName: "Atmos Weather",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;
