import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "dist/**", "android/**", ".android-sdk/**", ".android-sdk-download/**", ".gradle-cache/**", "artifacts/**", "build/**", "next-env.d.ts"]),
]);
