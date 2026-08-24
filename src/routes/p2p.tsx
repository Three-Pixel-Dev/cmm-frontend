import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useHydrated } from "@/hooks/useHydrated";
import { useAuth } from "@/store/useAuth";

export const Route = createFileRoute("/p2p")({
  component: P2PLayout,
});

function P2PLayout() {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const isGuest = useAuth((s) => s.isGuest());

  useEffect(() => {
    if (hydrated && isGuest) navigate({ to: "/" });
  }, [hydrated, isGuest, navigate]);

  if (!hydrated || isGuest) return null;
  return <Outlet />;
}
