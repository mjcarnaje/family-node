import { useState, useEffect, useCallback } from "react";

/**
 * Breakpoint values that match Tailwind's default breakpoints
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

interface MobileDetectState {
  /** True if viewport width is less than md breakpoint (768px) */
  isMobile: boolean;
  /** True if viewport width is less than lg breakpoint (1024px) */
  isTablet: boolean;
  /** True if viewport width is >= lg breakpoint (1024px) */
  isDesktop: boolean;
  /** Current viewport width in pixels */
  width: number;
  /** Current viewport height in pixels */
  height: number;
  /** True if the device supports touch events */
  isTouch: boolean;
  /** True if the device is in landscape orientation */
  isLandscape: boolean;
  /** True if the device is in portrait orientation */
  isPortrait: boolean;
}

/**
 * Custom hook for detecting mobile/tablet/desktop viewports and touch support
 * Provides responsive breakpoint detection and orientation information
 */
export function useMobileDetect(): MobileDetectState {
  const [state, setState] = useState<MobileDetectState>(() => {
    // Initial state for SSR - assume desktop
    if (typeof window === "undefined") {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1024,
        height: 768,
        isTouch: false,
        isLandscape: true,
        isPortrait: false,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    return {
      isMobile: width < BREAKPOINTS.md,
      isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
      isDesktop: width >= BREAKPOINTS.lg,
      width,
      height,
      isTouch,
      isLandscape: width > height,
      isPortrait: height >= width,
    };
  });

  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    setState({
      isMobile: width < BREAKPOINTS.md,
      isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
      isDesktop: width >= BREAKPOINTS.lg,
      width,
      height,
      isTouch,
      isLandscape: width > height,
      isPortrait: height >= width,
    });
  }, []);

  useEffect(() => {
    // Run once on mount to get accurate values
    handleResize();

    // Add resize listener with debounce
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener("resize", debouncedResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", debouncedResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [handleResize]);

  return state;
}

/**
 * Hook to check if the viewport matches a specific breakpoint or range
 * @param breakpoint - The breakpoint to check against
 * @param direction - 'up' means >= breakpoint, 'down' means < breakpoint
 */
export function useBreakpoint(
  breakpoint: Breakpoint,
  direction: "up" | "down" = "up"
): boolean {
  const { width } = useMobileDetect();
  const breakpointValue = BREAKPOINTS[breakpoint];

  if (direction === "up") {
    return width >= breakpointValue;
  }
  return width < breakpointValue;
}
