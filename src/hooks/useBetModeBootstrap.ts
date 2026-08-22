import { useBetMode } from "@/store/useBetMode";
import { useHydrated } from "@tanstack/react-router";
import { useEffect } from "react";

export function useBetModeBootstrap() {
  const hydrated = useHydrated();
  const mode = useBetMode((s) => s.mode);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.remove("real", "virtual");
    document.documentElement.classList.add(mode);
  }, [hydrated, mode]);
}
