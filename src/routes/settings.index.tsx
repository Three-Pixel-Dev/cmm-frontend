import { createFileRoute, redirect } from "@tanstack/react-router";

/** /settings has no content of its own — land on the profile section. */
export const Route = createFileRoute("/settings/")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/profile" });
  },
});
