// ---------------------------------------------------------------------------
// Shared accessibility constants
// Single source of truth for the disability/feature-preference options used
// in personal onboarding + ProfilePage, and the business accessibility
// feature list used in business onboarding + the dashboard.
// ---------------------------------------------------------------------------

export const DISABILITY_OPTIONS = [
  { value: "",               label: "Prefer not to say" },
  { value: "Mobility",       label: "Mobility"       },
  { value: "Vision",         label: "Vision"         },
  { value: "Hearing",        label: "Hearing"        },
  { value: "Neurodivergent", label: "Neurodivergent" },
  { value: "Other",          label: "Other"          },
];

// Personal "what matters to me" preferences — same keys the business
// accessibility fields use, so a user's preferences line up with what
// businesses report.
export const FEATURE_OPTIONS = [
  { value: "wheelchair_accessible",        label: "Wheelchair Accessible",        desc: "Ramps or step-free access throughout" },
  { value: "accessible_parking",           label: "Accessible Parking",           desc: "Designated parking spaces close to entrance" },
  { value: "wide_entrances",               label: "Wide Entrances",               desc: "Doors wide enough for wheelchair access" },
  { value: "accessible_restrooms",         label: "Accessible Restrooms",         desc: "Wheelchair-accessible restroom facilities" },
  { value: "elevators",                    label: "Elevators",                    desc: "Accessible elevators for multi-floor buildings" },
  { value: "automatic_doors",              label: "Automatic Doors",              desc: "Hands-free entry and exit" },
  { value: "wheelchair_accessible_tables", label: "Wheelchair-Accessible Tables", desc: "Tables with adequate clearance for wheelchairs" },
  { value: "handrails_available",          label: "Handrails",                    desc: "Handrails on stairs, ramps, or walkways" },
  { value: "hearing_assistance",           label: "Hearing Assistance",           desc: "Hearing loops, captioning, or ASL support" },
  { value: "braille_signage",              label: "Braille Support",              desc: "Braille signage or menus" },
  { value: "sensory_friendly",             label: "Sensory-Friendly Options",     desc: "Low-noise or low-light accommodations" },
  { value: "service_animal_support",       label: "Service Animal Support",       desc: "Service animals explicitly welcomed" },
];

// Business accessibility fields — each maps 1:1 to an Optional[bool] field on
// the Business model (True/False/None = Yes/No/Unsure), plus optional N/A
// and a short note. Used by the business onboarding accessibility step and
// the dashboard's "accessibility details" edit view.
export const BUSINESS_ACCESSIBILITY_FEATURES = [
  { key: "wheelchair_accessible",        label: "Step-Free / Wheelchair-Accessible Entrance", icon: "♿" },
  { key: "accessible_parking",           label: "Accessible Parking",                          icon: "🚗" },
  { key: "accessible_restrooms",         label: "Accessible Restroom",                         icon: "🚻" },
  { key: "elevator",                     label: "Elevator",                                    icon: "🛗" },
  { key: "auto_doors",                   label: "Automatic Doors",                             icon: "🔄" },
  { key: "wheelchair_accessible_tables", label: "Wheelchair-Accessible Seating / Tables",      icon: "🪑" },
  { key: "handrails_available",          label: "Handrails",                                   icon: "🪜" },
  { key: "hearing_assistance",           label: "Hearing Assistance",                          icon: "🦻" },
  { key: "braille_signage",              label: "Braille Signage",                             icon: "⌸" },
  { key: "sensory_friendly",             label: "Sensory-Friendly Accommodations",             icon: "🌙" },
  { key: "service_animal_support",       label: "Service Animal Support",                      icon: "🐕‍🦺" },
];

export const ENTRANCE_WIDTH_OPTIONS = [
  { value: "",         label: "Unsure" },
  { value: "wide",     label: "Wide — fully accessible" },
  { value: "standard", label: "Standard — 36″ minimum" },
  { value: "narrow",   label: "Narrow — may be challenging" },
];

export const BUSINESS_CATEGORIES = [
  "Restaurant / Food Service", "Retail / Shopping", "Healthcare", "Fitness / Recreation",
  "Hospitality / Lodging", "Arts / Entertainment", "Professional Services",
  "Education", "Government / Public Services", "Other",
];

export const WEEKDAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];
