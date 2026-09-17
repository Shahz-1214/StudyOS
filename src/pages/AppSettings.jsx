import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { base44 } from "@/api/base44Client";
import StudyPanel from "@/components/StudyPanel";
import ThemePicker from "@/components/ThemePicker";
import { Switch } from "@/components/ui/switch";
import { NOTIFICATION_PREF_DEFS, getNotificationPrefs, setNotificationPrefs } from "@/lib/appSettings";
import { Loader2, Settings, Bell, Palette, Sparkles, CreditCard, ChevronRight, LogOut } from "lucide-react";

export default function AppSettings() {
  const { user } = useAuth();
  const { profile, loading, reload } = useStudyOSData();
  const [prefs, setPrefs] = useState(getNotificationPrefs);
  const [savingGalaxy, setSavingGalaxy] = useState(false);

  useEffect(() => { setNotificationPrefs(prefs); }, [prefs]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  async function toggleGalaxy(next) {
    if (!profile?.id) return;
    setSavingGalaxy(true);
    try {
      await base44.entities.LearnerProfile.update(profile.id, { galaxy_mode: next });
      await reload();
    } catch { /* ignore */ }
    setSavingGalaxy(false);
  }

  return (
    <div className="max-w-[760px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Account</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" /> App Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your display theme, notification preferences and app-wide options.</p>
      </div>

      {/* Display theme */}
      <StudyPanel className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-foreground text-[14px]">Display theme</h3>
        </div>
        <p className="text-[12px] text-muted-foreground mb-3">Pick a background tint for the whole app. Saved on this device.</p>
        <ThemePicker />
      </StudyPanel>

      {/* Notifications */}
      <StudyPanel className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-foreground text-[14px]">Notification preferences</h3>
        </div>
        <p className="text-[12px] text-muted-foreground mb-3">Choose what StudyOS should remind you about. Preferences are saved on this device.</p>
        <div className="space-y-3">
          {NOTIFICATION_PREF_DEFS.map((p) => (
            <div key={p.key} className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-foreground">{p.label}</div>
                <div className="text-[11px] text-muted-foreground">{p.desc}</div>
              </div>
              <Switch checked={!!prefs[p.key]} onCheckedChange={(v) => setPrefs((s) => ({ ...s, [p.key]: v }))} />
            </div>
          ))}
        </div>
      </StudyPanel>

      {/* App options */}
      <StudyPanel className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-foreground text-[14px]">App options</h3>
        </div>
        <div className="flex items-center justify-between gap-3 py-1.5">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-foreground">Galaxy mode</div>
            <div className="text-[11px] text-muted-foreground">Optimise the layout for Galaxy/foldable devices.</div>
          </div>
          <Switch checked={!!profile.galaxy_mode} disabled={savingGalaxy} onCheckedChange={toggleGalaxy} />
        </div>
      </StudyPanel>

      {/* Account */}
      <StudyPanel className="p-5 mb-4">
        <div className="eyebrow mb-3">Account</div>
        <div className="text-[13px] text-foreground">{user?.full_name || "—"}</div>
        <div className="text-[11px] text-muted-foreground mb-3">{user?.email}</div>
        <div className="flex flex-wrap gap-2">
          <Link to="/subscription" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[13px] hover:border-primary">
            <CreditCard className="w-4 h-4" /> Subscription <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <Link to="/profile" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[13px] hover:border-primary">
            Profile <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="mt-4 pt-3 border-t border-border">
          <button
            onClick={() => base44.auth.logout("/")}
            className="inline-flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive text-[13px] font-semibold px-3 py-2 hover:bg-destructive/20"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </StudyPanel>
    </div>
  );
}