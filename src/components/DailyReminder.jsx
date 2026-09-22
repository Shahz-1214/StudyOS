import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getNotificationPrefs } from "@/lib/appSettings";
import StudyPanel from "@/components/StudyPanel";
import { Bell, ChevronRight, X } from "lucide-react";

// In-app daily study reminder. Opt-in via the "Study reminders" preference
// (Profile → Notification preferences). Shows due tasks + concepts needing
// review, with a one-tap dismiss for the current day. Deterministic — no AI,
// no email/push channel (those require a custom domain or native mobile build).
const DISMISS_KEY = "studyos.dailyReminder.dismissed";

function todayKey() {
  return `${DISMISS_KEY}.${new Date().toISOString().slice(0, 10)}`;
}

export default function DailyReminder({ concepts, openTasks }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(todayKey()) === "1");
  }, []);

  const pref = getNotificationPrefs();
  if (!pref.studyReminders || dismissed) return null;

  const dueCount = openTasks?.dueToday || 0;
  const reviewCount = (concepts || []).filter((c) => (c.mastery || 0) < 75).length;
  if (dueCount === 0 && reviewCount === 0) return null;

  const dismiss = () => {
    localStorage.setItem(todayKey(), "1");
    setDismissed(true);
  };

  const bits = [];
  if (dueCount > 0) bits.push(`${dueCount} task${dueCount > 1 ? "s" : ""} due today`);
  if (reviewCount > 0) bits.push(`${reviewCount} concept${reviewCount > 1 ? "s" : ""} to review`);

  return (
    <StudyPanel className="p-4 md:p-5 flex items-center gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Bell className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-foreground">Daily reminder</div>
        <div className="text-[12px] text-muted-foreground truncate">{bits.join(" · ")}</div>
      </div>
      <Link to="/practice" className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold px-3 py-2 hover:opacity-90 shrink-0">
        Start session <ChevronRight className="w-3.5 h-3.5" />
      </Link>
      <button onClick={dismiss} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Dismiss for today">
        <X className="w-4 h-4" />
      </button>
    </StudyPanel>
  );
}