import React from "react";
import { WifiOff } from "lucide-react";
import ErrorScreen from "@/components/errors/ErrorScreen";
import { ErrorActions, TryAgainButton, DashboardButton } from "@/components/errors/ErrorActions";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

// Dedicated offline/network fallback. Live-updates when connectivity returns;
// the OfflineGate unmounts this screen and restores the app automatically.
export default function OfflineScreen() {
  const online = useOnlineStatus();

  return (
    <ErrorScreen
      icon={WifiOff}
      eyebrow="Connection lost"
      title="You're offline"
      message="StudyOS couldn't connect to the internet. Content already available on this device may still work — online features like AI tools and syncing need a connection."
    >
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/45">
        <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400" : "animate-pulse bg-white/30"}`} />
        {online ? "Back online — returning to StudyOS" : "Waiting for a connection…"}
      </div>
      <ErrorActions>
        <TryAgainButton />
        <DashboardButton />
      </ErrorActions>
    </ErrorScreen>
  );
}