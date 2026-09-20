import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import StudyPanel from "@/components/StudyPanel";
import MasteryBar from "@/components/MasteryBar";
import VerifiedNotes from "@/components/resources/VerifiedNotes";
import { computeConceptStatus, STATUS_LABELS, statusColor, computeSubjectMastery } from "@/lib/learnerState";
import PageSkeleton from "@/components/PageSkeleton";
import { Layers, FileText, CalendarClock, Brain, BookOpen } from "lucide-react";

export default function SubjectHub() {
  const { user } = useAuth();
  const { profile, subjects, concepts, loading } = useStudyOSData();

  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  return (
    <div className="max-w-[1000px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Study</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <Layers className="w-6 h-6 text-primary" /> Subject Hub
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Concepts, notes and exam materials for each of your subjects.</p>
      </div>

      {profile?.board_id && <VerifiedNotes boardId={profile.board_id} />}

      {subjects.length === 0 ? (
        <StudyPanel className="p-8 text-center">
          <BookOpen className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No subjects yet. Add one in your profile to start.</p>
          <Link to="/profile" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2">
            Manage subjects
          </Link>
        </StudyPanel>
      ) : (
        <div className="space-y-4">
          {subjects.map((s) => {
            const subs = concepts.filter((c) => c.subject_id === s.id);
            const m = computeSubjectMastery(concepts, s.id);
            return (
              <StudyPanel key={s.id} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <h3 className="font-bold text-foreground">{s.name}</h3>
                    <span className="text-[11px] text-muted-foreground">{subs.length} concepts · {m}% mastery</span>
                  </div>
                </div>
                <MasteryBar value={m} color={s.color} className="mb-4" />
                <div className="space-y-1.5 mb-4">
                  {subs.length === 0 && <div className="text-[12px] text-muted-foreground">No concepts yet.</div>}
                  {subs.map((c) => {
                    const st = computeConceptStatus(c.mastery);
                    return (
                      <div key={c.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0">
                        <div className="text-[13px] text-foreground truncate">{c.name}</div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-semibold" style={{ color: statusColor(st) }}>{STATUS_LABELS[st]}</span>
                          <span className="text-[12px] text-muted-foreground w-8 text-right">{c.mastery || 0}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to="/past-papers" className="inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground text-[13px] font-semibold px-3 py-2 hover:bg-secondary/70">
                    <FileText className="w-4 h-4" /> Past papers
                  </Link>
                  <Link to="/exam-dates" className="inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground text-[13px] font-semibold px-3 py-2 hover:bg-secondary/70">
                    <CalendarClock className="w-4 h-4" /> Exam dates
                  </Link>
                  <Link to="/tool/note-quiz" className="inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground text-[13px] font-semibold px-3 py-2 hover:bg-secondary/70">
                    <Brain className="w-4 h-4" /> Notes → Quiz
                  </Link>
                </div>
              </StudyPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}