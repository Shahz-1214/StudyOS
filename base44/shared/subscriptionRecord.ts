// One server-managed subscription record per learner.
//
// The learner is addressed by the server-written learner_id field. In this app a
// service-role create records the automated service identity as the record owner
// rather than the learner, so ownership alone cannot identify a learner's
// record; learner_id is the key every path reads and writes. Every lookup here
// is filtered by an id the caller is already authenticated as, so a resolution
// can never return another learner's record.
//
// A record written before learner_id existed is still owned by the learner's own
// account. It is found by that ownership and stamped with the learner id the
// first time an activation path writes to it — nothing is migrated or deleted,
// and no path ever creates a second record for a learner who already has one.

function normalizeIds(value: string | string[]): string[] {
  return (Array.isArray(value) ? value : [value])
    .map((id) => String(id || "").trim())
    .filter(Boolean);
}

/**
 * The learner's single subscription record, or null when they have none.
 *
 * Reads with the service role because the record is not necessarily owned by the
 * learner, and is scoped strictly to the ids passed in: the authenticated
 * caller's own id, or the RevenueCat app user ids that resolve to one learner.
 */
export async function findLearnerSubscription(base44: any, learnerId: string | string[]) {
  const ids = normalizeIds(learnerId);

  for (const id of ids) {
    const keyed = await base44.asServiceRole.entities.SubscriptionState.filter(
      { learner_id: id },
      "-created_date",
      1
    );
    if (keyed?.length) return keyed[0];
  }

  // Legacy records: written before learner_id existed and owned by the learner.
  for (const id of ids) {
    const owned = await base44.asServiceRole.entities.SubscriptionState.filter(
      { created_by_id: id },
      "-created_date",
      1
    );
    if (owned?.length && !owned[0].learner_id) return owned[0];
  }

  return null;
}

/**
 * Writes entitlement fields onto that one record and returns its id. An existing
 * record is updated in place (and stamped with the learner key when it is a
 * legacy record); a record keyed to the learner is created only when the learner
 * genuinely has none.
 */
export async function saveLearnerSubscription(
  base44: any,
  learnerId: string | string[],
  fields: Record<string, any>,
  defaults: Record<string, any> = {}
) {
  const ids = normalizeIds(learnerId);
  const primary = ids[0];
  if (!primary) throw new Error("LEARNER_ID_REQUIRED");

  const current = await findLearnerSubscription(base44, ids);
  if (current?.id) {
    const patch = current.learner_id ? fields : { ...fields, learner_id: primary };
    await base44.asServiceRole.entities.SubscriptionState.update(current.id, patch);
    return current.id;
  }

  const created = await base44.asServiceRole.entities.SubscriptionState.create({
    learner_id: primary,
    created_by_id: primary,
    ...defaults,
    ...fields,
  });
  return created?.id ?? null;
}