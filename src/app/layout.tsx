import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/shared/Providers";
import { AuthProvider } from "@/components/shared/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FamilyFy | Smart Family Finance",
  description: "Secure, collaborative finance tracking for dual-income households. Manage income, expenses, and goals together.",
};

import ThemeProvider from "@/components/shared/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <AuthProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
