import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Shared search core behind every search entry point (the Home bar and the
// sidebar). Both halves are matched on the server — the learner's own concepts
// by name, and their board's registered resources by title — so results never
// depend on which records happen to be loaded on the page you are standing on.
export const SEARCH_MIN_QUERY = 2;
const MAX_CONCEPTS = 8;
const MAX_RESOURCES = 12;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pageRows = (r) => (Array.isArray(r) ? r : r?.items || []);

export function useSearchResults(query) {
  const [boardId, setBoardId] = useState(null); // null until resolved
  const [subjects, setSubjects] = useState([]); // id + name, for labelling concept hits
  const [concepts, setConcepts] = useState([]);
  const [resources, setResources] = useState([]);
  const [busy, setBusy] = useState(false);

  // Scope and labels: the learner's board and subject names. Loaded once.
  useEffect(() => {
    let cancelled = false;
    // Each call fails independently: a missing subject list must not switch off
    // the board-resource half of the search.
    Promise.all([
      base44.entities.LearnerProfile.list({ sort: "-created_date", limit: 1 }).catch(() => null),
      base44.entities.Subject.list({ sort: "order_index", limit: 100, fields: ["name"] }).catch(() => null),
    ]).then(([profilePage, subjectPage]) => {
      if (cancelled) return;
      setBoardId(pageRows(profilePage)[0]?.board_id || "");
      setSubjects(pageRows(subjectPage));
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (query.length < SEARCH_MIN_QUERY) {
      setConcepts([]);
      setResources([]);
      setBusy(false);
      return;
    }
    let cancelled = false;
    setBusy(true);
    const pattern = { $regex: escapeRegex(query), $options: "i" };
    Promise.all([
      base44.entities.Concept.filter({ name: pattern }, "-created_date", MAX_CONCEPTS).catch(() => []),
      boardId
        ? base44.entities.BoardResource
            .filter({ board_id: boardId, active: true, title: pattern }, "-created_date", MAX_RESOURCES)
            .catch(() => [])
        : Promise.resolve([]),
    ])
      .then(([conceptPage, resourcePage]) => {
        if (cancelled) return;
        // Same concept name can repeat within one subject; show it once.
        const seen = new Set();
        setConcepts(
          pageRows(conceptPage).filter((c) => {
            if (c.archived) return false;
            const key = `${c.subject_id}::${(c.name || "").toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
        );
        setResources(pageRows(resourcePage));
      })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [query, boardId]);

  return { boardId, subjects, concepts, resources, busy };
}