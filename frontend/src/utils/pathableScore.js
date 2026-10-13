// ---------------------------------------------------------------------------
// Pathable Score — shared by BusinessDetailPage (badge + breakdown) and the
// landing page's illustrative example. Moved here unchanged from
// BusinessDetailPage.jsx; weights must keep matching backend/services/scoring.py.
// ---------------------------------------------------------------------------

export function calculatePathableScore(business, userPreferences = []) {
  const featureChecks = [
    { key: "wheelchair_accessible",        label: "Ramps / Wheelchair Access",    icon: "♿", weight: 15 },
    { key: "accessible_parking",           label: "Accessible Parking",           icon: "🚗", weight: 10 },
    { key: "entrance_width",               label: "Accessible Entrance Width",    icon: "🚪", weight: 10 },
    { key: "accessible_restrooms",         label: "Accessible Restrooms",         icon: "🚻", weight: 8  },
    { key: "elevator",                     label: "Elevator",                     icon: "🛗", weight: 4  },
    { key: "auto_doors",                   label: "Automatic Doors",              icon: "🔄", weight: 3  },
    { key: "wheelchair_accessible_tables", label: "Wheelchair-Accessible Tables", icon: "🪑", weight: 0  },
    { key: "handrails_available",          label: "Handrails Available",          icon: "🪜", weight: 0  },
  ];

  const features = featureChecks.map((f) => {
    let present = false;
    if (f.key === "entrance_width") {
      present = business.entrance_width_rating === "wide" || business.entrance_width_rating === "standard";
    } else {
      present = !!business[f.key];
    }
    return { ...f, present };
  });

  const featuresScore = features.reduce((sum, f) => sum + (f.present ? f.weight : 0), 0);

  const prefToFeature = {
    wheelchair_accessible:        "wheelchair_accessible",
    accessible_parking:           "accessible_parking",
    wide_entrances:               "entrance_width",
    accessible_restrooms:         "accessible_restrooms",
    elevators:                    "elevator",
    automatic_doors:              "auto_doors",
    wheelchair_accessible_tables: "wheelchair_accessible_tables",
    handrails_available:          "handrails_available",
  };

  let matchedCount = 0;
  const totalPrefs = userPreferences.length;

  userPreferences.forEach((pref) => {
    const featureKey = prefToFeature[pref];
    if (featureKey) {
      const feature = features.find((f) => f.key === featureKey);
      if (feature?.present) matchedCount++;
    }
  });

  const preferenceScore = totalPrefs > 0
    ? Math.round((matchedCount / totalPrefs) * 30)
    : 15;

  const matchPercent = totalPrefs > 0
    ? Math.round((matchedCount / totalPrefs) * 100)
    : null;

  // Only the 6 weighted features count toward the denominator — matches backend
  // FEATURE_WEIGHTS (len = 6). The two zero-weight extras are shown in the
  // breakdown UI but must not inflate the confidence divisor.
  const WEIGHTED_FEATURE_COUNT = 6;
  const filledFields = features.filter((f) => {
    if (f.weight === 0) return false;   // exclude zero-weight extras from count
    if (f.key === "entrance_width") return business.entrance_width_rating != null;
    return business[f.key] !== undefined && business[f.key] !== null;
  }).length;

  function volumeScore(count) {
    const n = count ?? 0;
    if (n === 0)  return 0;
    if (n <= 3)   return 1;
    if (n <= 10)  return 2;
    if (n <= 25)  return 3;
    if (n <= 50)  return 4;
    return 5;
  }

  const featureConfidence      = Math.round((filledFields / WEIGHTED_FEATURE_COUNT) * 10);
  const reviewConfidence       = volumeScore(business.review_count);
  const contributionConfidence = volumeScore(business.contributors_count);
  const confidenceRaw          = featureConfidence + reviewConfidence + contributionConfidence;

  const confidenceLabel =
    confidenceRaw >= 15 ? "High"   :
    confidenceRaw >= 8  ? "Medium" : "Low";

  const confidenceColor =
    confidenceRaw >= 15 ? "#16a34a" :
    confidenceRaw >= 8  ? "#d97706" : "#dc2626";

  const total = featuresScore + preferenceScore + confidenceRaw;

  const scoreColor  = total >= 75 ? "#16a34a" : total >= 50 ? "#d97706" : "#dc2626";
  const scoreBg     = total >= 75 ? "#f0fdf4" : total >= 50 ? "#fffbeb" : "#fef2f2";
  const scoreBorder = total >= 75 ? "#bbf7d0" : total >= 50 ? "#fde68a" : "#fecaca";

  return {
    total, featuresScore, preferenceScore, confidenceRaw, confidenceLabel,
    confidenceColor, confidencePct: Math.round((filledFields / features.length) * 100),
    features, matchedCount, totalPrefs, matchPercent,
    scoreColor, scoreBg, scoreBorder,
  };
}
