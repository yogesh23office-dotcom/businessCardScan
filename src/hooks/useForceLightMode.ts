import { useEffect } from "react";

/** Keep auth screens in light mode only (strip .dark from document). */
export function useForceLightMode(active = true) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    const root = document.documentElement;
    root.classList.remove("dark");
    root.style.colorScheme = "light";

    return () => {
      root.style.colorScheme = "";
    };
  }, [active]);
}
