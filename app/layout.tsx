import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { DevSwitcher } from "@/components/dev/DevSwitcher";
import { ProfileProvider } from "@/lib/context/ProfileContext";

// Use system fonts with CSS fallbacks (more reliable for CI/build environments)
// The CSS variables are set but fonts load via CSS @font-face or system stack
const inter = localFont({
  src: [
    {
      path: "../public/fonts/Inter-Variable.woff2",
      style: "normal",
    },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
});

const jetbrainsMono = localFont({
  src: [
    {
      path: "../public/fonts/JetBrainsMono-Variable.woff2",
      style: "normal",
    },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "SF Mono", "Menlo", "Consolas", "Liberation Mono", "monospace"],
});

export const metadata: Metadata = {
  title: "Sesame3",
  description: "College prep without the panic.",
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
        <ProfileProvider>
          {children}
          <DevSwitcher />
        </ProfileProvider>
      </body>
    </html>
  );
}
