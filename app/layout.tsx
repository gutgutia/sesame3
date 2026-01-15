import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ProfileProvider } from "@/lib/context/ProfileContext";
import { ToastProvider } from "@/components/ui/Toast";
import { PostHogProvider } from "@/lib/context/PostHogContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sesame3",
  description: "College prep without the panic.",
  openGraph: {
    title: "Sesame3",
    description: "College prep without the panic.",
    url: "https://sesame3.com",
    siteName: "Sesame3",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sesame3 - Your AI College Counselor",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sesame3",
    description: "College prep without the panic.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <PostHogProvider>
            <ToastProvider>
              <ProfileProvider>
                {children}
              </ProfileProvider>
            </ToastProvider>
          </PostHogProvider>
        </Suspense>
      </body>
    </html>
  );
}
