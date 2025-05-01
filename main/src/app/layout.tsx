import type { Metadata } from "next";
import "./globals.css";
import { Playfair_Display, Montserrat } from 'next/font/google';
import { cn } from "@/lib/utils";

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  variable: '--font-montserrat'
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-playfair'
});


export const metadata: Metadata = {
  title: "Your Art Store",
  description: "Unique artwork for sale",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          montserrat.variable,
          playfair.variable
        )}
      >
        {children}
      </body>
    </html>
  );
}