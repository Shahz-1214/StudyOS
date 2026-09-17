// Card for a past-paper resource. Clearly labels official past papers vs
// specimen/sample papers vs third-party supplementary material.
import { ExternalLink, ShieldCheck } from "lucide-react";

const OFFICIAL_PAPER_TYPES = [
  "official_past_paper",
  "official_specimen",
  "official_mark_scheme",
  "official_model_paper",
];

const TYPE_LABEL = {
  official_past_paper: "Official past paper",
  official_specimen: "Specimen / sample",
  official_mark_scheme: "Mark scheme",
  official_model_paper: "Model paper",
};

const TYPE_STYLE = {
  official_past_paper: "bg-primary/10 text-primary border-primary/30",
  official_specimen: "bg-emerald-100 text-emerald-700 border-emerald-300",
  official_mark_scheme: "bg-indigo-100 text-indigo-700 border-indigo-300",
  official_model_paper: "bg-violet-100 text-violet-700 border-violet-300",
};

export default function PastPaperCard({ resource }) {
  const isOfficialPaper = OFFICIAL_PAPER_TYPES.includes(resource.resource_type);
  const label = isOfficialPaper ? TYPE_LABEL[resource.resource_type] : "Third-party supplementary";
  const style = isOfficialPaper ? TYPE_STYLE[resource.resource_type] : "bg-amber-100 text-amber-700 border-amber-300";

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
        <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${style}`}>
          {label}
        </span>
      </div>

      {resource.notes && (
        <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">{resource.notes}</p>
      )}

      <div className="text-[10px] text-muted-foreground mt-2.5 flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> Verified {resource.verified_on}
      </div>
    </a>
  );
}