import { useEffect, useState } from "react";

// Live ticking countdown to a target exam date (YYYY-MM-DD).
// Counts down to the start of the exam day (local midnight). When the
// target has passed, shows an "exam day" state instead of a negative timer.
export default function ExamCountdown({ targetDate }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(`${targetDate}T00:00:00`).getTime();
  const diff = target - now;

  if (!Number.isFinite(target)) return null;

  if (diff <= 0) {
    return (
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-semibold text-foreground">0</span>
        <span className="text-[11px] text-muted-foreground">days · exam day</span>
      </div>
    );
  }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className="mt-1">
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-semibold text-foreground">{days}</span>
        <span className="text-[11px] text-muted-foreground">days remaining</span>
      </div>
      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </div>
    </div>
  );
}