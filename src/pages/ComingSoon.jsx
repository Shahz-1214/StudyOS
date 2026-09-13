import { useParams, Link } from "react-router-dom";
import { FEATURE_MAP } from "@/lib/features";
import StudyPanel from "@/components/StudyPanel";
import { ArrowLeft, Hammer, Layers } from "lucide-react";

// Honest status page for features not yet implemented in the current stage.
// Clearly labelled "NOT YET IMPLEMENTED" — never faked as functional.
export default function ComingSoon() {
  const { featureId } = useParams();
  const feature = FEATURE_MAP[featureId];

  if (!feature) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-12">
        <StudyPanel className="p-8 text-center">
          <h1 className="text-lg font-bold text-foreground">Feature not found</h1>
          <Link to="/" className="text-sm text-primary mt-3 inline-block">← Back to dashboard</Link>
        </StudyPanel>
      </div>
    );
  }

  const stageMap = {
    3: "Core AI (StudyLens, Homework Coach, Note → Quiz)",
    4: "Adaptive planning (Weakness AI, ExamPilot, StudySync, FocusStudy)",
    5: "Advanced content (LectureMind, EssayCheck)",
  };

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-8 py-8 md:py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>

      <StudyPanel className="p-7">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Hammer className="w-5 h-5" />
          </div>
          <div>
            <div className="eyebrow">Status · Not yet implemented</div>
            <h1 className="text-xl font-bold text-foreground">{feature.title}</h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{feature.desc}</p>

        <div className="mt-5 rounded-lg bg-secondary/50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-[13px] font-semibold text-foreground">Planned in Stage {feature.stage}</span>
          </div>
          <p className="text-[12px] text-muted-foreground">
            {stageMap[feature.stage] || "Later stage"} — built on the same canonical learner state and analytics foundation already in place.
            Per the StudyOS architecture, this feature's deterministic logic (scoring, scheduling, validation) will live in shared modules, and any AI will run behind a server-side service boundary — never as a generic chatbot.
          </p>
        </div>

        <div className="mt-5 text-[11px] text-muted-foreground">
          StudyOS is being built incrementally. Stage 1 (foundation: auth, profile, subjects, concepts, dashboard) is live now. This feature activates in a later stage.
        </div>
      </StudyPanel>
    </div>
  );
}