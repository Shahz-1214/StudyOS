import { useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import StudyPanel from "@/components/StudyPanel";

// One-question-at-a-time quiz taker. Calls onComplete(answers) with an array
// of { question_index, selected_index }.
export default function QuizRunner({ quiz, onComplete }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState(Array(quiz.questions.length).fill(null));
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const q = quiz.questions[idx];
  const isLast = idx === quiz.questions.length - 1;

  function choose(i) {
    setSelected(i);
  }

  function next() {
    const updated = [...answers];
    updated[idx] = { question_index: idx, selected_index: selected };
    setAnswers(updated);
    if (isLast) {
      setSubmitting(true);
      onComplete(updated);
    } else {
      setIdx(idx + 1);
      setSelected(null);
    }
  }

  return (
    <StudyPanel className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <div className="eyebrow">Question {idx + 1} of {quiz.questions.length}</div>
        <div className="text-[11px] text-muted-foreground capitalize">{q.difficulty}</div>
      </div>
      <div className="w-full h-1 rounded-full bg-secondary mb-6 overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${((idx + 1) / quiz.questions.length) * 100}%` }} />
      </div>

      <h2 className="text-lg md:text-xl font-bold text-foreground mb-5">{q.prompt}</h2>

      <div className="space-y-2.5">
        {q.options.map((opt, i) => {
          const active = selected === i;
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              className={`w-full text-left rounded-lg border px-4 py-3 text-[14px] transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card hover:bg-secondary/50 text-foreground"
              }`}
            >
              <span className="font-mono text-[11px] text-muted-foreground mr-2">{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={next}
          disabled={selected === null || submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 disabled:opacity-40 hover:opacity-90"
        >
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Scoring…</> : isLast ? <>Submit <ChevronRight className="w-4 h-4" /></> : <>Next <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
    </StudyPanel>
  );
}