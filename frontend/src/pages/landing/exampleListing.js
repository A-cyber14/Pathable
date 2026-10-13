import { calculatePathableScore } from "../../utils/pathableScore";

// ---------------------------------------------------------------------------
// One illustrative listing used by every product preview on the marketing
// pages, so the map card, the accessibility details and the score all tell
// the same story. It is NOT a real business, and every place it appears is
// labeled as an example. Its score comes from the app's real
// calculatePathableScore() — nothing here hard-codes a number.
// ---------------------------------------------------------------------------

export const EXAMPLE_LISTING = {
  name:                  "Sample Café",
  wheelchair_accessible: true,
  accessible_parking:    true,
  entrance_width_rating: "standard",
  accessible_restrooms:  true,
  elevator:              null,   // not reported yet
  auto_doors:            false,
  review_count:          6,
  contributors_count:    4,
};

export const EXAMPLE_SCORE = calculatePathableScore(EXAMPLE_LISTING);

// Map the score's own color output to a contrast-safe class, so the color
// bands stay exactly the app's thresholds without restating them here.
const LEVEL_BY_COLOR = { "#16a34a": "high", "#d97706": "mid", "#dc2626": "low" };
export const scoreLevel = (s) => LEVEL_BY_COLOR[s.scoreColor] || "mid";
