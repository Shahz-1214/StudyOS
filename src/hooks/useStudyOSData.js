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
      setProfile(profiles[0] || null);
      setSubjects(subs);
      setConcepts(cons);
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