import type { MetadataRoute } from "next";

// PWA-Manifest (F1.7): als App auf dem Homescreen startet das Spiel quer und ohne Browserleisten.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TOY TO KING",
    short_name: "TOY TO KING",
    start_url: "/",
    display: "standalone",
    orientation: "landscape",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
