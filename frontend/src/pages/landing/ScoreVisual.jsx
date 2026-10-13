import { useEffect, useRef, useState } from "react";
import { EXAMPLE_SCORE, scoreLevel } from "./exampleListing";

// Same three parts and maxima as PathableRatingBadge in BusinessDetailPage.
function Meter({ name, value, max, color, detail }) {
  return (
    <div>
      <div className="pl-meter__head">
        <span className="pl-meter__name">{name}</span>
        <span className="pl-meter__pts">{detail ? `${detail} · ` : ""}{value}/{max}</span>
      </div>
      <div className="pl-meter__bar" aria-hidden="true">
        <div className="pl-meter__fill" style={{ "--v": value / max, backgroundColor: color }} />
      </div>
    </div>
  );
}

// active: controlled by a parent (hero demo). Otherwise animates the bars
// once when scrolled into view.
export default function ScoreVisual({ active, compact = false }) {
  const s = EXAMPLE_SCORE;
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (active !== undefined) return undefined;
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [active]);

  const shown = active !== undefined ? active : seen;
  const level = scoreLevel(s);

  return (
    <div className="pl-score" ref={ref} data-animate={shown ? "done" : "pending"}>
      <div className="pl-score__top">
        <div>
          <div className="pl-score__label">Pathable Score</div>
          {!compact && <div className="pl-small" style={{ marginTop: 4 }}>Sample Café · example listing</div>}
        </div>
        <div className="pl-score__num" aria-label={`Example Pathable Score: ${s.total} out of 100`}>
          <span className={`pl-score__value pl-score__value--${level}`} aria-hidden="true">{s.total}</span>
          <span className="pl-score__max" aria-hidden="true">/100</span>
        </div>
      </div>
      <Meter name="Accessibility features" value={s.featuresScore}   max={50} color="#2563eb" />
      <Meter name="Your preference match"  value={s.preferenceScore} max={30} color="#7c3aed" />
      <Meter name="Data accuracy"          value={s.confidenceRaw}   max={20} color="#324f75" detail={s.confidenceLabel} />
    </div>
  );
}
