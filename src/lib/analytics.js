import { base44 } from "@/api/base44Client";

// Centralized operational event system. Persists the learning events used by
// StudyOS features; non-essential platform analytics is disabled separately.

export const EVENTS = {
  APP_OPEN: "app_open",
  ONBOARDING_COMPLETED: "onboarding_completed",
  STUDYLENS_USED: "studylens_used",
  HOMEWORK_STARTED: "homework_started",
  HOMEWORK_COMPLETED: "homework_completed",
  QUIZ_STARTED: "quiz_started",
  QUIZ_COMPLETED: "quiz_completed",
  QUESTION_CORRECT: "question_correct",
  QUESTION_INCORRECT: "question_incorrect",
  HINT_REQUESTED: "hint_requested",
  NOTE_UPLOADED: "note_uploaded",
  QUIZ_GENERATED: "quiz_generated",
  LECTURE_PROCESSED: "lecture_processed",
  ESSAY_ANALYZED: "essay_analyzed",
  EXAM_CREATED: "exam_created",
  STUDY_STARTED: "study_started",
  STUDY_COMPLETED: "study_completed",
  WEAKNESS_UPDATED: "weakness_updated",
  RECOMMENDATION_CLICKED: "recommendation_clicked",
  TASK_CREATED: "task_created",
  STUDYSYNC_RUN: "studysync_run",
  SUBSCRIPTION_VIEWED: "subscription_viewed",
  SUBSCRIPTION_STARTED: "subscription_started",
  SUBSCRIPTION_CANCELLED: "subscription_cancelled",
};

export async function track(eventName, properties = {}) {
  try {
    await base44.entities.Event.create({
      event_name: eventName,
      properties,
      occurred_at: new Date().toISOString(),
    });
  } catch {
    /* persistence is best-effort during dev */
  }
}