"use client";

/**
 * Platform Context
 *
 * Provides platform detection info throughout the app.
 * Used to conditionally hide upgrade/subscription UI in native apps.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { detectPlatform, type PlatformInfo } from "@/lib/platform";

// Default value for SSR
const defaultPlatformInfo: PlatformInfo = {
  isNativeApp: false,
  platform: "web",
  isIOS: false,
  isAndroid: false,
  isWeb: true,
};

const PlatformContext = createContext<PlatformInfo>(defaultPlatformInfo);

interface PlatformProviderProps {
  children: ReactNode;
}

export function PlatformProvider({ children }: PlatformProviderProps) {
  const [platformInfo, setPlatformInfo] =
    useState<PlatformInfo>(defaultPlatformInfo);

  useEffect(() => {
    // Detect platform on client side
    setPlatformInfo(detectPlatform());
  }, []);

  return (
    <PlatformContext.Provider value={platformInfo}>
      {children}
    </PlatformContext.Provider>
  );
}

/**
 * Hook to get platform information
 *
 * @example
 * const { isNativeApp, platform } = usePlatform();
 * if (isNativeApp) {
 *   // Hide upgrade UI
 * }
 */
export function usePlatform(): PlatformInfo {
  return useContext(PlatformContext);
}

/**
 * Hook to check if upgrade UI should be shown
 *
 * @example
 * const showUpgrade = useShowUpgradeUI();
 * if (showUpgrade) {
 *   return <UpgradeButton />;
 * }
 */
export function useShowUpgradeUI(): boolean {
  const { isNativeApp } = usePlatform();
  return !isNativeApp;
}
