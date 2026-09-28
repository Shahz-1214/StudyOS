// StudyOS — Punjab Matric / SSC compulsory textbook registry (PECTAA).
//
// Deterministic data module. No AI is used anywhere for book identification,
// deduplication, indexing, metadata extraction or linking.
//
// Every URL below is an exact link supplied by the operator. None of them are
// constructed, shortened, substituted or guessed. Each was independently
// verified byte-level (file magic bytes "%PDF-") on 2026-09-28; the recorded
// byte sizes come from that verification pass.
//
// `media_confirmation_required` marks links where Google Drive serves its
// large-file confirmation interstitial before the PDF. The link is genuine and
// the file IS a PDF — the browser simply completes the handshake first. It is
// flagged so the UI can say so honestly instead of appearing broken.

export const VERIFIED_ON = "2026-09-28";

export const SOURCE_AUTHORITY =
  "Punjab Education Curriculum Training and Assessment Authority (PECTAA)";

export const PECTAA_EBOOKS_URL = "https://pectaa.edu.pk/curriculum-compliance/";

export const PROVENANCE =
  "PECTAA E-Books — " + PECTAA_EBOOKS_URL + " (verified " + VERIFIED_ON + ")";

export const COPYRIGHT_NOTE =
  "Official PECTAA-hosted textbook file. StudyOS links to the official source and does not re-host or reproduce it.";

// Canonical sub-board under the existing Matric (SSC) parent board (pk-ssc).
// Additive: it does not create or replace a Punjab / Matric / SSC board.
export const SUB_BOARD = {
  sub_board_id: "bise-punjab",
  name: "BISE Punjab",
  parent_board_id: "pk-ssc",
  region: "Punjab",
  country: "Pakistan",
  curriculum_authority: "PECTAA",
  curriculum_url: PECTAA_EBOOKS_URL,
  verified_on: VERIFIED_ON,
  active: true,
};

const DRIVE = "https://drive.google.com/uc?export=download&id=";
const DRIVE_RECORD = "https://drive.google.com/file/d/";
const SHARING = "/view?usp=sharing";
const DRIVE_LINK = "/view?usp=drive_link";

// Compulsory subjects only, Classes 9 and 10. English Medium and Urdu Medium
// are separate textbook variants with separate files — never duplicates.
export const TEXTBOOKS = [
  {
    resource_id: "pk-ssc-tb-001",
    class_or_year: "Class 9",
    subject_name: "Tarjuma-tul-Quran-ul-Majeed",
    medium: "unspecified",
    syllabus_year: "",
    title: "Tarjuma-tul-Quran-ul-Majeed — Class 9",
    url: DRIVE + "157EhLaNBr6h1XNrF6k2mflsdui9RfYaU",
    source_record: DRIVE_RECORD + "157EhLaNBr6h1XNrF6k2mflsdui9RfYaU" + SHARING,
    file_bytes: 35605320,
    media_confirmation_required: false,
  },
  {
    resource_id: "pk-ssc-tb-002",
    class_or_year: "Class 9",
    subject_name: "Islamiat",
    medium: "unspecified",
    syllabus_year: "",
    title: "Islamiat — Class 9",
    url: DRIVE + "1kiaCqhXsXuuZ7HAAuXYfjl4_WaBf-ARS",
    source_record: DRIVE_RECORD + "1kiaCqhXsXuuZ7HAAuXYfjl4_WaBf-ARS" + SHARING,
    file_bytes: 25011563,
    media_confirmation_required: false,
  },
  {
    resource_id: "pk-ssc-tb-003",
    class_or_year: "Class 9",
    subject_name: "Urdu",
    medium: "unspecified",
    syllabus_year: "",
    title: "Urdu — Class 9",
    url: DRIVE + "1anDiX4MZVNmMOzwrwLS7AV0qm5gxO5RF",
    source_record: DRIVE_RECORD + "1anDiX4MZVNmMOzwrwLS7AV0qm5gxO5RF" + SHARING,
    file_bytes: 39732446,
    media_confirmation_required: false,
  },
  {
    resource_id: "pk-ssc-tb-004",
    class_or_year: "Class 9",
    subject_name: "English",
    medium: "unspecified",
    syllabus_year: "",
    title: "English — Class 9",
    url: DRIVE + "1mWBO-wzXqv0Oq9oazcjM-Y16EqmPqBtj",
    source_record: DRIVE_RECORD + "1mWBO-wzXqv0Oq9oazcjM-Y16EqmPqBtj" + SHARING,
    file_bytes: 19576377,
    media_confirmation_required: false,
  },
  {
    resource_id: "pk-ssc-tb-005",
    class_or_year: "Class 9",
    subject_name: "Mathematics",
    medium: "english",
    syllabus_year: "",
    title: "Mathematics — Class 9 (English Medium)",
    url: DRIVE + "1IHxM96F221JY3uL4jEIRWQ8NxskXyilF",
    source_record: DRIVE_RECORD + "1IHxM96F221JY3uL4jEIRWQ8NxskXyilF" + SHARING,
    file_bytes: 113912128,
    media_confirmation_required: true,
  },
  {
    resource_id: "pk-ssc-tb-006",
    class_or_year: "Class 9",
    subject_name: "Mathematics",
    medium: "urdu",
    syllabus_year: "",
    title: "Mathematics — Class 9 (Urdu Medium)",
    url: DRIVE + "1uSduNMyaebkeOlAis_oh4KUBKssMAT2M",
    source_record: DRIVE_RECORD + "1uSduNMyaebkeOlAis_oh4KUBKssMAT2M" + SHARING,
    file_bytes: 97707720,
    media_confirmation_required: false,
  },
  {
    resource_id: "pk-ssc-tb-007",
    class_or_year: "Class 10",
    subject_name: "Tarjuma-tul-Quran-ul-Majeed",
    medium: "unspecified",
    syllabus_year: "",
    title: "Tarjuma-tul-Quran-ul-Majeed — Class 10",
    url: DRIVE + "1DMkY84-p4zsQbjKzyGcsTxIXsMGDxOeM",
    source_record: DRIVE_RECORD + "1DMkY84-p4zsQbjKzyGcsTxIXsMGDxOeM" + SHARING,
    file_bytes: 166991816,
    media_confirmation_required: true,
  },
  {
    resource_id: "pk-ssc-tb-008",
    class_or_year: "Class 10",
    subject_name: "Islamiat",
    medium: "unspecified",
    syllabus_year: "",
    title: "Islamiat — Class 10",
    url: DRIVE + "17pwBhL5Zcr19mcEZwa0hXuG62SYC-YfV",
    source_record: DRIVE_RECORD + "17pwBhL5Zcr19mcEZwa0hXuG62SYC-YfV" + SHARING,
    file_bytes: 35645002,
    media_confirmation_required: false,
  },
  {
    resource_id: "pk-ssc-tb-009",
    class_or_year: "Class 10",
    subject_name: "Urdu",
    medium: "unspecified",
    syllabus_year: "",
    title: "Urdu — Class 10",
    url: DRIVE + "1rvX2aIfWwwH_N7V4jsGwMmkpwteDlUmB",
    source_record: DRIVE_RECORD + "1rvX2aIfWwwH_N7V4jsGwMmkpwteDlUmB" + DRIVE_LINK,
    file_bytes: 86277897,
    media_confirmation_required: false,
  },
  {
    resource_id: "pk-ssc-tb-010",
    class_or_year: "Class 10",
    subject_name: "English",
    medium: "unspecified",
    syllabus_year: "2026-27",
    title: "English — Class 10 (2026–27)",
    url: DRIVE + "1DIhnZpXMa_5-GiS4KLq9B0ITTAOnPlr4",
    source_record: DRIVE_RECORD + "1DIhnZpXMa_5-GiS4KLq9B0ITTAOnPlr4" + DRIVE_LINK,
    file_bytes: 48593549,
    media_confirmation_required: false,
  },
  {
    resource_id: "pk-ssc-tb-011",
    class_or_year: "Class 10",
    subject_name: "Mathematics",
    medium: "unspecified",
    syllabus_year: "2026-27",
    title: "Mathematics — Class 10 (2026–27)",
    url: DRIVE + "1oiEZlsGqnwvAzHgB8Yp1RWi6AnvJ-UE1",
    source_record: DRIVE_RECORD + "1oiEZlsGqnwvAzHgB8Yp1RWi6AnvJ-UE1" + DRIVE_LINK,
    file_bytes: 103679382,
    media_confirmation_required: false,
  },
  {
    resource_id: "pk-ssc-tb-012",
    class_or_year: "Class 10",
    subject_name: "Pakistan Studies",
    medium: "english",
    syllabus_year: "",
    title: "Pakistan Studies — Class 10 (English Medium)",
    url: DRIVE + "1-4tyA97RPFni6fju0-vTA_w1thjBjtVs",
    source_record: DRIVE_RECORD + "1-4tyA97RPFni6fju0-vTA_w1thjBjtVs" + SHARING,
    file_bytes: 103176678,
    media_confirmation_required: false,
  },
  {
    resource_id: "pk-ssc-tb-013",
    class_or_year: "Class 10",
    subject_name: "Pakistan Studies",
    medium: "urdu",
    syllabus_year: "",
    title: "Pakistan Studies — Class 10 (Urdu Medium)",
    url: DRIVE + "1HeCYkhQimYehdXb6R4vEisIa3qUQtsTt",
    source_record: DRIVE_RECORD + "1HeCYkhQimYehdXb6R4vEisIa3qUQtsTt" + DRIVE_LINK,
    file_bytes: 90106592,
    media_confirmation_required: false,
  },
];

// Deterministic, human-readable notes per record. No AI, no inference.
export function buildNotes(textbook) {
  const parts = [];
  if (textbook.medium === "urdu") {
    parts.push("Urdu Medium edition — a separate textbook file from the English Medium edition.");
  } else if (textbook.medium === "english") {
    parts.push("English Medium edition.");
  }
  if (textbook.media_confirmation_required) {
    parts.push("This direct link completes Google Drive's large-file confirmation step in the browser before the PDF loads.");
  }
  return parts.join(" ");
}