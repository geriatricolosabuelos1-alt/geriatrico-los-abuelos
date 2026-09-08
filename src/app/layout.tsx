import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Geriátrico Los Abuelos",
  description: "Sistema de gestión para el geriátrico Los Abuelos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${publicSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-panel text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
