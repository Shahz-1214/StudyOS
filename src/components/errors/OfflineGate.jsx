import React from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import OfflineScreen from "@/components/errors/OfflineScreen";

// App-wide network gate: renders the dedicated offline fallback whenever the
// browser reports no connection, and restores the app the moment it returns.
export default function OfflineGate({ children }) {
  const online = useOnlineStatus();
  return online ? children : <OfflineScreen />;
}