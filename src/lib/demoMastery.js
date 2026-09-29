// Display-only Demo Mode mastery override (client-side, never persisted).
//
// While Demo Mode is active and the demo administrator has chosen a mastery
// value, the study views render that value instead of the stored concept
// mastery. This returns DISPLAY COPIES of the concept records — the stored
// records are never touched, and every write path (quizzes, focus sessions,
// exam generation) keeps using the real concept list.
//
// The spread is deterministic and mean-exact: pairs carry +spread and -spread,
// and with an odd number of concepts the unpaired last one sits exactly on the
// target, so the overall mastery the app displays equals the chosen value
// exactly while subject and concept figures stay consistent with it.
export function applyDemoMastery(concepts, target) {
  if (!Array.isArray(concepts) || !concepts.length) return concepts || [];
  if (typeof target !== "number" || !Number.isFinite(target)) return concepts;

  const t = Math.max(0, Math.min(100, Math.round(target)));
  const spread = Math.min(6, t, 100 - t);
  if (spread === 0) return concepts.map((c) => ({ ...c, mastery: t }));

  const oddCount = concepts.length % 2 === 1;
  return concepts.map((c, index) => {
    const unpaired = oddCount && index === concepts.length - 1;
    const mastery = unpaired ? t : index % 2 === 0 ? t + spread : t - spread;
    return { ...c, mastery };
  });
}