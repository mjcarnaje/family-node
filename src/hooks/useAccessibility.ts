import { createContext, useContext, useCallback, useState, useEffect, useRef } from "react";

/**
 * Accessibility settings and state management hook
 * Provides high contrast mode, reduced motion, and screen reader support
 */

export interface AccessibilitySettings {
  highContrastMode: boolean;
  reducedMotion: boolean;
  screenReaderMode: boolean;
  keyboardNavigationEnabled: boolean;
}

export interface AccessibilityContextValue extends AccessibilitySettings {
  setHighContrastMode: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setScreenReaderMode: (enabled: boolean) => void;
  setKeyboardNavigationEnabled: (enabled: boolean) => void;
  announceToScreenReader: (message: string, priority?: "polite" | "assertive") => void;
}

const defaultSettings: AccessibilitySettings = {
  highContrastMode: false,
  reducedMotion: false,
  screenReaderMode: false,
  keyboardNavigationEnabled: true,
};

/**
 * Hook to detect user's system accessibility preferences
 */
export function useSystemAccessibilityPreferences(): {
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
} {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    // Check for high contrast preference
    const contrastQuery = window.matchMedia("(prefers-contrast: more)");
    setPrefersHighContrast(contrastQuery.matches);

    const handleContrastChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };

    motionQuery.addEventListener("change", handleMotionChange);
    contrastQuery.addEventListener("change", handleContrastChange);

    return () => {
      motionQuery.removeEventListener("change", handleMotionChange);
      contrastQuery.removeEventListener("change", handleContrastChange);
    };
  }, []);

  return { prefersReducedMotion, prefersHighContrast };
}

/**
 * Hook to manage ARIA live region announcements for screen readers
 */
export function useAriaAnnouncements() {
  const politeRef = useRef<HTMLDivElement | null>(null);
  const assertiveRef = useRef<HTMLDivElement | null>(null);

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      const region = priority === "assertive" ? assertiveRef.current : politeRef.current;
      if (region) {
        // Clear the region first to ensure the announcement is made even for repeated messages
        region.textContent = "";
        // Use requestAnimationFrame to ensure the clear is processed first
        requestAnimationFrame(() => {
          region.textContent = message;
        });
      }
    },
    []
  );

  const createLiveRegions = useCallback(() => {
    // Create polite live region if it doesn't exist
    if (!document.getElementById("a11y-announcer-polite")) {
      const politeRegion = document.createElement("div");
      politeRegion.id = "a11y-announcer-polite";
      politeRegion.setAttribute("role", "status");
      politeRegion.setAttribute("aria-live", "polite");
      politeRegion.setAttribute("aria-atomic", "true");
      politeRegion.className = "sr-only";
      document.body.appendChild(politeRegion);
      politeRef.current = politeRegion;
    } else {
      politeRef.current = document.getElementById("a11y-announcer-polite") as HTMLDivElement;
    }

    // Create assertive live region if it doesn't exist
    if (!document.getElementById("a11y-announcer-assertive")) {
      const assertiveRegion = document.createElement("div");
      assertiveRegion.id = "a11y-announcer-assertive";
      assertiveRegion.setAttribute("role", "alert");
      assertiveRegion.setAttribute("aria-live", "assertive");
      assertiveRegion.setAttribute("aria-atomic", "true");
      assertiveRegion.className = "sr-only";
      document.body.appendChild(assertiveRegion);
      assertiveRef.current = assertiveRegion;
    } else {
      assertiveRef.current = document.getElementById("a11y-announcer-assertive") as HTMLDivElement;
    }
  }, []);

  useEffect(() => {
    createLiveRegions();

    return () => {
      // Cleanup is optional - regions can persist across navigations
    };
  }, [createLiveRegions]);

  return { announce };
}

/**
 * Hook for keyboard navigation within tree components
 */
export function useTreeKeyboardNavigation(options: {
  nodes: Array<{ id: string; data: { member?: { firstName: string; lastName: string } } }>;
  focusedNodeId: string | null;
  onNodeFocus: (nodeId: string) => void;
  onNodeSelect: (nodeId: string) => void;
  onEscape: () => void;
  enabled?: boolean;
}) {
  const { nodes, focusedNodeId, onNodeFocus, onNodeSelect, onEscape, enabled = true } = options;
  const { announce } = useAriaAnnouncements();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || nodes.length === 0) return;

      const currentIndex = nodes.findIndex((n) => n.id === focusedNodeId);

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown": {
          event.preventDefault();
          const nextIndex = currentIndex < nodes.length - 1 ? currentIndex + 1 : 0;
          const nextNode = nodes[nextIndex];
          onNodeFocus(nextNode.id);
          const member = nextNode.data?.member;
          if (member) {
            announce(`${member.firstName} ${member.lastName}`);
          }
          break;
        }
        case "ArrowLeft":
        case "ArrowUp": {
          event.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : nodes.length - 1;
          const prevNode = nodes[prevIndex];
          onNodeFocus(prevNode.id);
          const member = prevNode.data?.member;
          if (member) {
            announce(`${member.firstName} ${member.lastName}`);
          }
          break;
        }
        case "Enter":
        case " ": {
          event.preventDefault();
          if (focusedNodeId) {
            onNodeSelect(focusedNodeId);
            const node = nodes.find((n) => n.id === focusedNodeId);
            const member = node?.data?.member;
            if (member) {
              announce(`Selected ${member.firstName} ${member.lastName}`);
            }
          }
          break;
        }
        case "Escape": {
          event.preventDefault();
          onEscape();
          announce("Selection cleared");
          break;
        }
        case "Home": {
          event.preventDefault();
          if (nodes.length > 0) {
            onNodeFocus(nodes[0].id);
            const member = nodes[0].data?.member;
            if (member) {
              announce(`${member.firstName} ${member.lastName}, first member`);
            }
          }
          break;
        }
        case "End": {
          event.preventDefault();
          if (nodes.length > 0) {
            const lastNode = nodes[nodes.length - 1];
            onNodeFocus(lastNode.id);
            const member = lastNode.data?.member;
            if (member) {
              announce(`${member.firstName} ${member.lastName}, last member`);
            }
          }
          break;
        }
      }
    },
    [enabled, nodes, focusedNodeId, onNodeFocus, onNodeSelect, onEscape, announce]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return { handleKeyDown };
}

/**
 * Hook for managing focus trap within modals and dialogs
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelector);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus the first focusable element
    firstFocusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [containerRef, isActive]);
}

/**
 * Hook to generate ARIA attributes for tree nodes
 */
export function useTreeNodeAria(options: {
  member: { firstName: string; lastName: string; gender?: string | null; birthDate?: string | null; deathDate?: string | null };
  isSelected: boolean;
  isFocusMember: boolean;
  isDeceased: boolean;
  level: number;
  setSize: number;
  posInSet: number;
}) {
  const { member, isSelected, isFocusMember, isDeceased, level, setSize, posInSet } = options;

  const ariaLabel = [
    `${member.firstName} ${member.lastName}`,
    member.gender ? member.gender : null,
    isDeceased ? "deceased" : null,
    isFocusMember ? "focus member" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    role: "treeitem",
    "aria-label": ariaLabel,
    "aria-selected": isSelected,
    "aria-level": level,
    "aria-setsize": setSize,
    "aria-posinset": posInSet,
    tabIndex: isSelected || isFocusMember ? 0 : -1,
  };
}

/**
 * Skip link component for keyboard navigation
 */
export function useSkipLinks() {
  const skipToMainContent = useCallback(() => {
    const main = document.querySelector("main") || document.querySelector('[role="main"]');
    if (main instanceof HTMLElement) {
      main.tabIndex = -1;
      main.focus();
    }
  }, []);

  const skipToTreeVisualization = useCallback(() => {
    const tree = document.querySelector('[data-testid="tree-visualization"]');
    if (tree instanceof HTMLElement) {
      tree.tabIndex = -1;
      tree.focus();
    }
  }, []);

  return { skipToMainContent, skipToTreeVisualization };
}
