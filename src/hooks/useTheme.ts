import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  THEME_STORAGE_KEY,
  applyTheme,
  getStoredTheme,
  getSystemTheme,
  resolveTheme,
  type ResolvedTheme,
  type ThemeMode,
} from "@/lib/theme";

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

function subscribe(listener: Listener) {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) emit();
    };
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const onMedia = () => emit();
    window.addEventListener("storage", onStorage);
    mql.addEventListener("change", onMedia);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
      mql.removeEventListener("change", onMedia);
    };
  }
  return () => listeners.delete(listener);
}

const getSnapshot = (): ThemeMode => getStoredTheme();
const getServerSnapshot = (): ThemeMode => "system";

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const resolvedTheme: ResolvedTheme = resolveTheme(theme);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: ThemeMode) => {
    try {
      if (next === "system") {
        window.localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      }
    } catch {
      // ignore quota / privacy errors
    }
    applyTheme(resolveTheme(next));
    emit();
  }, []);

  return { theme, resolvedTheme, setTheme, systemTheme: getSystemTheme() };
}
