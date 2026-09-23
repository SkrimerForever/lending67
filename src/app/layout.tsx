import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Butterfly — Particle Study",
  description: "A monochrome particle formation study.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
