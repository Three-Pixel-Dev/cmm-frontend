import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ApiUser } from "@/lib/api/types";
import { isGuestEmail } from "@/lib/guest";

type AuthState = {
  user: ApiUser | null;
  setUser: (user: ApiUser) => void;
  clearSession: () => void;
  logout: () => void;
  isLoggedIn: () => boolean;
  isHost: () => boolean;
  isGuest: () => boolean;
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearSession: () => set({ user: null }),
      logout: () => set({ user: null }),
      isLoggedIn: () => !!get().user,
      isHost: () => {
        const role = (get().user?.role_name ?? "").toLowerCase();
        return role === "admin" || role === "super_admin";
      },
      isGuest: () => isGuestEmail(get().user?.email),
    }),
    { name: "cmm-auth" },
  ),
);
