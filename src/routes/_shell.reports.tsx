import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_shell/reports")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});
