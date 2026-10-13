// ---------------------------------------------------------------------------
// Signup intent — remembers what a visitor picked on the marketing pages
// ("Get Started" → individual/business, or a pricing-card plan) across the
// sign-in redirect, so onboarding can highlight that choice. Purely a UI
// hint: nothing is ever auto-submitted from it. sessionStorage only, and
// every access is guarded because storage can be unavailable.
// ---------------------------------------------------------------------------

const ACCOUNT_KEY = "pathable-signup-intent";
const PLAN_KEY    = "pathable-plan-intent";

function read(key) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function write(key, value) {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch { /* storage unavailable */ }
}

export const getAccountIntent = ()  => read(ACCOUNT_KEY);
export const setAccountIntent = (v) => write(ACCOUNT_KEY, v);
export const getPlanIntent    = ()  => read(PLAN_KEY);
export const setPlanIntent    = (v) => write(PLAN_KEY, v);
