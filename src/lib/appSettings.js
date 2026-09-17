// App-wide preferences stored locally on the user's device.
// Notification preferences are real toggles; no push channel is wired yet,
// so these are stored as preferences only (truthful, not fake functionality).

const PREFS_KEY = "studyos.notificationPrefs";

export const NOTIFICATION_PREF_DEFS = [
  { key: "studyReminders", label: "Study reminders", desc: "Daily nudges to keep your streak." },
  { key: "examReminders", label: "Exam date reminders", desc: "Alerts ahead of your exam series windows." },
  { key: "weeklySummary", label: "Weekly progress summary", desc: "A weekly recap of your mastery changes." },
];

const DEFAULTS = { studyReminders: false, examReminders: false, weeklySummary: false };

export function getNotificationPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setNotificationPrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}