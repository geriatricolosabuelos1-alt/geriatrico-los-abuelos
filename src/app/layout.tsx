import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Vektor Geriatrixs · Los Abuelos",
  description: "Sistema de gestión para el geriátrico Los Abuelos",
  icons: {
    icon: "/favicon-vektor.png",
    shortcut: "/favicon-vektor.png",
    apple: "/logo-vektor.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-panel text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
