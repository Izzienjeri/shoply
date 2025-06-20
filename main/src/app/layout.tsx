import type { Metadata } from "next";
import "./globals.css";
import { Playfair_Display, Montserrat } from 'next/font/google';
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ConditionalNavbarWrapper } from "@/components/layout/ConditionalNavbarWrapper";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/sonner";
import { SocketProvider } from "@/contexts/SocketContext";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { NotificationProvider } from "@/contexts/NotificationContext";
import MotionMainWrapper from "@/components/layout/MotionMainWrapper";

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-montserrat'
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-playfair'
});

export const metadata: Metadata = {
  title: "Artistry Haven",
  description: "Discover and purchase unique artwork online.",
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
          "min-h-screen font-sans antialiased flex flex-col",
          "bg-[url('/images/backgroundimage.jpg')] bg-cover bg-center bg-no-repeat bg-fixed",
          montserrat.variable,
          playfair.variable
        )}
      >
        <QueryProvider>
          <AuthProvider>
            <CartProvider>
              <SocketProvider>
                <NotificationProvider>
                  <ConditionalNavbarWrapper />
                  <MotionMainWrapper>
                    {children}
                  </MotionMainWrapper>
                  <Footer />
                  <Toaster richColors position="top-right" />
                </NotificationProvider>
              </SocketProvider>
            </CartProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}