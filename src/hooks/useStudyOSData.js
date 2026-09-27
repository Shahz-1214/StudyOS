import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

// One shared data hook for Stage 1 foundation data. Avoids each page issuing
// its own overlapping queries (per the "don't load every record on dashboard"
// principle). Later stages extend this with paginated/lazy collections.
//
// Data integrity (idempotent, runs only when issues are detected):
//  - Exactly one active canonical LearnerProfile per user: extra non-archived
//    profiles are archived (never deleted) so historical data is preserved.
//  - Every active Subject belongs to the canonical learner_profile_id:
//    orphan active subjects (empty or mismatched profile id) are reassociated.
export function useStudyOSData() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [events, setEvents] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [profiles, subs, cons, evs] = await Promise.all([
        base44.entities.LearnerProfile.list(),
        base44.entities.Subject.list("order_index", 100),
        base44.entities.Concept.list("-created_date", 300),
        base44.entities.Event.list("-occurred_at", 20),
      ]);

      const activeProfiles = (profiles || []).filter((p) => !p.archived);
      const canonical = [...activeProfiles].sort((a, b) => {
        const completed = Number(!!b.onboarding_completed) - Number(!!a.onboarding_completed);
        return completed || String(a.created_date || "").localeCompare(String(b.created_date || ""));
      })[0] || null;

      // Repair 1: archive duplicate active profiles (keep canonical). Idempotent.
      if (canonical && activeProfiles.length > 1) {
        const dupes = activeProfiles.filter((p) => p.id !== canonical.id);
        await Promise.all(
          dupes.map((p) => base44.entities.LearnerProfile.update(p.id, { archived: true }).catch(() => {}))
        );
      }

      // Repair 2: reassociate orphan active subjects to the canonical profile.
      // Orphan = active subject whose learner_profile_id is empty or points to
      // a non-canonical profile. Idempotent.
      let activeSubjects = subs || [];
      if (canonical) {
        const orphans = activeSubjects.filter(
          (s) => !s.archived && s.learner_profile_id !== canonical.id
        );
        if (orphans.length) {
          await Promise.all(
            orphans.map((s) =>
              base44.entities.Subject.update(s.id, { learner_profile_id: canonical.id }).catch(() => {})
            )
          );
          // Refresh the local list so the UI reflects the repair immediately.
          activeSubjects = activeSubjects.map((s) =>
            orphans.find((o) => o.id === s.id) ? { ...s, learner_profile_id: canonical.id } : s
          );
        }
        activeSubjects = activeSubjects.filter((s) => !s.archived && s.learner_profile_id === canonical.id);
      } else {
        activeSubjects = activeSubjects.filter((s) => !s.archived);
      }

      const activeSubjectIds = new Set(activeSubjects.map((s) => s.id));

      // Streak update (deterministic, idempotent within the day).
      let activeProfile = canonical;
      if (canonical) {
        const today = new Date().toISOString().slice(0, 10);
        const last = canonical.last_active_date || "";
        let streak = Number(canonical.streak || 0);
        if (last !== today) {
          const prev = last ? new Date(`${last}T00:00:00Z`) : null;
          const nowDay = new Date(`${today}T00:00:00Z`);
          const diff = prev ? Math.round((nowDay.getTime() - prev.getTime()) / 86400000) : null;
          streak = diff === 1 ? streak + 1 : 1;
          activeProfile = { ...canonical, streak, last_active_date: today };
          await base44.entities.LearnerProfile.update(canonical.id, { streak, last_active_date: today }).catch(() => {});
        }
      }

      // Learner's personal exams (distinct from board ExamSeries).
      let learnerExams = [];
      if (canonical) {
        learnerExams = await base44.entities.LearnerExam
          .filter({ archived: false, status: "upcoming" }, "exam_date", 50)
          .catch(() => []);
      }

      setProfile(activeProfile);
      setSubjects(activeSubjects);
      setConcepts((cons || []).filter((c) => !c.archived && activeSubjectIds.has(c.subject_id)));
      const internalEvents = new Set(["ai_quota_reserved", "ai_quota_refunded", "ai_quota_cancelled", "promo_code_attempt"]);
      setEvents((evs || []).filter((event) => !internalEvents.has(event.event_name)));
      setExams(learnerExams || []);
    } catch {
      setError(new Error("Could not load StudyOS data."));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return { user, profile, subjects, concepts, events, exams, loading, error, reload: load };
}