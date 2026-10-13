import { useEffect, useRef, useState } from "react";
import { Search, MapPin, Pause, Play, CircleCheck, CircleX, CircleHelp } from "lucide-react";
import { BUSINESS_ACCESSIBILITY_FEATURES, ENTRANCE_WIDTH_OPTIONS } from "../../constants/accessibility";
import { FEATURE_ICONS } from "./featureIcons";
import { EXAMPLE_LISTING } from "./exampleListing";
import ScoreVisual from "./ScoreVisual";
import { usePrefersReducedMotion } from "./useReveal";

// ---------------------------------------------------------------------------
// HeroDemo — a simplified, clearly-labeled preview of the three things the
// app does: search the map, read a listing's accessibility details, and see
// its Pathable Score. Auto-advances (WAI-ARIA tabs + rotation pattern):
//   - pause/play button; also holds while hovered or while a tab has focus
//   - never auto-plays when the user prefers reduced motion
//   - announcements only while paused, so rotation isn't read out on a loop
// ---------------------------------------------------------------------------

const SCENE_MS = 6000;
const SCENES = [
  { id: "search",  tab: "Search the map" },
  { id: "details", tab: "Check the details" },
  { id: "score",   tab: "Read the score" },
];

// Real filter labels from the map's filter bar (HomePage.jsx).
const MAP_FILTERS = [
  { label: "Wheelchair", on: true },
  { label: "Parking",    on: false },
  { label: "Restroom",   on: true },
  { label: "Wide entrance", on: false },
];

const labelFor = (key) => BUSINESS_ACCESSIBILITY_FEATURES.find((f) => f.key === key)?.label;
const entranceLabel = ENTRANCE_WIDTH_OPTIONS.find((o) => o.value === EXAMPLE_LISTING.entrance_width_rating)?.label;

const DETAIL_ROWS = [
  { key: "wheelchair_accessible", value: EXAMPLE_LISTING.wheelchair_accessible },
  { key: "accessible_parking",    value: EXAMPLE_LISTING.accessible_parking },
  { key: "entrance_width",        value: true, label: `Entrance width: ${entranceLabel}` },
  { key: "accessible_restrooms",  value: EXAMPLE_LISTING.accessible_restrooms },
  { key: "auto_doors",            value: EXAMPLE_LISTING.auto_doors },
  { key: "elevator",              value: EXAMPLE_LISTING.elevator },
];

function Status({ value }) {
  if (value === true)  return <span className="pl-status pl-status--yes"><CircleCheck size={15} aria-hidden="true" />Yes</span>;
  if (value === false) return <span className="pl-status pl-status--no"><CircleX size={15} aria-hidden="true" />No</span>;
  return <span className="pl-status pl-status--unk"><CircleHelp size={15} aria-hidden="true" />Not reported</span>;
}

const QUERY = "Coffee";

function MapScene({ active, animate }) {
  const [typed, setTyped] = useState(animate ? "" : QUERY);
  useEffect(() => {
    if (!active || !animate) { setTyped(QUERY); return undefined; }
    setTyped("");
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setTyped(QUERY.slice(0, i));
      if (i >= QUERY.length) clearInterval(t);
    }, 110);
    return () => clearInterval(t);
  }, [active, animate]);

  const Wheel = FEATURE_ICONS.wheelchair_accessible;
  const Rest  = FEATURE_ICONS.accessible_restrooms;
  const Park  = FEATURE_ICONS.accessible_parking;

  return (
    <div className="pl-map">
      <svg className="pl-map__streets" viewBox="0 0 520 380" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M0 300 C 90 280, 140 330, 240 318 S 420 260, 520 290 L520 380 L0 380 Z" fill="#d6e7f5" />
        <g stroke="#ffffff" strokeWidth="14" fill="none" strokeLinecap="round">
          <path d="M-10 120 H 530" />
          <path d="M150 -10 V 300" />
          <path d="M360 -10 C 350 120, 380 200, 330 300" />
        </g>
        <g stroke="#ffffff" strokeWidth="6" fill="none" strokeLinecap="round">
          <path d="M-10 200 H 300" />
          <path d="M60 -10 V 300" />
          <path d="M250 60 V 290" />
          <path d="M430 40 V 260" />
          <path d="M150 60 H 520" />
        </g>
        <g fill="#e3e9ef">
          <rect x="72" y="134" width="64" height="52" rx="4" />
          <rect x="164" y="134" width="72" height="52" rx="4" />
          <rect x="264" y="134" width="80" height="52" rx="4" />
          <rect x="72" y="214" width="64" height="62" rx="4" />
          <rect x="164" y="214" width="72" height="62" rx="4" />
        </g>
      </svg>

      <div className="pl-map__search">
        <Search size={17} aria-hidden="true" />
        <span>{typed}</span>
        {animate && active && typed.length < QUERY.length && <span className="pl-map__caret" aria-hidden="true" />}
      </div>
      <div className="pl-map__chips" aria-label="Filters">
        {MAP_FILTERS.map((f) => (
          <span key={f.label} className={`pl-chip${f.on ? " is-on" : ""}`}>{f.label}{f.on && <span className="pl-sr-only"> (on)</span>}</span>
        ))}
      </div>

      <MapPin className="pl-pin pl-pin--active" style={{ left: "47%", top: "56%" }} aria-hidden="true" fill="#ffffff" />
      <MapPin className="pl-pin" style={{ left: "26%", top: "47%" }} aria-hidden="true" fill="#ffffff" />
      <MapPin className="pl-pin" style={{ left: "74%", top: "38%" }} aria-hidden="true" fill="#ffffff" />
      <MapPin className="pl-pin pl-pin--muted" style={{ left: "84%", top: "64%" }} aria-hidden="true" fill="#ffffff" />

      <div className="pl-map__card">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pl-map__card-title">{EXAMPLE_LISTING.name}</div>
          <div className="pl-map__card-sub">Example listing · Café</div>
          <div className="pl-map__card-icons" aria-label="Reported: wheelchair access, accessible parking, accessible restroom">
            <Wheel size={16} aria-hidden="true" /><Park size={16} aria-hidden="true" /><Rest size={16} aria-hidden="true" />
          </div>
        </div>
        <span className="pl-tag">Community Submitted</span>
      </div>
    </div>
  );
}

function DetailsScene() {
  return (
    <div className="pl-details">
      <div className="pl-details__head">
        <div>
          <div className="pl-details__name">{EXAMPLE_LISTING.name}</div>
          <div className="pl-details__addr">Example listing</div>
        </div>
        <span className="pl-tag">Community Submitted</span>
      </div>
      <ul className="pl-rows">
        {DETAIL_ROWS.map(({ key, value, label }) => {
          const Icon = FEATURE_ICONS[key];
          return (
            <li className="pl-row" key={key}>
              <Icon size={18} aria-hidden="true" />
              <span className="pl-row__label">{label || labelFor(key)}</span>
              <Status value={value} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function HeroDemo() {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(!reduced);
  const [held, setHeld] = useState(false);        // pointer over the preview
  const [tabFocus, setTabFocus] = useState(false); // keyboard focus on the tabs
  const [visible, setVisible] = useState(true);   // tab visibility
  const [cycle, setCycle] = useState(0);          // restarts the progress bar
  const tabsRef = useRef([]);

  const running = playing && !held && !tabFocus && visible;

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % SCENES.length), SCENE_MS);
    return () => clearTimeout(t);
  }, [running, index, cycle]);

  useEffect(() => { setCycle((c) => c + 1); }, [running]);

  const select = (i, focus = false) => {
    setIndex(i);
    setCycle((c) => c + 1);
    if (focus) tabsRef.current[i]?.focus();
  };

  const onTabKey = (e, i) => {
    const last = SCENES.length - 1;
    const to = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    select(to, true);
  };

  return (
    <div
      className="pl-demo"
      role="region"
      aria-roledescription="carousel"
      aria-label="Pathable preview"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      style={{ "--pl-demo-ms": `${SCENE_MS}ms` }}
    >
      <div className="pl-demo__frame">
        <div className="pl-demo__chrome" aria-hidden="true">
          <div className="pl-demo__dots"><span /><span /><span /></div>
          <span className="pl-demo__label">Illustrative preview</span>
        </div>
        <div className="pl-demo__stage" aria-live={playing ? "off" : "polite"}>
          {SCENES.map((s, i) => (
            <div
              key={s.id}
              id={`pl-demo-panel-${s.id}`}
              role="tabpanel"
              aria-labelledby={`pl-demo-tab-${s.id}`}
              aria-roledescription="slide"
              className={`pl-demo__scene${i === index ? " is-active" : ""}`}
              aria-hidden={i !== index}
            >
              {s.id === "search"  && <MapScene active={i === index} animate={!reduced} />}
              {s.id === "details" && <DetailsScene />}
              {s.id === "score"   && <ScoreVisual active={i === index} compact />}
            </div>
          ))}
        </div>
      </div>

      <div className="pl-demo__controls">
        <div
          className="pl-demo__tabs"
          role="tablist"
          aria-label="Preview steps"
          onFocus={() => setTabFocus(true)}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setTabFocus(false); }}
        >
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              ref={(el) => { tabsRef.current[i] = el; }}
              type="button"
              role="tab"
              id={`pl-demo-tab-${s.id}`}
              aria-controls={`pl-demo-panel-${s.id}`}
              aria-selected={i === index}
              tabIndex={i === index ? 0 : -1}
              className={`pl-demo__tab${i < index ? " is-done" : ""}`}
              onClick={() => select(i)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              <span className="pl-demo__track" aria-hidden="true">
                <span key={`${index}-${cycle}`} className={`pl-demo__fill${i === index && running ? " is-running" : ""}`} />
              </span>
              {s.tab}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="pl-demo__pause"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause preview" : "Play preview"}
        >
          {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </button>
      </div>
      <p className="pl-demo__note">Simplified preview with an example listing — not a real business.</p>
    </div>
  );
}
