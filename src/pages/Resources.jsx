import { useState, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { base44 } from "@/api/base44Client";
import StudyPanel from "@/components/StudyPanel";
import ResourceCard from "@/components/resources/ResourceCard";
import { GROUP_ORDER, GROUP_LABEL, groupForType, AUTHORITY_LABEL } from "@/lib/resourceMeta";
import { Loader2, Library, AlertTriangle, ChevronRight, CalendarClock, Globe } from "lucide-react";

export default function Resources() {
  const { user } = useAuth();
  const { profile, loading } = useStudyOSData();
  const [boards, setBoards] = useState([]);
  const [resources, setResources] = useState([]);
  const [examSeries, setExamSeries] = useState([]);
  const [busy, setBusy] = useState(true);
  const [country, setCountry] = useState("");
  const [boardId, setBoardId] = useState("");
  const [authorityFilter, setAuthorityFilter] = useState("all");

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
        setBoards(b);
        setResources(r.filter((x) => x.active));
        setExamSeries(e.filter((x) => x.active));
      } catch { /* best-effort */ }
      setBusy(false);
    })();
  }, [user]);

  const countries = useMemo(() => [...new Set(boards.map((b) => b.country))].sort(), [boards]);
  const countryBoards = useMemo(() => boards.filter((b) => b.country === country), [boards, country]);
  const selectedBoard = useMemo(() => boards.find((b) => b.board_id === boardId), [boards, boardId]);

  useEffect(() => {
    if (countries.length && !country) setCountry(countries[0]);
  }, [countries, country]);

  useEffect(() => {
    if (countryBoards.length && !countryBoards.find((b) => b.board_id === boardId)) {
      setBoardId(countryBoards[0].board_id);
    }
  }, [countryBoards, boardId]);

  const boardResources = useMemo(
    () => resources.filter((r) => r.board_id === boardId && (authorityFilter === "all" || (authorityFilter === "official" ? r.authority_level === "official" || r.authority_level === "official_textbook_authority" : r.authority_level !== "official" && r.authority_level !== "official_textbook_authority"))),
    [resources, boardId, authorityFilter]
  );
  const boardExams = useMemo(() => examSeries.filter((e) => e.board_id === boardId), [examSeries, boardId]);

  const grouped = useMemo(() => {
    const g = {};
    for (const r of boardResources) {
      const k = groupForType(r.resource_type);
      (g[k] = g[k] || []).push(r);
    }
    return g;
  }, [boardResources]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  return (
    <div className="max-w-[960px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Library · Verified registry 2026-09-16</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <Library className="w-6 h-6 text-primary" /> Board Resources
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Official board sources first, verified supplementary second. Every resource is matched to a board — never call supplementary material "official."</p>
      </div>

      {busy ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Selectors: country → board */}
          <StudyPanel className="p-5 mb-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="eyebrow flex items-center gap-1 mb-2"><Globe className="w-3 h-3" /> Country / system</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-[13px] text-foreground">
                  {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="eyebrow block mb-2">Board / qualification</label>
                <select value={boardId} onChange={(e) => setBoardId(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-[13px] text-foreground">
                  {countryBoards.map((b) => <option key={b.board_id} value={b.board_id}>{b.board} — {b.qualification}</option>)}
                </select>
              </div>
            </div>

            {selectedBoard?.requires_subboard && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-[12px] text-amber-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span><strong>{selectedBoard.qualification}</strong> is a qualification level, not a single board. These are official hubs (FBISE / BISE Lahore / PECTAA) — select your exact sub-board, subject and year on the official page before using any resource.</span>
              </div>
            )}
            {selectedBoard && (
              <p className="text-[11px] text-muted-foreground mt-3">{selectedBoard.subject_rule}</p>
            )}
          </StudyPanel>

          {selectedBoard && (
            <>
              {/* Authority filter */}
              <div className="flex items-center gap-2 mb-4">
                {[["all", "All"], ["official", "Official"], ["supplementary", "Supplementary"]].map(([k, l]) => (
                  <button key={k} onClick={() => setAuthorityFilter(k)} className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${authorityFilter === k ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"}`}>{l}</button>
                ))}
              </div>

              {/* Exam timetable */}
              {boardExams.length > 0 && (
                <StudyPanel className="p-4 mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarClock className="w-4 h-4 text-primary" />
                    <span className="eyebrow">Exam window</span>
                  </div>
                  <div className="space-y-2">
                    {boardExams.map((e, i) => (
                      <div key={i} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-foreground">{e.exam_series}{e.zone ? ` · ${e.zone}` : ""}</div>
                          <div className="text-[12px] text-muted-foreground mt-0.5">{e.typical_window}</div>
                        </div>
                        {e.source_url && (
                          <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-1 text-[12px] text-primary hover:underline">
                            Official timetable <ChevronRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">Exact dates come from the current official timetable — no fixed date is stored.</p>
                </StudyPanel>
              )}

              {/* Resource groups */}
              {boardResources.length === 0 ? (
                <StudyPanel className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">No verified resources for this board yet.</p>
                </StudyPanel>
              ) : (
                <div className="space-y-6">
                  {GROUP_ORDER.filter((g) => grouped[g]?.length).map((g) => (
                    <div key={g}>
                      <div className="flex items-center gap-2 mb-3">
                        <h2 className="text-[15px] font-bold text-foreground">{GROUP_LABEL[g]}</h2>
                        <span className="text-[11px] text-muted-foreground">· {grouped[g].length}</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {grouped[g].map((r) => <ResourceCard key={r.id} resource={r} />)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-muted-foreground mt-6">
                Resource matching: a resource appears only when country, board, qualification and level match. Subject and syllabus/year must be confirmed on the official page — these are board-level entry points, not subject-specific claims.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}