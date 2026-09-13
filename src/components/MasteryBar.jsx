export default function MasteryBar({ value, color = "#3B82F6", className = "" }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className={`h-1.5 w-full rounded-full bg-muted overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${v}%`, backgroundColor: color }}
      />
    </div>
  );
}