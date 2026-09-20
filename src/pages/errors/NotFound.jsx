import React from "react";
import { SearchX } from "lucide-react";
import ErrorScreen from "@/components/errors/ErrorScreen";
import { ErrorActions, DashboardButton, GoBackButton } from "@/components/errors/ErrorActions";

export default function NotFound() {
  return (
    <ErrorScreen
      icon={SearchX}
      eyebrow="Error 404"
      code="404"
      title="This page doesn't exist."
      message="The page you're looking for may have moved or the link may be incorrect."
    >
      <ErrorActions>
        <DashboardButton />
        <GoBackButton />
      </ErrorActions>
    </ErrorScreen>
  );
}