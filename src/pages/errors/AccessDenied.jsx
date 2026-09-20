import React from "react";
import { ShieldAlert } from "lucide-react";
import ErrorScreen from "@/components/errors/ErrorScreen";
import { ErrorActions, DashboardButton, GoBackButton } from "@/components/errors/ErrorActions";

// Shown when an authenticated user lacks permission for a resource.
// Never includes the reason access was denied.
export default function AccessDenied() {
  return (
    <ErrorScreen
      icon={ShieldAlert}
      eyebrow="Error 403"
      title="Access denied"
      message="You don't have permission to view this page or resource."
    >
      <ErrorActions>
        <DashboardButton />
        <GoBackButton />
      </ErrorActions>
    </ErrorScreen>
  );
}