import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TOY TO KING",
  description: "Retro-Graffiti-Adventure",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
