import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OMRI & OPAL | Our Story",
  description: "A celebration of our journey together.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground transition-colors duration-500 overflow-x-hidden">
        {/* Full-width content without legacy sidebar */}
        <main className="w-full min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
