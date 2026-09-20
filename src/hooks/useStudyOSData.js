import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

// One shared data hook for Stage 1 foundation data. Avoids each page issuing
// its own overlapping queries (per the "don't load every record on dashboard"
// principle). Later stages extend this with paginated/lazy collections.
export function useStudyOSData() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [events, setEvents] = useState([]);
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
        base44.entities.Subject.list("order_index", 50),
        base44.entities.Concept.list("-created_date", 300),
        base44.entities.Event.list("-occurred_at", 20),
      ]);
      const canonical = [...profiles].filter((p) => !p.archived).sort((a, b) => { const completed = Number(!!b.onboarding_completed) - Number(!!a.onboarding_completed); return completed || String(a.created_date || "").localeCompare(String(b.created_date || "")); })[0] || null;
      const activeSubjects = canonical ? await base44.entities.Subject.filter({ learner_profile_id: canonical.id, archived: false }, "order_index", 100) : [];
      const activeSubjectIds = new Set(activeSubjects.map((s) => s.id));
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
          await base44.entities.LearnerProfile.update(canonical.id, { streak, last_active_date: today });
        }
      }
      setProfile(activeProfile);
      setSubjects(activeSubjects);
      setConcepts(cons.filter((c) => !c.archived && activeSubjectIds.has(c.subject_id)));
      setEvents(evs);
    } catch (err) {
      setError(err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return { user, profile, subjects, concepts, events, loading, error, reload: load };
}