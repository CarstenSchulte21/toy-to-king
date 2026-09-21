import type { Metadata, Viewport } from "next";
import "@fontsource/vt323";
import "@fontsource/pixelify-sans";
import "@/ui/game.css";

export const metadata: Metadata = {
  title: "TOY TO KING",
  description: "Retro-Graffiti-Adventure",
  appleWebApp: { capable: true, title: "TOY TO KING", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
