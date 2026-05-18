// ─── Pathable Trust & Confidence Types ──────────────────────────────────────
// These types describe the data shape expected from the backend once per-attribute
// confidence tracking is implemented. The frontend uses mock/derived fallbacks
// until real backend data is available.

export type ConfidenceLevel = "low" | "medium" | "high" | "unknown";

/**
 * Trust metadata for a single accessibility attribute (e.g. accessible_parking).
 * All fields can be null/empty when the backend hasn't collected enough data yet.
 */
export interface AttributeConfidence {
  /** Aggregate confidence level for this attribute */
  level: ConfidenceLevel;
  /** Number of contributors who confirmed this attribute */
  confirmations: number;
  /** Number of conflicting reports (e.g. one user says yes, another says no) */
  conflicts: number;
  /** Whether a photo or video in a relevant category has been submitted */
  hasPhotoEvidence: boolean;
  /** Days since this attribute was last updated, null if not tracked */
  lastUpdatedDays: number | null;
}

/**
 * Top-level trust/confidence summary for a business listing.
 * Shown in the "Data Accuracy" section on BusinessDetailPage.
 */
export interface BusinessConfidenceData {
  /** ISO-8601 date string of the most recent data update, or null if unknown */
  lastUpdatedDate: string | null;
  /** Unique contributors (reviewers + photo submitters + feature reporters) */
  totalContributors: number;
  /** Number of photos submitted for this business */
  photoCount: number;
  /** Number of videos submitted for this business */
  videoCount: number;
  /**
   * True when the Pathable team has manually verified this business's data.
   * Maps to `business.pathable_verified` in Firestore once that field is added.
   */
  isVerified: boolean;
  /** Aggregate confidence level across all data points */
  overallLevel: ConfidenceLevel;
  /**
   * Per-attribute confidence keyed by the accessibility field name
   * (e.g. "accessible_parking", "wheelchair_accessible").
   * Backend should populate this; frontend derives mock values in the meantime.
   */
  attributes: Record<string, AttributeConfidence>;
}
