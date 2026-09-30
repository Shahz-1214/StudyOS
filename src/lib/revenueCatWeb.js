// Client-side RevenueCat surface.
//
// The RevenueCat web SDK is imported only when a purchase is actually started,
// so it never lands in the main bundle and the subscription page works without
// it. The publishable web key arrives as configuration from the server's
// entitlement read — this file hardcodes no key, and it never sees a secret.

let sharedInstance = null;
let sharedAppUserId = "";

async function getPurchases(publicApiKey, appUserId) {
  // The guard matters for billing correctness: a purchase must always be made
  // against the account the server will verify, so a sign-in change inside one
  // page load fails loudly instead of charging the wrong customer.
  if (sharedInstance && sharedAppUserId !== appUserId) {
    throw new Error("Your sign-in changed. Reload the page to purchase with the correct account.");
  }
  if (sharedInstance) return sharedInstance;

  const { Purchases } = await import("@revenuecat/purchases-js");
  sharedInstance = Purchases.isConfigured()
    ? Purchases.getSharedInstance()
    : Purchases.configure({ apiKey: publicApiKey, appUserId });
  sharedAppUserId = appUserId;
  return sharedInstance;
}

/** The current offering, or null when the project has none configured. */
export async function loadCurrentOffering(publicApiKey, appUserId) {
  const purchases = await getPurchases(publicApiKey, appUserId);
  const offerings = await purchases.getOfferings();
  return offerings?.current ?? null;
}

/**
 * Starts the RevenueCat purchase flow for one package. Returns nothing: the
 * client grants no entitlement, it only reports that the flow finished so the
 * caller can ask the server to verify the purchase with RevenueCat.
 */
export async function purchasePackage(publicApiKey, appUserId, rcPackage) {
  const purchases = await getPurchases(publicApiKey, appUserId);
  await purchases.purchase({ rcPackage });
  return true;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function packageIdentifiers(rcPackage) {
  const product = rcPackage?.product ?? rcPackage?.rcBillingProduct ?? null;
  // Package identifier, product identifier and product title are all considered:
  // RevenueCat's dashboard lets the same product be identified in more than one
  // of these places, and any of them may carry the entitlement id.
  return [rcPackage?.identifier, product?.identifier, product?.title]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
}

// Deterministic package -> plan matching. The web SDK does not expose a
// product's entitlements to the browser, so a package is matched when its
// package or product identifier contains the entitlement id as a separate word
// (see REVENUECAT_SETUP.md). No match means no purchase button — the tier that
// is actually granted always comes from the server's verification, never here.
function packageMatchesEntitlement(rcPackage, entitlementId) {
  const token = String(entitlementId || "").toLowerCase();
  if (!token) return false;
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(token)}([^a-z0-9]|$)`);
  return packageIdentifiers(rcPackage).some((value) => pattern.test(value));
}

function periodRank(rcPackage) {
  const product = rcPackage?.product ?? rcPackage?.rcBillingProduct ?? null;
  const duration = String(product?.normalPeriodDuration || "");
  if (duration === "P1M") return 0;
  if (duration === "P1Y") return 1;
  return 2;
}

/** The package to purchase for each StudyOS plan id. Missing plan = unavailable. */
export function packagesByPlan(offering, entitlementMap) {
  const available = offering?.availablePackages || [];
  const result = {};
  for (const [entitlementId, planId] of Object.entries(entitlementMap || {})) {
    const matches = available.filter((rcPackage) => packageMatchesEntitlement(rcPackage, entitlementId));
    if (!matches.length) continue;
    const ordered = matches.slice().sort((a, b) => periodRank(a) - periodRank(b));
    result[planId] = ordered[0];
  }
  return result;
}

function formatPeriod(duration) {
  const match = /^P(\d+)([MYWD])$/.exec(String(duration || ""));
  if (!match) return "";
  const count = Number(match[1]);
  const unit = { M: "mo", Y: "yr", W: "wk", D: "day" }[match[2]];
  return count > 1 ? `/${count}${unit}` : `/${unit}`;
}

/** The package's own price and period — the only truthful price for that plan. */
export function packagePrice(rcPackage) {
  const product = rcPackage?.product ?? rcPackage?.rcBillingProduct ?? null;
  const price = product?.price?.formattedPrice || product?.currentPrice?.formattedPrice || "";
  return { price, period: formatPeriod(product?.normalPeriodDuration) };
}