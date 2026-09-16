import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { STUDY_FEATURES, PLAN_FEATURES } from "@/lib/features";
import { track, EVENTS } from "@/lib/analytics";
import { useEffect } from "react";
import {
  Home, TrendingUp, User, ScanLine, GraduationCap, FileText, Headphones, PenLine,
  CalendarClock, CheckSquare, RefreshCw, Timer, Circle, Brain, AlertCircle, CreditCard, Library,
} from "lucide-react";

const ICONS = {
  Home, TrendingUp, User, ScanLine, GraduationCap, FileText, Headphones, PenLine,
  CalendarClock, CheckSquare, RefreshCw, Timer, Brain, AlertCircle, CreditCard, Library,
};

function NavIcon({ name, className = "" }) {
  const I = ICONS[name] || Circle;
  return <I className={className} strokeWidth={2} />;
}

const PRIMARY_NAV = [
  { to: "/", label: "Home", icon: "Home", end: true },
  { to: "/practice", label: "Practice", icon: "Brain" },
  { to: "/resources", label: "Resources", icon: "Library" },
  { to: "/progress", label: "Progress", icon: "TrendingUp" },
  { to: "/profile", label: "Profile", icon: "User" },
];

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const initials = (user?.full_name || user?.email || "S").trim().charAt(0).toUpperCase();

  useEffect(() => {
    track(EVENTS.APP_OPEN, { path: location.pathname });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[260px] flex-col border-r border-border bg-card/50 sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>
            S
          </div>
          <div>
            <div className="text-[15px] font-bold text-foreground leading-tight">StudyOS</div>
            <div className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>academic operating system</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {PRIMARY_NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <NavIcon name={n.icon} className="w-4 h-4" />
              <span>{n.label}</span>
            </NavLink>
          ))}

          <div className="eyebrow px-3 pt-5 pb-2">Study</div>
          {STUDY_FEATURES.map((f) => (
            <NavLink key={f.id} to={`/tool/${f.id}`} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <NavIcon name={f.icon} className="w-4 h-4" />
              <span>{f.title}</span>
            </NavLink>
          ))}

          <div className="eyebrow px-3 pt-5 pb-2">Plan</div>
          {PLAN_FEATURES.map((f) => (
            <NavLink key={f.id} to={`/tool/${f.id}`} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <NavIcon name={f.icon} className="w-4 h-4" />
              <span>{f.title}</span>
            </NavLink>
          ))}

          <div className="eyebrow px-3 pt-5 pb-2">Account</div>
          <NavLink to="/subscription" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <NavIcon name="CreditCard" className="w-4 h-4" />
            <span>Subscription</span>
          </NavLink>
        </nav>

        <div className="px-3 py-3 border-t border-border">
          <NavLink to="/profile" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-secondary/60">
            <div className="w-8 h-8 rounded-md bg-secondary text-foreground grid place-items-center text-xs font-bold">{initials}</div>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-foreground truncate">{user?.full_name || user?.email || "Student"}</div>
              <div className="text-[10px] text-muted-foreground">View profile</div>
            </div>
          </NavLink>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 min-w-0 pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border flex items-center justify-around px-2 py-2">
        {PRIMARY_NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex flex-col items-center gap-1 px-3 py-1 rounded-lg ${isActive ? "text-primary" : "text-muted-foreground"}`}>
            <NavIcon name={n.icon} className="w-5 h-5" />
            <span className="text-[10px]">{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}