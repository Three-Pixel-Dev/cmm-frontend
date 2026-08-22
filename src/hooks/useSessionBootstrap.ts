import { useEffect } from "react";
import { authApi } from "@/lib/api/auth";
import { useHydrated } from "@/hooks/useHydrated";
import { useAuth } from "@/store/useAuth";

/** Restore session from HttpOnly cookies on client mount. */
export function useSessionBootstrap() {
  const hydrated = useHydrated();
  const setUser = useAuth((s) => s.setUser);
  const clearSession = useAuth((s) => s.clearSession);

  useEffect(() => {
    if (!hydrated) return;
    authApi
      .me()
      .then(setUser)
      .catch(() => clearSession());
  }, [hydrated, setUser, clearSession]);
}
