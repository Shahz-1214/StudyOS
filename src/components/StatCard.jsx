import StudyPanel from "./StudyPanel";

export default function StatCard({ icon: Icon, value, label, hint }) {
  return (
    <StudyPanel className="p-5">
      <div className="flex items-start justify-between">
        <span className="eyebrow">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-primary" strokeWidth={2} />}
      </div>
      <div className="mt-3 text-3xl font-bold text-foreground leading-none">{value}</div>
      {hint && <div className="mt-2 text-[11px] text-muted-foreground">{hint}</div>}
    </StudyPanel>
  );
}