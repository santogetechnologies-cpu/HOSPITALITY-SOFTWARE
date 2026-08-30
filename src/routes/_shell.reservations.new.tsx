import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_shell/reservations/new")({
  beforeLoad: () => {
    throw redirect({ to: "/front-desk" });
  },
  component: () => null,
});
