// StudyOS Board Resource Registry — canonical transform + dedup.
// Source: StudyOS_Board_Resource_Registry (verified 2026-09-16).
// This module is server-side only (base44/shared). It holds the raw verified
// registry and turns it into entity-ready records, applying the hierarchy,
// resource-type, authority, copyright and dedup rules from the integration spec.

const VERIFIED_ON = "2026-09-16";
const PROVENANCE = "StudyOS Board Resource Registry 2026-09-16";

export const RESOURCE_TYPE_LABEL = {
  official_syllabus: "Official syllabus",
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

// 10 boards. SSC/HSSC are qualification-levels that REQUIRE a sub-board.
const BOARDS_META = [
  {
    board_id: "pk-ssc", board: "Matric (SSC)", country: "Pakistan", education_system: "Pakistan",
    qualification: "SSC", level: "Secondary (Class IX–X)", type: "qualification-level (NOT a single board)",
    current_status: "Requires sub-board selection (e.g., FBISE or a provincial BISE). Do not attach one universal syllabus/paper set.",
    exam_window: "Varies by sub-board. Punjab 2026: SSC Part-II began in March; SSC Part-I followed in April. FBISE 2026 SSC annual exams ran in April. Exact dates are board-specific.",
    requires_subboard: true,
    official_sources: ["https://www.fbise.edu.pk/syllabus.php", "https://www.fbise.edu.pk/allpaper.php", "https://pectaa.edu.pk/curriculum-compliance/", "https://home.biselahore.com/"],
    supplementary: ["https://www.ilmkidunya.com/9th-class", "https://www.ilmkidunya.com/10th-class", "https://www.youtube.com/@ilmkidunyanotes2359"],
    subject_rule: "Subject set depends on the selected BISE/FBISE board and group; never hard-code one universal list.",
  },
  {
    board_id: "pk-hssc", board: "Intermediate (HSSC)", country: "Pakistan", education_system: "Pakistan",
    qualification: "HSSC", level: "Higher Secondary (Class XI–XII)", type: "qualification-level (NOT a single board)",
    current_status: "Requires sub-board selection (e.g., FBISE or provincial BISE) and group/subject combination.",
    exam_window: "Varies by sub-board and part. Punjab 2026 HSSC annual schedules fall mainly in May/June; FBISE publishes its own 2026 HSSC date sheet.",
    requires_subboard: true,
    official_sources: ["https://www.fbise.edu.pk/syllabus.php", "https://www.fbise.edu.pk/allpaper.php", "https://pectaa.edu.pk/curriculum-compliance/", "https://home.biselahore.com/"],
    supplementary: ["https://www.ilmkidunya.com/11th-class", "https://www.ilmkidunya.com/12th-class", "https://www.youtube.com/@ilmkidunyanotes2359"],
    subject_rule: "Group/board dependent; do not infer subjects from the word HSSC alone.",
  },
  {
    board_id: "cambridge-o-level", board: "Cambridge O Level", country: "International", education_system: "Cambridge International",
    qualification: "O Level", level: "Upper Secondary", type: "qualification",
    current_status: "Official Cambridge subject directory; public past papers are a selection, with broader access for registered schools.",
    exam_window: "Normally June and November; Cambridge publishes zone-specific timetables. Results normally August and January.",
    requires_subboard: false,
    official_sources: ["https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-o-level/", "https://www.cambridgeinternational.org/support-and-training-for-schools/endorsed-resources/", "https://www.cambridgeinternational.org/exam-administration/cambridge-exams-officers-guide/phase-1-preparation/timetabling-exams/exam-timetables/"],
    supplementary: ["https://www.savemyexams.com/igcse/", "https://www.physicsandmathstutor.com/", "https://go.cognitoedu.org/gcse", "https://www.youtube.com/@CambridgeInt", "https://www.youtube.com/@savemyexams", "https://www.youtube.com/@physicsandmathstutor8060", "https://www.youtube.com/@Cognitoedu"],
    subject_rule: "Use Cambridge's live O Level subject directory; subject codes and syllabus years must be stored.",
  },
  {
    board_id: "cambridge-as-a-level", board: "Cambridge AS & A Level", country: "International", education_system: "Cambridge International",
    qualification: "AS & A Level", level: "Advanced", type: "qualification",
    current_status: "Official Cambridge subject directory; public past papers are a selection, with broader access for registered schools.",
    exam_window: "Normally June and November; zone-specific final timetables. March is a restricted series in limited contexts, not the normal global A Level cycle.",
    requires_subboard: false,
    official_sources: ["https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-advanced/cambridge-international-as-and-a-level/", "https://www.cambridgeinternational.org/support-and-training-for-schools/endorsed-resources/", "https://www.cambridgeinternational.org/exam-administration/cambridge-exams-officers-guide/phase-1-preparation/timetabling-exams/exam-timetables/"],
    supplementary: ["https://www.savemyexams.com/", "https://www.physicsandmathstutor.com/", "https://www.youtube.com/@CambridgeInt", "https://www.youtube.com/@savemyexams", "https://www.youtube.com/@physicsandmathstutor8060"],
    subject_rule: "Use Cambridge's live AS/A Level subject directory; store syllabus code and year per subject.",
  },
  {
    board_id: "cbse", board: "CBSE", country: "India", education_system: "CBSE",
    qualification: "Secondary & Senior Secondary", level: "Class IX–XII", type: "board",
    current_status: "Official 2026-27 curriculum is live; subject catalogue is broad and includes languages, academic electives and skill subjects.",
    exam_window: "Main Class X/XII board exams normally run February-March/April; 2026 had dates extending into April for some Class XII papers. Always use current CBSE date sheet.",
    requires_subboard: false,
    official_sources: ["https://cbseacademic.nic.in/curriculum_2027.html", "https://www.cbse.gov.in/cbsenew/question-paper.html", "https://cbseacademic.nic.in/sqp_classxii_2025-26.html", "https://cbseacademic.nic.in/SQP_CLASSX_2025-26.html", "https://cbseacademic.nic.in/qbclass12.html", "https://cbseacademic.nic.in/qbclass10.html", "https://cbseacademic.nic.in/cbe/assessment.html", "https://cbseacademic.nic.in/new-resources-srsec.html", "https://cbseacademic.nic.in/skill-education-books.html"],
    supplementary: ["https://www.ncert.nic.in/textbook.php", "https://www.magnetbrains.com/", "https://www.youtube.com/@MagnetBrainsEducation"],
    subject_rule: "Use the official 2026-27 CBSE curriculum directory. Do not hard-code only the common five subjects.",
  },
  {
    board_id: "cisce-icse", board: "CISCE — ICSE", country: "India", education_system: "CISCE",
    qualification: "ICSE", level: "Class X", type: "board qualification",
    current_status: "Official CISCE regulations/syllabus and specimen papers; exact current subject set must be linked to the relevant exam year.",
    exam_window: "Usually February-March for the main ICSE examination; exact dates are published by CISCE each year.",
    requires_subboard: false,
    official_sources: ["https://cisce.org/", "https://cisce.org/wp-content/uploads/2025/03/0.4-ICSE-Regulations-26.pdf", "https://cisce.org/wp-content/uploads/2025/02/0.-Cover-Page.pdf", "https://cisce.org/wp-content/uploads/2025/09/Circular-Release-of-Speimen-Question-papers-and-Question-Papers-of-the-Year-2025-Main-and-Improvement-Examinations.pdf", "https://www.cisce.ac/icse-x-specimen-question-papers/"],
    supplementary: ["https://www.selfstudys.com/page/icse-class-10-study-material", "https://www.extramarks.com/studymaterials/icse/", "https://www.youtube.com/@CISCEDELHI"],
    subject_rule: "Use current ICSE Regulations & Syllabuses. ICSE requires a compulsory core plus elective groups; languages/electives vary by school.",
  },
  {
    board_id: "cisce-isc", board: "CISCE — ISC", country: "India", education_system: "CISCE",
    qualification: "ISC", level: "Class XII", type: "board qualification",
    current_status: "Official ISC regulations/syllabus and specimen papers; exact current subject set must be linked to the relevant exam year.",
    exam_window: "Usually February-March for the main ISC examination, with some schedules extending into April; exact dates are annual.",
    requires_subboard: false,
    official_sources: ["https://cisce.org/", "https://cisce.org/wp-content/uploads/2025/02/1.-ISC-Regulations.pdf", "https://www.cisce.ac/isc-xii-specimen-question-papers/", "https://cisce.org/wp-content/uploads/2025/09/Circular-Release-of-Speimen-Question-papers-and-Question-Papers-of-the-Year-2025-Main-and-Improvement-Examinations.pdf"],
    supplementary: ["https://www.selfstudys.com/page/cisce-books", "https://www.extramarks.com/studymaterials/icse/icse-sample-question-papers/", "https://www.youtube.com/@CISCEDELHI"],
    subject_rule: "Use current ISC Regulations & Syllabuses. English is compulsory; elective subjects are selected from the current ISC list.",
  },
  {
    board_id: "aqa-gcse", board: "AQA — GCSE", country: "UK/International", education_system: "AQA",
    qualification: "GCSE", level: "GCSE", type: "qualification",
    current_status: "AQA official specification/past-paper finder is authoritative. Past papers on the public site are specification-dependent and copyright-restricted.",
    exam_window: "Main GCSE series: May/June; AQA also has a November GCSE series for eligible qualifications.",
    requires_subboard: false,
    official_sources: ["https://www.aqa.org.uk/subjects", "https://www.aqa.org.uk/student-and-parent-support/revision/revision-resources", "https://www.aqa.org.uk/about-us/who-we-are/our-standards/approved-textbooks", "https://www.aqa.org.uk/exams-administration/dates-and-timetables"],
    supplementary: ["https://www.savemyexams.com/gcse/", "https://www.physicsandmathstutor.com/", "https://go.cognitoedu.org/gcse", "https://www.youtube.com/@Cognitoedu", "https://www.youtube.com/@savemyexams", "https://www.youtube.com/@physicsandmathstutor8060"],
    subject_rule: "Use AQA's live subject directory and exact specification codes. Do not treat GCSE as one syllabus.",
  },
  {
    board_id: "aqa-a-level", board: "AQA — A Level", country: "UK/International", education_system: "AQA",
    qualification: "A Level", level: "A Level", type: "qualification",
    current_status: "AQA official specification/past-paper finder is authoritative; each subject has its own specification code.",
    exam_window: "Main AS/A Level series: May/June. Exact subject dates vary.",
    requires_subboard: false,
    official_sources: ["https://www.aqa.org.uk/subjects", "https://www.aqa.org.uk/student-and-parent-support/revision/revision-resources", "https://www.aqa.org.uk/about-us/who-we-are/our-standards/approved-textbooks", "https://www.aqa.org.uk/exams-administration/dates-and-timetables"],
    supplementary: ["https://www.savemyexams.com/a-level/", "https://www.physicsandmathstutor.com/", "https://www.youtube.com/@savemyexams", "https://www.youtube.com/@physicsandmathstutor8060"],
    subject_rule: "Use AQA's live subject directory and exact specification codes. Do not treat A Level as one syllabus.",
  },
  {
    board_id: "cambridge-igcse", board: "Cambridge IGCSE", country: "International", education_system: "Cambridge International",
    qualification: "IGCSE", level: "Upper Secondary", type: "qualification",
    current_status: "Official Cambridge subject directory; public past papers are a selection, with broader access for registered schools.",
    exam_window: "Normally June and November; Cambridge publishes zone-specific timetables.",
    requires_subboard: false,
    official_sources: ["https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-igcse/", "https://www.cambridgeinternational.org/support-and-training-for-schools/endorsed-resources/", "https://help.cambridgeinternational.org/hc/en-gb/articles/115004301705-Where-can-I-find-a-list-of-resources-for-Cambridge-IGCSE", "https://www.cambridgeinternational.org/exam-administration/cambridge-exams-officers-guide/phase-1-preparation/timetabling-exams/exam-timetables/"],
    supplementary: ["https://www.savemyexams.com/igcse/", "https://www.physicsandmathstutor.com/", "https://go.cognitoedu.org/gcse", "https://www.youtube.com/@CambridgeInt", "https://www.youtube.com/@savemyexams", "https://www.youtube.com/@Cognitoedu", "https://www.youtube.com/@physicsandmathstutor8060"],
    subject_rule: "Use the live Cambridge IGCSE subject directory and store subject/syllabus code + examination year.",
  },
];

// Raw resource rows from the verified registry: [board_id, category, title, url, authority, notes]
const RESOURCE_ROWS = [
  ["pk-ssc","Official syllabus / curriculum","Official source","https://www.fbise.edu.pk/syllabus.php","Official board","Use as authority; exact subject/year page must be selected."],
  ["pk-ssc","Official past papers / question papers","Official source","https://www.fbise.edu.pk/allpaper.php","Official board","Use as authority; exact subject/year page must be selected."],
  ["pk-ssc","Official syllabus / curriculum","Official source","https://pectaa.edu.pk/curriculum-compliance/","Official board","Use as authority; exact subject/year page must be selected."],
  ["pk-ssc","Official syllabus/board hub","Official source","https://home.biselahore.com/","Official board","Use as authority; exact subject/year page must be selected."],
  ["pk-ssc","Notes / quizzes / videos / past papers","www.ilmkidunya.com","https://www.ilmkidunya.com/9th-class","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["pk-ssc","Notes / quizzes / videos / past papers","www.ilmkidunya.com","https://www.ilmkidunya.com/10th-class","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["pk-ssc","YouTube channel","www.youtube.com","https://www.youtube.com/@ilmkidunyanotes2359","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["pk-hssc","Official syllabus / curriculum","Official source","https://www.fbise.edu.pk/syllabus.php","Official board","Use as authority; exact subject/year page must be selected."],
  ["pk-hssc","Official past papers / question papers","Official source","https://www.fbise.edu.pk/allpaper.php","Official board","Use as authority; exact subject/year page must be selected."],
  ["pk-hssc","Official syllabus / curriculum","Official source","https://pectaa.edu.pk/curriculum-compliance/","Official board","Use as authority; exact subject/year page must be selected."],
  ["pk-hssc","Official syllabus/board hub","Official source","https://home.biselahore.com/","Official board","Use as authority; exact subject/year page must be selected."],
  ["pk-hssc","Notes / quizzes / videos / past papers","www.ilmkidunya.com","https://www.ilmkidunya.com/11th-class","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["pk-hssc","Notes / quizzes / videos / past papers","www.ilmkidunya.com","https://www.ilmkidunya.com/12th-class","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["pk-hssc","YouTube channel","www.youtube.com","https://www.youtube.com/@ilmkidunyanotes2359","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-o-level","Official syllabus/board hub","Official source","https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-o-level/","Official board","Use as authority; exact subject/year page must be selected."],
  ["cambridge-o-level","Official syllabus/board hub","Official source","https://www.cambridgeinternational.org/support-and-training-for-schools/endorsed-resources/","Official board","Use as authority; exact subject/year page must be selected."],
  ["cambridge-o-level","Official syllabus/board hub","Official source","https://www.cambridgeinternational.org/exam-administration/cambridge-exams-officers-guide/phase-1-preparation/timetabling-exams/exam-timetables/","Official board","Use as authority; exact subject/year page must be selected."],
  ["cambridge-o-level","Notes / questions / past papers","www.savemyexams.com","https://www.savemyexams.com/igcse/","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-o-level","Notes / questions / past papers","www.physicsandmathstutor.com","https://www.physicsandmathstutor.com/","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-o-level","Notes / quizzes / videos","go.cognitoedu.org","https://go.cognitoedu.org/gcse","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-o-level","YouTube channel","www.youtube.com","https://www.youtube.com/@CambridgeInt","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-o-level","YouTube channel","www.youtube.com","https://www.youtube.com/@savemyexams","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-o-level","YouTube channel","www.youtube.com","https://www.youtube.com/@physicsandmathstutor8060","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-o-level","YouTube channel","www.youtube.com","https://www.youtube.com/@Cognitoedu","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-as-a-level","Official syllabus/board hub","Official source","https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-advanced/cambridge-international-as-and-a-level/","Official board","Use as authority; exact subject/year page must be selected."],
  ["cambridge-as-a-level","Official syllabus/board hub","Official source","https://www.cambridgeinternational.org/support-and-training-for-schools/endorsed-resources/","Official board","Use as authority; exact subject/year page must be selected."],
  ["cambridge-as-a-level","Official syllabus/board hub","Official source","https://www.cambridgeinternational.org/exam-administration/cambridge-exams-officers-guide/phase-1-preparation/timetabling-exams/exam-timetables/","Official board","Use as authority; exact subject/year page must be selected."],
  ["cambridge-as-a-level","Notes / questions / past papers","www.savemyexams.com","https://www.savemyexams.com/","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-as-a-level","Notes / questions / past papers","www.physicsandmathstutor.com","https://www.physicsandmathstutor.com/","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-as-a-level","YouTube channel","www.youtube.com","https://www.youtube.com/@CambridgeInt","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-as-a-level","YouTube channel","www.youtube.com","https://www.youtube.com/@savemyexams","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-as-a-level","YouTube channel","www.youtube.com","https://www.youtube.com/@physicsandmathstutor8060","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cbse","Official syllabus / curriculum","Official source","https://cbseacademic.nic.in/curriculum_2027.html","Official board","Use as authority; exact subject/year page must be selected."],
  ["cbse","Official past papers / question papers","Official source","https://www.cbse.gov.in/cbsenew/question-paper.html","Official board","Use as authority; exact subject/year page must be selected."],
  ["cbse","Official syllabus/board hub","Official source","https://cbseacademic.nic.in/sqp_classxii_2025-26.html","Official board","Use as authority; exact subject/year page must be selected."],
  ["cbse","Official syllabus/board hub","Official source","https://cbseacademic.nic.in/SQP_CLASSX_2025-26.html","Official board","Use as authority; exact subject/year page must be selected."],
  ["cbse","Official syllabus/board hub","Official source","https://cbseacademic.nic.in/qbclass12.html","Official board","Use as authority; exact subject/year page must be selected."],
  ["cbse","Official syllabus/board hub","Official source","https://cbseacademic.nic.in/qbclass10.html","Official board","Use as authority; exact subject/year page must be selected."],
  ["cbse","Official syllabus/board hub","Official source","https://cbseacademic.nic.in/cbe/assessment.html","Official board","Use as authority; exact subject/year page must be selected."],
  ["cbse","Official syllabus/board hub","Official source","https://cbseacademic.nic.in/new-resources-srsec.html","Official board","Use as authority; exact subject/year page must be selected."],
  ["cbse","Official syllabus/board hub","Official source","https://cbseacademic.nic.in/skill-education-books.html","Official board","Use as authority; exact subject/year page must be selected."],
  ["cbse","Supplementary resource","www.ncert.nic.in","https://www.ncert.nic.in/textbook.php","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cbse","Notes / videos / practice","www.magnetbrains.com","https://www.magnetbrains.com/","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cbse","YouTube channel","www.youtube.com","https://www.youtube.com/@MagnetBrainsEducation","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cisce-icse","Official syllabus/board hub","Official source","https://cisce.org/","Official board","Use as authority; exact subject/year page must be selected."],
  ["cisce-icse","Official syllabus / curriculum","Official source","https://cisce.org/wp-content/uploads/2025/03/0.4-ICSE-Regulations-26.pdf","Official board","Use as authority; exact subject/year page must be selected."],
  ["cisce-icse","Official syllabus/board hub","Official source","https://cisce.org/wp-content/uploads/2025/02/0.-Cover-Page.pdf","Official board","Use as authority; exact subject/year page must be selected."],
  ["cisce-icse","Official past papers / question papers","Official source","https://cisce.org/wp-content/uploads/2025/09/Circular-Release-of-Speimen-Question-papers-and-Question-Papers-of-the-Year-2025-Main-and-Improvement-Examinations.pdf","Official board","Use as authority; exact subject/year page must be selected."],
  ["cisce-icse","Official past papers / question papers","Official source","https://www.cisce.ac/icse-x-specimen-question-papers/","Official board","Use as authority; exact subject/year page must be selected."],
  ["cisce-icse","Notes / quizzes / past papers","www.selfstudys.com","https://www.selfstudys.com/page/icse-class-10-study-material","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cisce-icse","Notes / sample papers / past papers","www.extramarks.com","https://www.extramarks.com/studymaterials/icse/","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cisce-icse","YouTube channel","www.youtube.com","https://www.youtube.com/@CISCEDELHI","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cisce-isc","Official syllabus/board hub","Official source","https://cisce.org/","Official board","Use as authority; exact subject/year page must be selected."],
  ["cisce-isc","Official syllabus / curriculum","Official source","https://cisce.org/wp-content/uploads/2025/02/1.-ISC-Regulations.pdf","Official board","Use as authority; exact subject/year page must be selected."],
  ["cisce-isc","Official past papers / question papers","Official source","https://www.cisce.ac/isc-xii-specimen-question-papers/","Official board","Use as authority; exact subject/year page must be selected."],
  ["cisce-isc","Official past papers / question papers","Official source","https://cisce.org/wp-content/uploads/2025/09/Circular-Release-of-Speimen-Question-papers-and-Question-Papers-of-the-Year-2025-Main-and-Improvement-Examinations.pdf","Official board","Use as authority; exact subject/year page must be selected."],
  ["cisce-isc","Notes / quizzes / past papers","www.selfstudys.com","https://www.selfstudys.com/page/cisce-books","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cisce-isc","Notes / sample papers / past papers","www.extramarks.com","https://www.extramarks.com/studymaterials/icse/icse-sample-question-papers/","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cisce-isc","YouTube channel","www.youtube.com","https://www.youtube.com/@CISCEDELHI","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["aqa-gcse","Official syllabus/board hub","Official source","https://www.aqa.org.uk/subjects","Official board","Use as authority; exact subject/year page must be selected."],
  ["aqa-gcse","Official syllabus/board hub","Official source","https://www.aqa.org.uk/student-and-parent-support/revision/revision-resources","Official board","Use as authority; exact subject/year page must be selected."],
  ["aqa-gcse","Official syllabus/board hub","Official source","https://www.aqa.org.uk/about-us/who-we-are/our-standards/approved-textbooks","Official board","Use as authority; exact subject/year page must be selected."],
  ["aqa-gcse","Official syllabus/board hub","Official source","https://www.aqa.org.uk/exams-administration/dates-and-timetables","Official board","Use as authority; exact subject/year page must be selected."],
  ["aqa-gcse","Notes / questions / past papers","www.savemyexams.com","https://www.savemyexams.com/gcse/","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["aqa-gcse","Notes / questions / past papers","www.physicsandmathstutor.com","https://www.physicsandmathstutor.com/","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["aqa-gcse","Notes / quizzes / videos","go.cognitoedu.org","https://go.cognitoedu.org/gcse","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["aqa-gcse","YouTube channel","www.youtube.com","https://www.youtube.com/@Cognitoedu","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["aqa-gcse","YouTube channel","www.youtube.com","https://www.youtube.com/@savemyexams","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["aqa-gcse","YouTube channel","www.youtube.com","https://www.youtube.com/@physicsandmathstutor8060","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["aqa-a-level","Official syllabus/board hub","Official source","https://www.aqa.org.uk/subjects","Official board","Use as authority; exact subject/year page must be selected."],
  ["aqa-a-level","Official syllabus/board hub","Official source","https://www.aqa.org.uk/student-and-parent-support/revision/revision-resources","Official board","Use as authority; exact subject/year page must be selected."],
  ["aqa-a-level","Official syllabus/board hub","Official source","https://www.aqa.org.uk/about-us/who-we-are/our-standards/approved-textbooks","Official board","Use as authority; exact subject/year page must be selected."],
  ["aqa-a-level","Official syllabus/board hub","Official source","https://www.aqa.org.uk/exams-administration/dates-and-timetables","Official board","Use as authority; exact subject/year page must be selected."],
  ["aqa-a-level","Notes / questions / past papers","www.savemyexams.com","https://www.savemyexams.com/a-level/","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["aqa-a-level","Notes / questions / past papers","www.physicsandmathstutor.com","https://www.physicsandmathstutor.com/","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["aqa-a-level","YouTube channel","www.youtube.com","https://www.youtube.com/@savemyexams","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["aqa-a-level","YouTube channel","www.youtube.com","https://www.youtube.com/@physicsandmathstutor8060","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-igcse","Official syllabus/board hub","Official source","https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-igcse/","Official board","Use as authority; exact subject/year page must be selected."],
  ["cambridge-igcse","Official syllabus/board hub","Official source","https://www.cambridgeinternational.org/support-and-training-for-schools/endorsed-resources/","Official board","Use as authority; exact subject/year page must be selected."],
  ["cambridge-igcse","Official syllabus/board hub","Official source","https://help.cambridgeinternational.org/hc/en-gb/articles/115004301705-Where-can-I-find-a-list-of-resources-for-Cambridge-IGCSE","Official board","Use as authority; exact subject/year page must be selected."],
  ["cambridge-igcse","Official syllabus/board hub","Official source","https://www.cambridgeinternational.org/exam-administration/cambridge-exams-officers-guide/phase-1-preparation/timetabling-exams/exam-timetables/","Official board","Use as authority; exact subject/year page must be selected."],
  ["cambridge-igcse","Notes / questions / past papers","www.savemyexams.com","https://www.savemyexams.com/igcse/","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-igcse","Notes / questions / past papers","www.physicsandmathstutor.com","https://www.physicsandmathstutor.com/","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-igcse","Notes / quizzes / videos","go.cognitoedu.org","https://go.cognitoedu.org/gcse","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-igcse","YouTube channel","www.youtube.com","https://www.youtube.com/@CambridgeInt","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-igcse","YouTube channel","www.youtube.com","https://www.youtube.com/@savemyexams","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-igcse","YouTube channel","www.youtube.com","https://www.youtube.com/@Cognitoedu","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cambridge-igcse","YouTube channel","www.youtube.com","https://www.youtube.com/@physicsandmathstutor8060","Third-party","Supplementary only; match exact board, subject and syllabus before surfacing."],
  ["cbse","Official question bank","CBSE Question Bank Class X","https://cbseacademic.nic.in/qbclass10.html","Official CBSE",""],
  ["cbse","Official question bank","CBSE Question Bank Class XII","https://cbseacademic.nic.in/qbclass12.html","Official CBSE",""],
  ["cbse","Official practice","CBSE Competency Based Assessment","https://cbseacademic.nic.in/cbe/assessment.html","Official CBSE",""],
  ["cbse","Official practice","CBSE DIKSHA Practice","https://cbseacademic.nic.in/revision10.html","Official CBSE",""],
  ["cbse","Books","NCERT Textbooks","https://www.ncert.nic.in/textbook.php","Official NCERT",""],
  ["cbse","YouTube / video","CBSE-specified official YouTube content (Class XII PCM)","https://www.youtube.com/channel/UCG7qv69PhtZlwDzB2vTWzKQ/videos","Official/CBSE-cited",""],
  ["cambridge-o-level","Books","Cambridge Endorsed Resources","https://www.cambridgeinternational.org/support-and-training-for-schools/endorsed-resources/","Official Cambridge","Endorsed resources are quality-assured but not mandatory."],
  ["cambridge-igcse","Books","Cambridge Endorsed Resources","https://www.cambridgeinternational.org/support-and-training-for-schools/endorsed-resources/","Official Cambridge","Use exact syllabus/year."],
  ["cambridge-as-a-level","Books","Cambridge Endorsed Resources","https://www.cambridgeinternational.org/support-and-training-for-schools/endorsed-resources/","Official Cambridge","Use exact syllabus/year."],
  ["aqa-gcse","Books","AQA Approved Textbooks","https://www.aqa.org.uk/about-us/who-we-are/our-standards/approved-textbooks","Official AQA","Approved does not mean required."],
  ["aqa-a-level","Books","AQA Approved Textbooks","https://www.aqa.org.uk/about-us/who-we-are/our-standards/approved-textbooks","Official AQA","Approved does not mean required."],
];

function host(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function mapResourceType(category, url, authority) {
  const u = (url || "").toLowerCase();
  if (u.includes("timetable") || u.includes("dates-and-timetables") || u.includes("datesheet")) return "exam_timetable";
  // Specimen papers are NOT past papers — detect before the past-paper rule.
  if (u.includes("specimen") || u.includes("speimen")) return "official_specimen";
  const c = (category || "").toLowerCase();
  const isOfficial = authority && authority.startsWith("Official") && authority !== "Official/CBSE-cited";
  // Only official sources carry actual past papers; third-party "past papers" hubs are supplementary notes.
  if (c.includes("past papers")) return isOfficial ? "official_past_paper" : "notes";
  if (c.includes("question bank") || c.includes("official practice")) return "quiz";
  if (c.includes("books")) return "book";
  if (c.includes("youtube")) return "youtube";
  if (c.includes("notes")) return "notes";
  if (c.includes("supplementary")) return "other";
  if (c.includes("syllabus") || c.includes("curriculum") || c.includes("hub")) return "official_syllabus";
  return "other";
}

function mapAuthorityLevel(authority, category, providerHost) {
  if (authority === "Official board" || authority === "Official CBSE") return "official";
  if (authority === "Official NCERT") return "official_textbook_authority";
  if (authority === "Official Cambridge") return category.includes("Books") ? "official_textbook_authority" : "official";
  if (authority === "Official AQA") return category.includes("Books") ? "official_textbook_authority" : "official";
  if (authority === "Official/CBSE-cited") return "board_mapped_supplementary";
  // Third-party
  if (providerHost.includes("ilmkidunya")) return "board_mapped_supplementary";
  return "general_supplementary";
}

function copyrightNote(boardId) {
  if (boardId.startsWith("aqa")) return "AQA materials may be linked but not reproduced on third-party sites. Do not ingest copyrighted exam materials.";
  if (boardId.startsWith("cambridge")) return "Cambridge materials may be linked; reproduction requires permission. Use deep links only.";
  return "";
}

// Specificity: prefer specific titles over "Official source" / bare domains.
function specificity(title) {
  if (!title || title === "Official source") return 0;
  if (/^www\./.test(title) || /^[a-z0-9-]+\.[a-z]+$/.test(title)) return 1; // bare domain
  return 2;
}

function findTimetableUrl(meta) {
  return meta.official_sources.find((u) => /timetable|dates-and-timetables/i.test(u)) || meta.official_sources[0] || "";
}

// Exam series per board. No invented exact dates — only typical window + source.
function buildExamSeries() {
  const out = [];
  const push = (meta, series, zone) => out.push({
    board_id: meta.board_id, country: meta.country, board: meta.board,
    exam_series: series, year: "2026", start_date: "", end_date: "",
    typical_window: meta.exam_window, zone, source_url: findTimetableUrl(meta),
    verification_status: "verified_window", verified_on: VERIFIED_ON, last_checked: VERIFIED_ON,
    active: true, provenance: PROVENANCE,
  });
  for (const meta of BOARDS_META) {
    if (meta.board_id.startsWith("cambridge")) {
      push(meta, "June 2026", "zone-specific (Cambridge)");
      push(meta, "November 2026", "zone-specific (Cambridge)");
    } else if (meta.board_id === "aqa-gcse") {
      push(meta, "May/June 2026", "");
      push(meta, "November 2026", "");
    } else if (meta.board_id === "aqa-a-level") {
      push(meta, "May/June 2026", "");
    } else {
      push(meta, "Annual 2026", meta.requires_subboard ? "sub-board specific" : "");
    }
  }
  return out;
}

export function buildRegistry() {
  const boards = BOARDS_META.map((b) => ({
    board_id: b.board_id, board: b.board, country: b.country,
    education_system: b.education_system, qualification: b.qualification, level: b.level,
    type: b.type, current_status: b.current_status, exam_window: b.exam_window,
    requires_subboard: b.requires_subboard, official_sources: b.official_sources,
    supplementary: b.supplementary, subject_rule: b.subject_rule,
    verification_status: "verified", verified_on: VERIFIED_ON, last_checked: VERIFIED_ON,
    active: true, provenance: PROVENANCE,
  }));

  const byKey = new Map();
  const specBy = new Map();
  let duplicatesRemoved = 0;
  for (const row of RESOURCE_ROWS) {
    const [board_id, category, title, url, authority, notes] = row;
    const key = board_id + "|" + url;
    const meta = BOARDS_META.find((b) => b.board_id === board_id) || {};
    const providerHost = host(url);
    const authority_level = mapAuthorityLevel(authority, category, providerHost);
    const resource_type = mapResourceType(category, url, authority);
    const resolvedTitle = title === "Official source"
      ? `${meta.board || ""} — ${RESOURCE_TYPE_LABEL[resource_type] || resource_type}`
      : title;
    const rec = {
      resource_id: "", board_id, country: meta.country || "", education_system: meta.education_system || "",
      qualification: meta.qualification || "", level: meta.level || "", class_or_year: "", board: meta.board || "",
      subject_code: "", subject_name: "", syllabus_year: "", resource_type, title: resolvedTitle, url,
      provider: providerHost, authority_level, verification_status: "verified", verified_on: VERIFIED_ON,
      access_type: "Public", provenance: PROVENANCE, copyright_note: copyrightNote(board_id),
      last_checked: VERIFIED_ON, active: true, notes: notes || "",
    };
    const sp = specificity(title); // raw title specificity — "Official source"=0, bare domain=1, specific=2
    if (!byKey.has(key)) {
      byKey.set(key, rec);
      specBy.set(key, sp);
    } else if (sp > specBy.get(key)) {
      byKey.set(key, rec);
      specBy.set(key, sp);
      duplicatesRemoved++;
    } else {
      duplicatesRemoved++;
    }
  }
  const resources = [...byKey.values()];
  resources.forEach((r, i) => { r.resource_id = `${r.board_id}-${String(i + 1).padStart(3, "0")}`; });

  const examSeries = buildExamSeries();
  return { boards, resources, examSeries, duplicatesRemoved };
}