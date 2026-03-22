import type { Metadata } from "next";
import { Inter, Playfair_Display, Assistant } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "OMRI & OPAL | הסיפור שלנו",
  description: "חוגגים את המסע שלנו יחד.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${inter.variable} ${playfair.variable} ${assistant.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground transition-colors duration-500 overflow-x-hidden font-assistant">
        {/* Full-width content without legacy sidebar */}
        <main className="w-full min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
