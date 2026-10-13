import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight, Check, User, Store, Search, ListChecks, MapPinned, Building2,
  ClipboardCheck, LayoutDashboard, Camera, MessageSquareText, CircleCheck,
} from "lucide-react";
import { FEATURE_OPTIONS, BUSINESS_ACCESSIBILITY_FEATURES } from "../../constants/accessibility";
import { MarketingHeader, MarketingFooter } from "./MarketingChrome";
import HeroDemo from "./HeroDemo";
import ScoreVisual from "./ScoreVisual";
import { FEATURE_ICONS } from "./featureIcons";
import { useReveal } from "./useReveal";
import "./landing.css";

// ---------------------------------------------------------------------------
// LandingPage
// Route: "/" for signed-out visitors (signed-in users are sent to their home
// by RootRoute in App.jsx). Presentation-focused front door; the app itself
// stays at /explore.
// ---------------------------------------------------------------------------

const STEPS = {
  individuals: [
    { icon: Search,     title: "Search for a place",                 body: "Search by name or browse the map, and filter for the features you need." },
    { icon: ListChecks, title: "Explore its accessibility information", body: "See what's been reported, photos of areas like the entrance and restroom, and community reviews." },
    { icon: MapPinned,  title: "Visit with greater confidence",       body: "Know what to expect before you go — then add what you learned for the next person." },
  ],
  businesses: [
    { icon: Building2,       title: "Find or add your business",        body: "Search Pathable for your listing and claim it, or add it if it isn't listed yet." },
    { icon: ClipboardCheck,  title: "Complete your accessibility profile", body: "Answer Yes, No, or Unsure for each feature, then add notes, hours, and photos." },
    { icon: LayoutDashboard, title: "Manage your listing",              body: "Keep details current and respond to reviews from your business dashboard." },
  ],
};

const AUDIENCES = [
  { id: "individuals", label: "For individuals" },
  { id: "businesses",  label: "For businesses" },
];

function HowItWorks() {
  const [audience, setAudience] = useState("individuals");
  const tabRefs = useRef({});

  const onKey = (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const next = audience === "individuals" ? "businesses" : "individuals";
    const to = e.key === "Home" ? "individuals" : e.key === "End" ? "businesses" : next;
    setAudience(to);
    tabRefs.current[to]?.focus();
  };

  return (
    <section id="how-it-works" className="pl-section pl-section--alt" aria-labelledby="hiw-title">
      <div className="pl-container">
        <div className="pl-section-head pl-section-head--center pl-reveal">
          <p className="pl-eyebrow">How it works</p>
          <h2 id="hiw-title" className="pl-h2">Three steps, whichever side you're on.</h2>
        </div>

        <div className="pl-segmented-wrap">
          <div className="pl-segmented" role="tablist" aria-label="Audience">
            {AUDIENCES.map((a) => (
              <button
                key={a.id}
                ref={(el) => { tabRefs.current[a.id] = el; }}
                type="button"
                role="tab"
                id={`hiw-tab-${a.id}`}
                aria-selected={audience === a.id}
                aria-controls="hiw-panel"
                tabIndex={audience === a.id ? 0 : -1}
                onClick={() => setAudience(a.id)}
                onKeyDown={onKey}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div id="hiw-panel" role="tabpanel" aria-labelledby={`hiw-tab-${audience}`}>
          <ol key={audience} className="pl-steps pl-panel-enter">
            {STEPS[audience].map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="pl-step">
                <div className="pl-step__num">0{i + 1}</div>
                <Icon className="pl-step__icon" size={28} strokeWidth={1.75} aria-hidden="true" />
                <h3 className="pl-h3">{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

// Example contribution — mirrors the "Access Info" contribution form's
// Yes / No / Unsure answers and the photo categories on a listing page.
const CONTRIB_ROWS = [
  { key: "wheelchair_accessible", answer: "yes" },
  { key: "accessible_parking",    answer: "yes" },
  { key: "accessible_restrooms",  answer: "unk" },
  { key: "handrails_available",   answer: "no"  },
];
const PHOTO_AREAS = ["Entrance", "Bathroom", "Parking Lot", "Interior", "Seating / Service"];

function ExampleContribution() {
  const labelFor = (key) => BUSINESS_ACCESSIBILITY_FEATURES.find((f) => f.key === key)?.label;
  const word = { yes: "Yes", no: "No", unk: "Unsure" };
  return (
    <figure className="pl-contrib pl-reveal" aria-label="Example of an accessibility contribution">
      <div className="pl-contrib__head">
        <span className="pl-contrib__title">Add accessibility info</span>
        <span className="pl-tag">Example</span>
      </div>
      <div className="pl-contrib__body">
        <ul className="pl-rows" style={{ borderTop: 0 }}>
          {CONTRIB_ROWS.map(({ key, answer }) => {
            const Icon = FEATURE_ICONS[key];
            return (
              <li className="pl-row" key={key}>
                <Icon size={18} aria-hidden="true" />
                <span className="pl-row__label">{labelFor(key)}</span>
                <span className="pl-sr-only">: {word[answer]}</span>
                <span className="pl-tri" aria-hidden="true">
                  <span className={answer === "yes" ? "is-yes" : ""}>Yes</span>
                  <span className={answer === "no" ? "is-no" : ""}>No</span>
                  <span className={answer === "unk" ? "is-unk" : ""}>Unsure</span>
                </span>
              </li>
            );
          })}
        </ul>
        <div className="pl-contrib__photos" aria-label="Photo areas">
          {PHOTO_AREAS.map((p) => (
            <span key={p} className={`pl-chip${p === "Entrance" ? " is-on" : ""}`}>
              {p === "Entrance" && <Camera size={13} aria-hidden="true" />}{p}
            </span>
          ))}
        </div>
        <div className="pl-contrib__submit">
          <span className="pl-small">Requires a free account</span>
          <span className="pl-status pl-status--yes"><CircleCheck size={15} aria-hidden="true" />Ready to submit</span>
        </div>
      </div>
    </figure>
  );
}

export default function LandingPage() {
  const { hash } = useLocation();
  useReveal();

  // Arriving from another page via "/#how-it-works" or "/#about".
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) requestAnimationFrame(() => el.scrollIntoView());
  }, [hash]);

  useEffect(() => {
    const prev = document.title;
    document.title = "Pathable — Find accessible places with confidence";
    return () => { document.title = prev; };
  }, []);

  return (
    <div className="pl-root">
      <MarketingHeader />

      <main id="main" tabIndex={-1}>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="pl-hero" aria-labelledby="hero-title">
          <div className="pl-container pl-hero__grid">
            <div>
              <h1 id="hero-title" className="pl-display">Find accessible places with confidence.</h1>
              <p className="pl-lead">
                Discover places that meet your accessibility needs. Explore accessibility information,
                read community reviews, and share your experiences.
              </p>
              <div className="pl-actions">
                <Link to="/explore" className="pl-btn pl-btn--primary">Explore Places</Link>
                <Link to="/for-businesses" className="pl-btn pl-btn--ghost">List Your Business</Link>
              </div>
              <ul className="pl-hero__meta">
                <li><Check size={16} aria-hidden="true" />Browse without an account</li>
                <li><Check size={16} aria-hidden="true" />Free for individuals</li>
              </ul>
            </div>
            <HeroDemo />
          </div>
        </section>

        {/* ── Two ways to use Pathable ─────────────────────────────────── */}
        <section className="pl-section pl-section--tight" aria-labelledby="two-ways-title">
          <div className="pl-container">
            <div className="pl-section-head pl-reveal">
              <h2 id="two-ways-title" className="pl-eyebrow">Two ways to use Pathable</h2>
            </div>
            <div className="pl-split">
              <div className="pl-split__col pl-reveal">
                <span className="pl-split__icon"><User size={22} aria-hidden="true" /></span>
                <p className="pl-eyebrow">For individuals</p>
                <h3 className="pl-h2">Find places that work for you.</h3>
                <ul className="pl-checks">
                  <li><Check size={18} aria-hidden="true" />Discover accessible businesses.</li>
                  <li><Check size={18} aria-hidden="true" />Search based on accessibility needs.</li>
                  <li><Check size={18} aria-hidden="true" />View accessibility information.</li>
                  <li><Check size={18} aria-hidden="true" />Read community reviews.</li>
                  <li><Check size={18} aria-hidden="true" />Save favorite places.</li>
                </ul>
                <div className="pl-split__cta">
                  <Link to="/explore" className="pl-btn pl-btn--primary">Explore Places</Link>
                </div>
              </div>
              <div className="pl-split__col pl-reveal">
                <span className="pl-split__icon"><Store size={22} aria-hidden="true" /></span>
                <p className="pl-eyebrow">For businesses</p>
                <h3 className="pl-h2">Make accessibility part of your business.</h3>
                <ul className="pl-checks">
                  <li><Check size={18} aria-hidden="true" />Showcase accessibility features.</li>
                  <li><Check size={18} aria-hidden="true" />Manage business information.</li>
                  <li><Check size={18} aria-hidden="true" />Share photos and accessibility details.</li>
                  <li><Check size={18} aria-hidden="true" />Connect with customers looking for accessible places.</li>
                </ul>
                <div className="pl-split__cta">
                  <Link to="/for-businesses" className="pl-btn pl-btn--dark">Learn About Business Listings</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <HowItWorks />

        {/* ── Pathable Score ───────────────────────────────────────────── */}
        <section className="pl-section" aria-labelledby="score-title">
          <div className="pl-container pl-score-grid">
            <div className="pl-reveal">
              <p className="pl-eyebrow">Pathable Score</p>
              <h2 id="score-title" className="pl-h2">Accessibility information, made easier to understand.</h2>
              <p className="pl-lead" style={{ marginTop: 18 }}>
                Every listing has a score out of 100 that summarizes what has been reported about it.
              </p>
              <ol className="pl-parts">
                <li className="pl-part">
                  <div className="pl-part__pts">50<span>points</span></div>
                  <div>
                    <h3>Accessibility features</h3>
                    <p>Wheelchair access (15), accessible parking (10), an accessible entrance width (10), accessible restrooms (8), an elevator (4), and automatic doors (3).</p>
                  </div>
                </li>
                <li className="pl-part">
                  <div className="pl-part__pts">30<span>points</span></div>
                  <div>
                    <h3>Your preference match</h3>
                    <p>How many of the features you've saved as important are present. Without saved preferences, this part is a neutral 15.</p>
                  </div>
                </li>
                <li className="pl-part">
                  <div className="pl-part__pts">20<span>points</span></div>
                  <div>
                    <h3>Data accuracy</h3>
                    <p>How complete the reported information is, plus how many reviews and contributors are behind it — shown as Low, Medium, or High.</p>
                  </div>
                </li>
              </ol>
            </div>
            <div className="pl-reveal">
              <div className="pl-score-card">
                <ScoreVisual />
                <div className="pl-score-card__foot">
                  <ul className="pl-legend" aria-label="Score colors">
                    <li><i style={{ background: "#15803d" }} />75 and above</li>
                    <li><i style={{ background: "#b45309" }} />50–74</li>
                    <li><i style={{ background: "#b91c1c" }} />Below 50</li>
                  </ul>
                  <p className="pl-small" style={{ marginTop: 12 }}>
                    Example listing, scored with Pathable's actual formula. Scores reflect reported information, not an inspection.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Accessibility features ───────────────────────────────────── */}
        <section className="pl-section pl-section--alt" aria-labelledby="features-title">
          <div className="pl-container">
            <div className="pl-section-head pl-reveal">
              <p className="pl-eyebrow">Accessibility features</p>
              <h2 id="features-title" className="pl-h2">Find what matters to you.</h2>
              <p className="pl-lead">Save the features you rely on to your profile, and see how each place reports them.</p>
            </div>
            <ul className="pl-features pl-reveal">
              {FEATURE_OPTIONS.map(({ value, label }) => {
                const Icon = FEATURE_ICONS[value];
                return (
                  <li key={value} className="pl-feature">
                    {Icon && <Icon size={22} strokeWidth={1.75} aria-hidden="true" />}
                    {label}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ── Community contributions ──────────────────────────────────── */}
        <section className="pl-section" aria-labelledby="community-title">
          <div className="pl-container pl-community">
            <div className="pl-reveal">
              <p className="pl-eyebrow">Community</p>
              <h2 id="community-title" className="pl-h2">Better information starts with the community.</h2>
              <ul className="pl-ways">
                <li>
                  <span className="pl-ways__icon"><ListChecks size={20} aria-hidden="true" /></span>
                  <div><h3>Accessibility details</h3><p>Answer Yes, No, or Unsure for the features you noticed.</p></div>
                </li>
                <li>
                  <span className="pl-ways__icon"><Camera size={20} aria-hidden="true" /></span>
                  <div><h3>Photos</h3><p>Show the entrance, restroom, parking, and more, so others can see for themselves.</p></div>
                </li>
                <li>
                  <span className="pl-ways__icon"><MessageSquareText size={20} aria-hidden="true" /></span>
                  <div><h3>Reviews</h3><p>Rate your visit and describe what worked and what didn't.</p></div>
                </li>
              </ul>
              <p className="pl-honesty">
                Contributions come from community members and aren't independently verified. A report fills in a
                feature only if it hasn't been reported yet — reports that disagree with existing information are
                recorded as conflicts rather than replacing it.
              </p>
            </div>
            <ExampleContribution />
          </div>
        </section>

        {/* ── Mission ──────────────────────────────────────────────────── */}
        <section id="about" className="pl-section pl-on-dark pl-mission" aria-labelledby="mission-title">
          <div className="pl-container pl-reveal">
            <h2 className="pl-eyebrow" id="mission-title">Our mission</h2>
            <p className="pl-mission__quote">
              Everyone deserves to know what to expect before visiting a place.
            </p>
            <p className="pl-mission__sub">
              Pathable brings accessibility information together to make finding the right places easier.
            </p>
          </div>
        </section>

        {/* ── Final call to action ─────────────────────────────────────── */}
        <section className="pl-section pl-final" aria-labelledby="final-title">
          <div className="pl-container pl-reveal">
            <h2 id="final-title" className="pl-display">Ready to explore?</h2>
            <div className="pl-actions">
              <Link to="/explore" className="pl-btn pl-btn--primary">Explore Places</Link>
              <Link to="/for-businesses" className="pl-btn pl-btn--ghost">
                List Your Business <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
