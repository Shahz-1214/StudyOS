import React from "react";
import { AlertTriangle } from "lucide-react";
import ErrorScreen from "@/components/errors/ErrorScreen";
import { ErrorActions, TryAgainButton, DashboardButton } from "@/components/errors/ErrorActions";

// General application/server error. Shows no stack traces, internal IDs,
// file paths, or technical details — only a calm recovery screen.
export default function ServerError() {
  return (
    <ErrorScreen
      icon={AlertTriangle}
      eyebrow="Error 500"
      title="Something went wrong"
      message="StudyOS hit an unexpected error."
    >
      <ErrorActions>
        <TryAgainButton />
        <DashboardButton />
      </ErrorActions>
    </ErrorScreen>
  );
}