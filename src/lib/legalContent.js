export const POLICY_UPDATED = "18 September 2026";

export const privacyPolicy = {
  title: "Privacy Policy",
  summary: "This policy explains the information StudyOS currently handles, why it is used, and the choices available to learners.",
  sections: [
    { heading: "Operator and status", paragraphs: [
      "StudyOS is operated by an individual operator and is currently in pre-launch testing. The operator's verified public name, establishment location, and privacy contact will be added before public launch.",
      "This policy describes the current implementation. It is not a claim that StudyOS has been certified as compliant with every law in every country."
    ]},
    { heading: "Information StudyOS handles", paragraphs: [
      "Account information includes the email address, name and account identifier handled by Base44 authentication. Passwords and verification codes are handled through Base44 authentication rather than stored in a StudyOS database field.",
      "Learner information can include country or education system, board, education level, study goal, daily study time, subjects, concepts, mastery estimates, quiz answers and scores, tasks, study sessions, saved-resource notes, essays, lecture material and generated study plans.",
      "Content submitted to AI features can include typed problems, notes, essays, images, audio and questions. AI outputs can include explanations, questions, feedback, transcripts, summaries, flashcards and plans.",
      "StudyOS stores activity records needed for learner history and feature coordination, such as quiz, exam, lecture and study events. Hosting, authentication and request infrastructure may also receive technical information such as IP address, browser or device details, request time and referring page.",
      "Free-text and uploaded content may contain personal information even when StudyOS does not ask for it. Learners should avoid including unnecessary personal or confidential information."
    ]},
    { heading: "Why information is used", paragraphs: [
      "Information is used to create and secure accounts, configure the learner's workspace, provide requested study features, calculate deterministic scores and mastery, save progress, organize tasks and resources, generate requested AI-assisted content, prevent abuse, troubleshoot the service and meet applicable obligations.",
      "StudyOS does not currently use app-owned advertising pixels or marketing trackers. Non-essential Base44 application analytics and build-injected page tracking are disabled in the current code. Operational learning events remain stored in the learner's account because app features use them."
    ]},
    { heading: "AI and service providers", paragraphs: [
      "StudyOS uses Base44 for hosting, authentication, database, functions and file services. Requested AI and transcription features send the relevant submitted content and context through Base44's server-side Core services to the processor selected by that service.",
      "Google sign-in is available when enabled and shares identity information as part of the learner's chosen sign-in flow. Google Fonts receives ordinary web-request information when the app loads its fonts. External board, resource and video links open third-party websites under their own policies.",
      "StudyOS does not claim that AI inputs are never retained or used by every underlying provider. Provider terms, processing locations, retention and transfer arrangements require review before launch."
    ]},
    { heading: "Uploads and visibility", paragraphs: [
      "The current StudyLens image and LectureMind audio upload flows use publicly accessible file URLs before processing. Anyone who obtains such a URL may be able to access the file. Do not upload confidential material, identifying images, or recordings without the rights and permission to do so.",
      "Learner database records use account ownership rules, but those rules do not make a public file URL private. Private-upload remediation and any handling of earlier public files must be completed and verified before launch."
    ]},
    { heading: "Storage and retention", paragraphs: [
      "Account and learning records remain until removed through an available feature or an approved operational process. Some tasks, subjects, concepts and saved papers can be deleted individually. StudyOS does not currently provide a verified account-wide export, deletion or automatic retention schedule.",
      "Deleting an item in the interface has not been verified to remove related backups, logs, provider copies or uploaded files. A retention and account-deletion procedure must be finalized before launch."
    ]},
    { heading: "Security", paragraphs: [
      "StudyOS uses Base44 authentication and record ownership controls, and keeps AI service calls in authenticated backend functions. No online service can promise absolute security. Cross-account isolation, uploaded-file access and production security settings still require controlled pre-launch testing."
    ]},
    { heading: "Learner choices and rights", paragraphs: [
      "Learners can update profile information and remove certain records in the app. Depending on applicable law, a learner or guardian may have rights to ask for access, correction, deletion, restriction, objection, portability or information about processing.",
      "A verified privacy-request contact and identity-verification procedure will be published before launch. Until then, StudyOS must not be treated as ready to accept public privacy requests or children's accounts."
    ]},
    { heading: "Children and international use", paragraphs: [
      "StudyOS is intended to support learners, including minors, but it does not yet implement a verified child, guardian or school authorization process. The appropriate eligibility wording, age-appropriate notices and safeguards must be settled before offering the service to children.",
      "The intended audience may be worldwide. Applicable rights and duties depend on the operator's location, the learner's location, age, account model and local law. No single governing framework is asserted here."
    ]},
    { heading: "Changes", paragraphs: [
      "This page will be updated when the implementation, operator details, service providers or legal requirements change. The update date above identifies this version."
    ]}
  ]
};

export const termsPolicy = {
  title: "Terms & Conditions",
  summary: "These terms describe the current pre-launch StudyOS service and the responsibilities that apply when it becomes available.",
  sections: [
    { heading: "Operator and status", paragraphs: [
      "StudyOS is operated by an individual operator and is currently in pre-launch testing. Verified operator identity, location and a support or dispute contact will be added before public launch. These terms do not invent a company, address, governing law or court."
    ]},
    { heading: "Accounts", paragraphs: [
      "Use accurate account information, keep sign-in credentials confidential, and notify the operator through the published support method if unauthorized access is suspected. Do not access another learner's account or attempt to bypass authentication, ownership rules, usage limits or service protections."
    ]},
    { heading: "Educational and AI limitations", paragraphs: [
      "StudyOS is a study aid, not an official examination board, school, teacher, legal adviser, medical adviser or other professional service. Mastery values are internal learning estimates, not certified grades or guaranteed outcomes.",
      "AI-generated explanations, questions, feedback, transcripts and plans can be incomplete or wrong. Check important work against teachers, course requirements and authoritative sources. Do not submit AI output as your own where academic rules prohibit it."
    ]},
    { heading: "Acceptable use", paragraphs: [
      "Do not use StudyOS to break the law, harm others, cheat, harass, distribute malware, probe security, overload services, evade limits, impersonate another person, or upload content you do not have permission to use.",
      "Do not upload confidential information, identifying student material, or another person's voice or work without appropriate authority and consent."
    ]},
    { heading: "Learner content", paragraphs: [
      "Learners retain the rights they hold in content they submit. They give the operator and required service providers permission to host, copy, transmit and process that content only as needed to provide, secure and maintain the requested StudyOS features.",
      "Learners are responsible for ensuring they have the rights and permissions needed for submitted notes, papers, images, audio and other material."
    ]},
    { heading: "StudyOS materials and third-party resources", paragraphs: [
      "StudyOS software, branding and original interface materials remain protected by applicable intellectual-property law. No trademark registration or third-party endorsement is claimed.",
      "Links to boards, publishers, videos and other resources do not transfer ownership or guarantee accuracy, availability, completeness or permission to copy the linked material. Labels such as official, specimen or third-party must be understood in the context shown with each resource."
    ]},
    { heading: "Availability and changes", paragraphs: [
      "Features may change, be interrupted or be withdrawn during pre-launch development. StudyOS does not guarantee uninterrupted availability, particular academic results, complete curriculum coverage or error-free AI output.",
      "Accounts may be restricted or suspended where reasonably necessary to protect learners, enforce these terms, investigate misuse or comply with applicable obligations. A final termination and appeal process must be published before launch."
    ]},
    { heading: "Payments", paragraphs: [
      "The current app does not contain a verified production checkout. Displayed plan names or test entitlement controls are not evidence of a completed purchase. Final prices, billing, cancellation and refund terms must be published only after a payment model and provider are configured and verified."
    ]},
    { heading: "Responsibility and disputes", paragraphs: [
      "Nothing here excludes rights or responsibilities that cannot lawfully be excluded. Any final limitation of liability, consumer terms, governing law and dispute process depends on the operator's verified location, the learner's location and the product model and requires qualified review.",
      "A verified support and dispute contact will be added before public launch."
    ]},
    { heading: "Privacy and changes", paragraphs: [
      "The Privacy Policy and Cookie & Storage Policy explain current data and storage practices. These terms will be updated when operator details, eligibility, payments and launch procedures are finalized."
    ]}
  ]
};

export const cookiePolicy = {
  title: "Cookie & Storage Policy",
  summary: "This policy describes cookies, browser storage and tracking technologies found in the current StudyOS implementation.",
  sections: [
    { heading: "Current classification", paragraphs: [
      "StudyOS uses browser storage for authentication and learner-selected preferences. The current application code does not install an advertising pixel, marketing tracker, fingerprinting tool, social-media embed or app-owned cookie banner.",
      "Non-essential Base44 SDK analytics and build-injected page analytics are disabled in the current code. Because no optional app tracking category is currently loaded, StudyOS does not display a cookie-consent banner merely as a checklist item. Production behavior must be verified after publication."
    ]},
    { heading: "Strictly necessary storage", paragraphs: [
      "Base44 authentication uses local browser storage for access tokens needed to keep a learner signed in and to authorize requests. Blocking or clearing this storage can sign the learner out or prevent authenticated features from working.",
      "Hosting and authentication providers may use additional strictly necessary technologies outside the application source. Their exact production names and durations must be checked in the published service before this inventory is treated as final."
    ]},
    { heading: "Preference storage", paragraphs: [
      "studyos.bgTheme stores the learner's selected background theme. studyos.notificationPrefs stores on-device reminder preferences; the current toggles do not themselves deliver notifications. These values remain until changed or browser storage is cleared.",
      "Preference storage supports functionality but is not required for account security. Learners can change preferences in Profile or clear site storage in their browser."
    ]},
    { heading: "Operational activity records", paragraphs: [
      "StudyOS stores account-linked Event records in its database for learner activity, progress coordination and features such as StudySync. These are database records, not browser cookies. They may contain event type, time and limited feature context.",
      "Operational events are not a substitute for a secure billing or entitlement ledger, and a retention schedule has not yet been finalized."
    ]},
    { heading: "External requests", paragraphs: [
      "Google Fonts is loaded from Google's font servers and receives ordinary request information such as IP address and browser details. External resource links are not embedded trackers in StudyOS, but visiting them is governed by the destination site's own storage and privacy practices."
    ]},
    { heading: "Managing storage", paragraphs: [
      "Learners can clear StudyOS storage using browser controls. Clearing authentication storage signs the learner out; clearing preference storage resets local choices. A future optional tracking category, if introduced, must not load before a valid choice where consent is required and must include an accessible way to withdraw that choice.",
      "A verified privacy contact and final production technology inventory will be added before public launch."
    ]}
  ]
};