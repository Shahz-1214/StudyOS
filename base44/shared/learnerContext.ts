// Builds canonical board / qualification / subject context for AI prompts.
// Server-side only. AI functions include the returned contextText in their
// prompts and instruct the model not to invent board facts or citations.

export async function buildLearnerContext(base44) {
  try {
    const profiles = await base44.entities.LearnerProfile.list();
    const canonical = (profiles || [])
      .filter((p) => !p.archived)
      .sort((a, b) => Number(!!b.onboarding_completed) - Number(!!a.onboarding_completed)
        || String(a.created_date || "").localeCompare(String(b.created_date || "")))[0] || null;
    if (!canonical) return { contextText: "", board: null, profile: null };

    let board = null;
    if (canonical.board_id) {
      const boards = await base44.entities.Board.filter({ board_id: canonical.board_id, active: true });
      board = (boards || [])[0] || null;
    }

    const parts: string[] = [];
    parts.push(`Education level: ${canonical.education_level || "unspecified"}`);
    if (canonical.country) parts.push(`Country: ${canonical.country}`);
    if (board) {
      parts.push(`Board: ${board.board}`);
      parts.push(`Education system: ${board.education_system}`);
      parts.push(`Qualification: ${board.qualification}`);
      parts.push(`Level: ${board.level}`);
      if (board.subject_rule) parts.push(`Board subject rule: ${board.subject_rule}`);
    } else {
      parts.push("Board: none selected");
    }

    const contextText = parts.join("\n");
    return { contextText, board, profile: canonical };
  } catch {
    return { contextText: "", board: null, profile: null };
  }
}

// Standard instruction appended to every AI prompt that touches board facts.
export const AI_FACT_RULE = `Important: use only the provided learner/board context. Do NOT invent board names, subject codes, syllabus years, exam dates, textbooks, past papers, or citations. If verified context is unavailable for a fact, say plainly that the information is not available and suggest checking the official board source.`;