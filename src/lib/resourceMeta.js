// UI metadata for the board resource registry. Mirrors the server-side transform
// labels so the page and card share one source of truth for display.

export const RESOURCE_TYPE_LABEL = {
  official_syllabus: "Syllabus",
  official_past_paper: "Past paper",
  official_specimen: "Specimen paper",
  official_mark_scheme: "Mark scheme",
  official_model_paper: "Model paper",
  official_textbook: "Official textbook",
  notes: "Notes & guides",
  guide: "Guide",
  quiz: "Quizzes & practice",
  youtube: "Videos",
  book: "Books",
  exam_timetable: "Exam timetable",
  other: "Resource",
};

export const AUTHORITY_LABEL = {
  official: "Official",
  official_textbook_authority: "Official textbook",
  board_mapped_supplementary: "Board-mapped supplementary",
  general_supplementary: "Supplementary",
};

export const AUTHORITY_STYLE = {
  official: "bg-primary/10 text-primary border-primary/30",
  official_textbook_authority: "bg-emerald-100 text-emerald-700 border-emerald-300",
  board_mapped_supplementary: "bg-amber-100 text-amber-700 border-amber-300",
  general_supplementary: "bg-slate-100 text-slate-600 border-slate-300",
};

// Display groups (spec §11). Each resource_type maps to exactly one group.
export const GROUP_ORDER = ["official_syllabus", "exam_timetable", "official_past_paper", "book", "notes", "quiz", "youtube", "other"];

export const GROUP_LABEL = {
  official_syllabus: "Syllabus",
  exam_timetable: "Exam timetable",
  official_past_paper: "Past papers",
  book: "Books",
  notes: "Notes & guides",
  quiz: "Quizzes & practice",
  youtube: "Videos",
  other: "Other",
};

export function groupForType(type) {
  if (type === "exam_timetable") return "exam_timetable";
  if (type === "official_past_paper") return "official_past_paper";
  if (type === "book" || type === "official_textbook") return "book";
  if (type === "notes" || type === "guide") return "notes";
  if (type === "quiz") return "quiz";
  if (type === "youtube") return "youtube";
  return "other";
}