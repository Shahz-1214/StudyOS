import { useState, useEffect, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { base44 } from "@/api/base44Client";
import StudyPanel from "@/components/StudyPanel";
import PastPaperCard from "@/components/resources/PastPaperCard";
import { Loader2, FileText, AlertTriangle, ChevronLeft, ChevronRight, Globe, Filter, ExternalLink } from "lucide-react";

const OFFICIAL_PAPER_TYPES = ["official_past_paper", "official_specimen", "official_mark_scheme", "official_model_paper"];

// A resource belongs in Past Papers if it is an official paper, or a
// third-party supplementary past-paper/practice hub (mapped to notes/quiz).
function isPaperResource(r) {
  if (OFFICIAL_PAPER_TYPES.includes(r.resource_type)) return true;
  if (
    (r.authority_level === "board_mapped_supplementary" || r.authority_level === "general_supplementary") &&
    (r.resource_type === "notes" || r.resource_type === "quiz")
  ) return true;
  return false;
}

export default function PastPapers() {
  const { user } = useAuth();
  const { profile, loading } = useStudyOSData();
  const [boards, setBoards] = useState([]);
  const [resources, setResources] = useState([]);
  const [examSeries, setExamSeries] = useState([]);
  const [busy, setBusy] = useState(true);
  const [country, setCountry] = useState("");
  const [boardId, setBoardId] = useState("");
  const [session, setSession] = useState("");
  const [subject, setSubject] = useState("");
  const [year, setYear] = useState("");
  const [component, setComponent] = useState("");
  const [savedMap, setSavedMap] = useState({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      setBusy(true);
      try {
        const [b, r, e] = await Promise.all([
          base44.entities.Board.list("-board", 200),
          base44.entities.BoardResource.list("-created_date", 500),
          base44.entities.ExamSeries.list("-created_date", 200),
        ]);
        setBoards(b.filter((x) => x.active));
        setResources(r.filter((x) => x.active));
        setExamSeries(e.filter((x) => x.active));
      } catch { /* best-effort */ }
      setBusy(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    base44.entities.SavedPaper.list("-created_date", 200)
      .then((rows) => setSavedMap(Object.fromEntries(rows.map((r) => [r.resource_id, r.id]))))
      .catch(() => {});
  }, [user]);

  const countries = useMemo(() => [...new Set(boards.map((b) => b.country))].sort(), [boards]);
  const countryBoards = useMemo(() => boards.filter((b) => b.country === country), [boards, country]);
  const selectedBoard = useMemo(() => boards.find((b) => b.board_id === boardId), [boards, boardId]);

  // Default country/board from the learner profile when available.
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

  const boardSessions = useMemo(() => examSeries.filter((e) => e.board_id === boardId), [examSeries, boardId]);
  const boardResources = useMemo(() => resources.filter((r) => r.board_id === boardId && isPaperResource(r)), [resources, boardId]);

  // Subject / year / component filter options come from actual resource data
  // (currently board-level entry points, so these are "where available").
  const subjectOptions = useMemo(() => [...new Set(boardResources.map((r) => r.subject_name).filter(Boolean))].sort(), [boardResources]);
  const yearOptions = useMemo(() => [...new Set(boardResources.map((r) => r.syllabus_year).filter(Boolean))].sort(), [boardResources]);
  const componentOptions = useMemo(() => [...new Set(boardResources.map((r) => r.class_or_year).filter(Boolean))].sort(), [boardResources]);

  const filtered = useMemo(() => boardResources.filter((r) => {
    if (subject && r.subject_name !== subject) return false;
    if (year && r.syllabus_year !== year) return false;
    if (component && r.class_or_year !== component) return false;
    return true;
  }), [boardResources, subject, year, component]);

  const sessionInfo = session ? boardSessions.find((s) => s.exam_series === session) : null;

  async function toggleSave(r) {
    const existing = savedMap[r.resource_id];
    try {
      if (existing) {
        await base44.entities.SavedPaper.delete(existing);
        setSavedMap((m) => { const n = { ...m }; delete n[r.resource_id]; return n; });
      } else {
        const created = await base44.entities.SavedPaper.create({
          resource_id: r.resource_id || "",
          board_id: r.board_id || "",
          title: r.title,
          url: r.url,
          resource_type: r.resource_type,
          authority_level: r.authority_level,
          provider: r.provider || "",
          subject_id: "",
          note: "",
        });
        setSavedMap((m) => ({ ...m, [r.resource_id]: created.id }));
      }
    } catch { /* ignore */ }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  return (
    <div className="max-w-[960px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/tool/exampilot" className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> Back to ExamPilot
        </Link>
        <Link to="/exam-vault" className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline">
          Exam Vault <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="mb-6">
        <div className="eyebrow">ExamPilot · Resources</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" /> Past Papers
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Official past papers, specimen papers, mark schemes and model papers — clearly labelled. Third-party material is marked as supplementary.</p>
      </div>

      {busy ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <StudyPanel className="p-5 mb-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="eyebrow flex items-center gap-1 mb-2"><Globe className="w-3 h-3" /> Country / system</label>
                <select value={country} onChange={(e) => { setCountry(e.target.value); setBoardId(""); setSession(""); }} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-[13px] text-foreground">
                  {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="eyebrow block mb-2">Board</label>
                <select value={boardId} onChange={(e) => { setBoardId(e.target.value); setSession(""); setSubject(""); setYear(""); setComponent(""); }} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-[13px] text-foreground">
                  {countryBoards.map((b) => <option key={b.board_id} value={b.board_id}>{b.board} — {b.qualification}</option>)}
                </select>
              </div>
            </div>
            {selectedBoard && (
              <div className="mt-3 text-[11px] text-muted-foreground">
                {selectedBoard.education_system} · {selectedBoard.qualification} · {selectedBoard.level}
              </div>
            )}
            {selectedBoard?.requires_subboard && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-[12px] text-amber-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{selectedBoard.qualification} requires a sub-board (e.g. FBISE or a provincial BISE). Pick your exact sub-board, subject and year on the official page before using any paper.</span>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div>
                <label className="eyebrow block mb-1.5">Session</label>
                <select value={session} onChange={(e) => setSession(e.target.value)} className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-[12px] text-foreground">
                  <option value="">All sessions</option>
                  {boardSessions.map((s) => <option key={s.exam_series} value={s.exam_series}>{s.exam_series}</option>)}
                </select>
              </div>
              <div>
                <label className="eyebrow block mb-1.5">Subject</label>
                <select value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!subjectOptions.length} className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-[12px] text-foreground disabled:opacity-50">
                  <option value="">All</option>
                  {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="eyebrow block mb-1.5">Year</label>
                <select value={year} onChange={(e) => setYear(e.target.value)} disabled={!yearOptions.length} className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-[12px] text-foreground disabled:opacity-50">
                  <option value="">All</option>
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="eyebrow block mb-1.5">Component / Paper</label>
                <select value={component} onChange={(e) => setComponent(e.target.value)} disabled={!componentOptions.length} className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-[12px] text-foreground disabled:opacity-50">
                  <option value="">All</option>
                  {componentOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            {!subjectOptions.length && !yearOptions.length && !componentOptions.length && (
              <p className="text-[11px] text-muted-foreground mt-3 flex items-start gap-1.5">
                <Filter className="w-3 h-3 mt-0.5 shrink-0" />
                Subject-, year- and component-level papers aren't catalogued yet — these are official board entry points. Open the official hub to choose your exact subject, year and paper.
              </p>
            )}
          </StudyPanel>

          {sessionInfo && (
            <StudyPanel className="p-4 mb-5">
              <div className="eyebrow mb-1">{sessionInfo.exam_series}{sessionInfo.zone ? ` · ${sessionInfo.zone}` : ""}</div>
              <p className="text-[12px] text-muted-foreground">{sessionInfo.typical_window}</p>
              {sessionInfo.source_url && (
                <a href={sessionInfo.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline mt-1">
                  Official timetable <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </StudyPanel>
          )}

          {filtered.length === 0 ? (
            <StudyPanel className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No past papers catalogued for this board yet.</p>
            </StudyPanel>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {filtered.map((r) => <PastPaperCard key={r.id} resource={r} saved={!!savedMap[r.resource_id]} onToggleSave={toggleSave} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}