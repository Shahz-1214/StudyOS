import { ArrowRight, RotateCcw, Check, X, TrendingUp } from "lucide-react";
import StudyPanel from "@/components/StudyPanel";
import MasteryBar from "@/components/MasteryBar";
import { STATUS_LABELS, statusColor, computeConceptStatus } from "@/lib/learnerState";

// Results screen: score ring, per-concept mastery deltas, review of answers.
export default function QuizResults({ quiz, answers, updates, concepts, subjects, onAgain, onDone }) {
  const correct = answers.filter((a, i) => a && a.selected_index === quiz.questions[i].correct_index).length;
  const total = quiz.questions.length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;

  const conceptName = (id) => concepts.find((c) => c.id === id)?.name || "Concept";
  const subjectName = (id) => {
    const c = concepts.find((c) => c.id === id);
    if (!c) return "";
    return subjects.find((s) => s.id === c.subject_id)?.name || "";
  };

  return (
    <div className="space-y-4">
      {/* Score ring */}
      <StudyPanel className="p-6 md:p-8 flex flex-col items-center text-center">
        <div className="eyebrow">Quiz complete</div>
        <div className="relative w-32 h-32 my-4 grid place-items-center">
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
              strokeLinecap="round" strokeDasharray={`${(accuracy / 100) * 327} 327`} />
          </svg>
          <div>
            <div className="text-3xl font-bold text-foreground leading-none">{correct}/{total}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{accuracy}% accuracy</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          <button onClick={onAgain} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 hover:opacity-90">
            <RotateCcw className="w-4 h-4" /> Practice again
          </button>
          <button onClick={onDone} className="inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold px-4 py-2.5 hover:bg-secondary/70">
            Back to dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </StudyPanel>

      {/* Mastery deltas */}
      {updates.length > 0 && (
        <StudyPanel className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-foreground">Mastery updated</h3>
          </div>
          <div className="space-y-4">
            {updates.map((u) => {
              const delta = u.newMastery - u.prevMastery;
              const st = computeConceptStatus(u.newMastery);
              return (
                <div key={u.concept_id} className="grid grid-cols-[1fr_auto] gap-3 items-center">
                  <div className="min-w-0">
                    <div className="text-[13px] text-foreground truncate">{conceptName(u.concept_id)}</div>
                    <div className="text-[10px] text-muted-foreground">{subjectName(u.concept_id)}</div>
                    <div className="mt-1.5"><MasteryBar value={u.newMastery} color={statusColor(st)} /></div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-semibold" style={{ color: delta >= 0 ? "#10B981" : "#EF4444" }}>
                      {delta >= 0 ? "+" : ""}{delta}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">{u.prevMastery} → {u.newMastery}</div>
                    <div className="text-[10px] font-semibold mt-0.5" style={{ color: statusColor(st) }}>{STATUS_LABELS[st]}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </StudyPanel>
      )}

      {/* Answer review */}
      <StudyPanel className="p-6">
        <h3 className="font-bold text-foreground mb-4">Review</h3>
        <div className="space-y-4">
          {quiz.questions.map((q, i) => {
            const sel = answers[i]?.selected_index;
            const isCorrect = sel === q.correct_index;
            return (
              <div key={i} className="border-b border-border last:border-0 pb-3 last:pb-0">
                <div className="flex items-start gap-2">
                  {isCorrect ? <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> : <X className="w-4 h-4 text-destructive mt-0.5 shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-[13px] text-foreground">{q.prompt}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Correct: <span className="text-foreground">{q.options[q.correct_index]}</span>
                    </div>
                    {!isCorrect && sel != null && (
                      <div className="text-[11px] text-destructive mt-0.5">Your answer: {q.options[sel]}</div>
                    )}
                    {q.explanation && <div className="text-[11px] text-muted-foreground mt-1">{q.explanation}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </StudyPanel>
    </div>
  );
}