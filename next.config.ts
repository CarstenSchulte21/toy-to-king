import { execSync } from "node:child_process";
import type { NextConfig } from "next";

// Version im Spiel (Tester-Wunsch 27.09.2026): Ohne sichtbare Version weiß niemand, ob er
// gerade den neuen Stand spielt oder den alten aus dem Browser-Cache.
// Auf Vercel kommt der Commit aus der Umgebung, lokal aus git, sonst heißt es schlicht "lokal".
function buildVersion(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (sha) return sha.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "lokal";
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BUILD: buildVersion(),
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 10),
  },
};

export default nextConfig;
