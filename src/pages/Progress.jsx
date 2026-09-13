import { useMemo, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { computeSubjectMastery, computeConceptStatus, STATUS_LABELS, statusColor } from "@/lib/learnerState";
import StudyPanel from "@/components/StudyPanel";
import MasteryBar from "@/components/MasteryBar";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Loader2, TrendingUp, AlertTriangle } from "lucide-react";

export default function Progress() {
  const { user } = useAuth();
  const { profile, subjects, concepts, loading, error } = useStudyOSData();
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    if (!user) return;
    base44.entities.QuizAttempt.list("-completed_at", 50)
      .then((rows) => setAttempts(rows.reverse()))
      .catch(() => {});
  }, [user]);

  const overall = useMemo(() => {
    if (!concepts.length) return 0;
    return Math.round(concepts.reduce((s, c) => s + (c.mastery || 0), 0) / concepts.length);
  }, [concepts]);

  const sortedConcepts = useMemo(
    () => [...concepts].sort((a, b) => (a.mastery || 0) - (b.mastery || 0)),
    [concepts]
  );

  const weakCount = concepts.filter((c) => (c.mastery || 0) < 55).length;
  const masteredCount = concepts.filter((c) => (c.mastery || 0) >= 90).length;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  return (
    <div className="max-w-[1100px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Measurement</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1">Progress</h1>
        <p className="text-sm text-muted-foreground mt-1">Every number below is derived from your stored concept mastery — no estimates, no fake data.</p>
      </div>

      {error && (
        <StudyPanel className="p-4 mb-4 flex items-center gap-2 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4" /> Couldn't load progress data. Try refreshing.
        </StudyPanel>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StudyPanel className="p-5">
          <div className="eyebrow">Overall mastery</div>
          <div className="text-3xl font-bold text-foreground mt-2">{overall}%</div>
        </StudyPanel>
        <StudyPanel className="p-5">
          <div className="eyebrow">Concepts tracked</div>
          <div className="text-3xl font-bold text-foreground mt-2">{concepts.length}</div>
        </StudyPanel>
        <StudyPanel className="p-5">
          <div className="eyebrow">Weak concepts</div>
          <div className="text-3xl font-bold text-foreground mt-2" style={{ color: statusColor("weak") }}>{weakCount}</div>
        </StudyPanel>
        <StudyPanel className="p-5">
          <div className="eyebrow">Mastered</div>
          <div className="text-3xl font-bold text-foreground mt-2" style={{ color: statusColor("mastered") }}>{masteredCount}</div>
        </StudyPanel>
      </div>

      {/* Accuracy trend */}
      <StudyPanel className="p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-foreground">Quiz accuracy over time</h3>
            <p className="text-xs text-muted-foreground">From your stored QuizAttempt history</p>
          </div>
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        {attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No quizzes yet — complete a practice quiz to see your trend.</p>
        ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attempts.map((a, i) => ({ idx: i + 1, accuracy: a.accuracy, score: `${a.score}/${a.total}` }))} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="idx" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} labelFormatter={(l) => `Quiz ${l}`} formatter={(v, n, p) => [`${v}% (${p.payload.score})`, "Accuracy"]} />
                <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </StudyPanel>

      {/* Subject mastery */}
      <StudyPanel className="p-6 mb-4">
        <h3 className="font-bold text-foreground mb-1">Subject mastery</h3>
        <p className="text-xs text-muted-foreground mb-4">Average of each subject's concept mastery</p>
        <div className="space-y-4">
          {subjects.length === 0 && <p className="text-sm text-muted-foreground">No subjects yet.</p>}
          {subjects.map((s) => {
            const m = computeSubjectMastery(concepts, s.id);
            return (
              <div key={s.id} className="grid grid-cols-[120px_1fr_40px] items-center gap-3">
                <span className="text-[13px] text-foreground truncate">{s.name}</span>
                <MasteryBar value={m} color={s.color || "#3B82F6"} />
                <span className="text-[12px] text-muted-foreground text-right">{m}%</span>
              </div>
            );
          })}
        </div>
      </StudyPanel>

      {/* Concept breakdown */}
      <StudyPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-foreground">Concept mastery</h3>
            <p className="text-xs text-muted-foreground">Sorted by lowest mastery first</p>
          </div>
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <div className="space-y-2">
          {sortedConcepts.length === 0 && <p className="text-sm text-muted-foreground">No concepts yet.</p>}
          {sortedConcepts.map((c) => {
            const st = computeConceptStatus(c.mastery);
            const subj = subjects.find((s) => s.id === c.subject_id);
            return (
              <div key={c.id} className="grid grid-cols-[1fr_90px_40px] items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="min-w-0">
                  <div className="text-[13px] text-foreground truncate">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground">{subj?.name}</div>
                </div>
                <span className="text-[11px] font-semibold text-right" style={{ color: statusColor(st) }}>{STATUS_LABELS[st]}</span>
                <span className="text-[12px] text-muted-foreground text-right">{c.mastery || 0}%</span>
              </div>
            );
          })}
        </div>
        {sortedConcepts.length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-4">
            All values are computed deterministically from your attempt history. Take a quiz in Practice to move these numbers.
          </p>
        )}
      </StudyPanel>
    </div>
  );
}