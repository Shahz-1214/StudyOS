import { AUTHORITY_LABEL, AUTHORITY_STYLE } from "@/lib/resourceMeta";
import { ExternalLink, AlertCircle, ShieldCheck } from "lucide-react";

export default function ResourceCard({ resource }) {
  const authority = resource.authority_level;
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="study-panel p-4 block hover:opacity-90 transition-opacity"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-foreground leading-snug">{resource.title}</div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> {resource.provider}
          </div>
        </div>
        <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${AUTHORITY_STYLE[authority] || ""}`}>
          {AUTHORITY_LABEL[authority] || authority}
        </span>
      </div>

      {resource.notes && (
        <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">{resource.notes}</p>
      )}

      {resource.copyright_note && (
        <p className="text-[11px] text-amber-600 mt-2 flex items-start gap-1.5 leading-relaxed">
          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /> {resource.copyright_note}
        </p>
      )}

      <div className="text-[10px] text-muted-foreground mt-2.5 flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> Verified {resource.verified_on}
      </div>
    </a>
  );
}