import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor Configuration for Sesame3 Mobile App
 *
 * This app uses a Remote WebView approach - it points to the hosted
 * web app rather than bundling static files. This means:
 * - Updates are instant (just deploy to your hosting)
 * - No OTA service needed
 * - Requires internet connection (which Sesame3 needs anyway)
 */

const config: CapacitorConfig = {
  appId: "com.sesame3.app",
  appName: "Sesame3",
  webDir: "out", // Fallback for offline/local testing

  // Point to your production URL
  server: {
    // For production: use your deployed URL
    url: process.env.CAPACITOR_SERVER_URL || "https://sesame3.vercel.app",
    // For local development, you can override with:
    // url: "http://localhost:3000",

    // Allow cleartext (HTTP) for local development
    cleartext: process.env.NODE_ENV !== "production",

    // Handle navigation within the app
    allowNavigation: [
      "sesame3.vercel.app",
      "*.sesame3.com",
      "localhost:3000",
    ],
  },

  // iOS specific configuration
  ios: {
    // Use WKWebView (modern, required for App Store)
    contentInset: "automatic",
    allowsLinkPreview: false,
    backgroundColor: "#ffffff",
    preferredContentMode: "mobile",
  },

  // Android specific configuration
  android: {
    backgroundColor: "#ffffff",
    allowMixedContent: false, // Security: don't allow HTTP content in HTTPS pages
  },

  // Plugin configuration
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "dark", // "dark" = dark text for light backgrounds
      backgroundColor: "#ffffff",
    },
  },
};

export default config;
