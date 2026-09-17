import { useState, useEffect, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { base44 } from "@/api/base44Client";
import StudyPanel from "@/components/StudyPanel";
import { Loader2, CalendarClock, ChevronLeft, Globe, ExternalLink, Info } from "lucide-react";

export default function ExamDates() {
  const { user } = useAuth();
  const { profile, loading } = useStudyOSData();
  const [boards, setBoards] = useState([]);
  const [examSeries, setExamSeries] = useState([]);
  const [busy, setBusy] = useState(true);
  const [country, setCountry] = useState("");
  const [boardId, setBoardId] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setBusy(true);
      try {
        const [b, e] = await Promise.all([
          base44.entities.Board.list("-board", 200),
          base44.entities.ExamSeries.list("-created_date", 200),
        ]);
        setBoards(b.filter((x) => x.active));
        setExamSeries(e.filter((x) => x.active));
      } catch { /* best-effort */ }
      setBusy(false);
    })();
  }, [user]);

  const countries = useMemo(() => [...new Set(boards.map((b) => b.country))].sort(), [boards]);
  const countryBoards = useMemo(() => boards.filter((b) => b.country === country), [boards, country]);
  const selectedBoard = useMemo(() => boards.find((b) => b.board_id === boardId), [boards, boardId]);
  const boardExams = useMemo(() => examSeries.filter((e) => e.board_id === boardId), [examSeries, boardId]);

  useEffect(() => {
    if (busy || !boards.length) return;
    if (!country) {
      const pc = profile?.country && countries.includes(profile.country) ? profile.country : countries[0];
      setCountry(pc);
    }
  }, [busy, boards, countries, country, profile]);

  useEffect(() => {
    if (!countryBoards.length) return;
    if (!countryBoards.find((b) => b.board_id === boardId)) {
      const pb = profile?.board_id && countryBoards.find((b) => b.board_id === profile.board_id) ? profile.board_id : countryBoards[0].board_id;
      setBoardId(pb);
    }
  }, [countryBoards, boardId, profile]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  return (
    <div className="max-w-[960px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-4">
        <Link to="/tool/exampilot" className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> Back to ExamPilot
        </Link>
      </div>
      <div className="mb-6">
        <div className="eyebrow">ExamPilot · Resources</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-primary" /> Exam Dates
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Exam series and typical windows for your board. Exact subject-by-subject dates come from the official timetable — no fixed date is shown here.</p>
      </div>

      {busy ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <StudyPanel className="p-5 mb-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="eyebrow flex items-center gap-1 mb-2"><Globe className="w-3 h-3" /> Country / system</label>
                <select value={country} onChange={(e) => { setCountry(e.target.value); setBoardId(""); }} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-[13px] text-foreground">
                  {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="eyebrow block mb-2">Board</label>
                <select value={boardId} onChange={(e) => setBoardId(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-[13px] text-foreground">
                  {countryBoards.map((b) => <option key={b.board_id} value={b.board_id}>{b.board} — {b.qualification}</option>)}
                </select>
              </div>
            </div>
            {selectedBoard && (
              <div className="mt-3 text-[11px] text-muted-foreground">
                {selectedBoard.education_system} · {selectedBoard.qualification} · {selectedBoard.level}
              </div>
            )}
          </StudyPanel>

          <div className="flex items-start gap-2 mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-[12px] text-amber-700">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>These are typical exam windows, not exact dates. Subject-by-subject dates are published on the official timetable — confirm there before planning.</span>
          </div>

          {boardExams.length === 0 ? (
            <StudyPanel className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No exam series catalogued for this board yet.</p>
            </StudyPanel>
          ) : (
            <div className="space-y-3">
              {boardExams.map((e, i) => (
                <StudyPanel key={i} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-foreground">{e.exam_series}{e.zone ? ` · ${e.zone}` : ""}</div>
                      <div className="text-[12px] text-muted-foreground mt-1">{e.typical_window}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">Subject: board-wide series — see official timetable for subject dates</div>
                    </div>
                    {e.source_url && (
                      <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-1 text-[12px] text-primary hover:underline">
                        Official timetable <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </StudyPanel>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}