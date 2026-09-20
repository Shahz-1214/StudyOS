import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { STUDY_FEATURES, PLAN_FEATURES } from "@/lib/features";
import AppFooter from "@/components/AppFooter";
import PageErrorBoundary from "@/components/errors/PageErrorBoundary";
import { Home, TrendingUp, User, ScanLine, GraduationCap, FileText, Headphones, PenLine, CalendarClock, CheckSquare, RefreshCw, Timer, Circle, Brain, AlertCircle, CreditCard, Settings, Layers, Archive, Search } from "lucide-react";

const ICONS = { Home, TrendingUp, User, ScanLine, GraduationCap, FileText, Headphones, PenLine, CalendarClock, CheckSquare, RefreshCw, Timer, Brain, AlertCircle, CreditCard, Settings, Layers, Archive };
function NavIcon({ name, className = "" }) { const I = ICONS[name] || Circle; return <I className={className} strokeWidth={2} />; }

const PRIMARY_NAV = [
  { to: "/", label: "Home", icon: "Home", end: true },
  { to: "/practice", label: "Practice", icon: "Brain" },
  { to: "/progress", label: "Progress", icon: "TrendingUp" },
  { to: "/profile", label: "Profile", icon: "User" },
];

export default function Layout() {
  const { user } = useAuth();
  const initials = (user?.full_name || user?.email || "S").trim().charAt(0).toUpperCase();
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-[272px] flex-col border-r border-border bg-card sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="relative grid h-10 w-10 place-items-center rounded-2xl border border-primary/20 bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="brand-wordmark text-[20px] font-semibold text-white">StudyOS</div>
              <div className="text-[9px] uppercase tracking-[.22em] text-muted-foreground">your academic command center</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-elevated px-3 py-2 text-[11px] text-muted-foreground">
            <Search className="h-3.5 w-3.5" /> Find anything in StudyOS
            <span className="ml-auto rounded-md border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">⌘K</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="eyebrow px-3 pb-2">Navigate</div>
          <div className="space-y-1">{PRIMARY_NAV.map(n => <NavLink key={n.to} to={n.to} end={n.end} className={({isActive}) => "nav-link " + (isActive ? "active" : "")}><NavIcon name={n.icon} className="h-4 w-4" /><span>{n.label}</span></NavLink>)}</div>
          <div className="eyebrow px-3 pt-6 pb-2">Study</div>
          <NavLink to="/subject-hub" className={({isActive}) => "nav-link " + (isActive ? "active" : "")}><Layers className="h-4 w-4" /><span>Subject Hub</span></NavLink>
          {STUDY_FEATURES.map(f => <NavLink key={f.id} to={"/tool/" + f.id} className={({isActive}) => "nav-link " + (isActive ? "active" : "")}><NavIcon name={f.icon} className="h-4 w-4" /><span>{f.title}</span></NavLink>)}
          <div className="eyebrow px-3 pt-6 pb-2">Plan</div>
          <NavLink to="/exam-vault" className={({isActive}) => "nav-link " + (isActive ? "active" : "")}><Archive className="h-4 w-4" /><span>Exam Vault</span></NavLink>
          {PLAN_FEATURES.map(f => <NavLink key={f.id} to={"/tool/" + f.id} className={({isActive}) => "nav-link " + (isActive ? "active" : "")}><NavIcon name={f.icon} className="h-4 w-4" /><span>{f.title}</span></NavLink>)}
          <div className="eyebrow px-3 pt-6 pb-2">Account</div>
          <NavLink to="/subscription" className={({isActive}) => "nav-link " + (isActive ? "active" : "")}><CreditCard className="h-4 w-4" /><span>Subscription</span></NavLink>
          <NavLink to="/help" className={({isActive}) => "nav-link " + (isActive ? "active" : "")}><Circle className="h-4 w-4" /><span>Help & support</span></NavLink>
        </nav>
        <div className="border-t border-border p-3">
          <NavLink to="/profile" className="flex items-center gap-3 rounded-2xl border border-transparent bg-elevated px-3 py-2.5 hover:border-border hover:bg-elevated-high">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">{initials}</div>
            <div className="min-w-0"><div className="truncate text-xs font-semibold text-foreground">{user?.full_name || user?.email || "Student"}</div><div className="text-[10px] text-muted-foreground">Open your profile</div></div>
          </NavLink>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background px-4 py-3 md:hidden">
          <div className="flex items-center justify-between">
            <div className="brand-wordmark text-xl font-semibold text-foreground">StudyOS</div>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">{initials}</div>
          </div>
        </header>
        <main className="min-w-0 flex-1 pb-20 md:pb-0"><PageErrorBoundary><Outlet /></PageErrorBoundary></main>
        <AppFooter />
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-background/95 px-2 py-2 backdrop-blur-xl md:hidden">
        {PRIMARY_NAV.map(n => <NavLink key={n.to} to={n.to} end={n.end} className={({isActive}) => "flex min-w-[62px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 " + (isActive ? "bg-primary/10 text-primary" : "text-muted-foreground")}><NavIcon name={n.icon} className="h-5 w-5" /><span className="text-[10px]">{n.label}</span></NavLink>)}
      </nav>
    </div>
  );
}