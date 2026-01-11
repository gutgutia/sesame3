/**
 * Platform Detection Utilities
 *
 * Detects whether the app is running in a native Capacitor WebView (iOS/Android)
 * or in a regular web browser. Used to hide subscription/upgrade UI in native
 * apps to avoid Apple's 30% commission.
 */

export type Platform = "web" | "ios" | "android";

export interface PlatformInfo {
  /** Whether running in a native Capacitor app (iOS or Android) */
  isNativeApp: boolean;
  /** The specific platform: 'web', 'ios', or 'android' */
  platform: Platform;
  /** Whether running on iOS (native app) */
  isIOS: boolean;
  /** Whether running on Android (native app) */
  isAndroid: boolean;
  /** Whether running in a web browser */
  isWeb: boolean;
}

/**
 * Capacitor global type (injected by Capacitor in native apps)
 */
declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
      platform?: string;
    };
  }
}

/**
 * Detect the current platform
 *
 * Must be called on the client side (in useEffect or event handlers).
 * Returns web platform info if called during SSR.
 */
export function detectPlatform(): PlatformInfo {
  // SSR safety - assume web during server rendering
  if (typeof window === "undefined") {
    return {
      isNativeApp: false,
      platform: "web",
      isIOS: false,
      isAndroid: false,
      isWeb: true,
    };
  }

  // Check for Capacitor global object
  const capacitor = window.Capacitor;

  if (capacitor?.isNativePlatform?.()) {
    // Running in native Capacitor app
    const platformString = capacitor.getPlatform?.() || capacitor.platform || "";

    if (platformString === "ios") {
      return {
        isNativeApp: true,
        platform: "ios",
        isIOS: true,
        isAndroid: false,
        isWeb: false,
      };
    }

    if (platformString === "android") {
      return {
        isNativeApp: true,
        platform: "android",
        isIOS: false,
        isAndroid: true,
        isWeb: false,
      };
    }

    // Fallback for native but unknown platform
    return {
      isNativeApp: true,
      platform: "ios", // Default to iOS as it's the stricter platform
      isIOS: false,
      isAndroid: false,
      isWeb: false,
    };
  }

  // Running in web browser
  return {
    isNativeApp: false,
    platform: "web",
    isIOS: false,
    isAndroid: false,
    isWeb: true,
  };
}

/**
 * Check if upgrade/subscription UI should be shown
 *
 * Returns false for native apps (to avoid Apple's 30% cut)
 * Returns true for web browsers
 */
export function shouldShowUpgradeUI(): boolean {
  return !detectPlatform().isNativeApp;
}
