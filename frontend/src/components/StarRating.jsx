// StarRating — two modes:
//   display:      renders filled/partial/empty stars for a float value (e.g. 4.3)
//   interactive:  renders clickable stars for a form (integer value)

export default function StarRating({
  value = 0,
  max = 5,
  size = 18,
  interactive = false,
  onChange,
  hoverValue,
  onHover,
  onLeave,
}) {
  const active = hoverValue ?? value;

  return (
    <div
      style={{ display: "inline-flex", gap: "2px", lineHeight: 1 }}
      onMouseLeave={interactive ? onLeave : undefined}
    >
      {Array.from({ length: max }, (_, i) => {
        const starNum   = i + 1;
        const fillRatio = Math.min(1, Math.max(0, active - i));

        return (
          <span
            key={i}
            onClick={interactive ? () => onChange?.(starNum) : undefined}
            onMouseEnter={interactive ? () => onHover?.(starNum) : undefined}
            style={{
              position:   "relative",
              display:    "inline-block",
              width:      `${size}px`,
              height:     `${size}px`,
              cursor:     interactive ? "pointer" : "default",
              fontSize:   `${size}px`,
              lineHeight: 1,
            }}
          >
            {/* Empty star */}
            <span style={{ color: "#d1d5db" }}>★</span>

            {/* Filled overlay — clipped to fillRatio width */}
            <span
              style={{
                position:  "absolute",
                left:      0,
                top:       0,
                width:     `${fillRatio * 100}%`,
                overflow:  "hidden",
                color:     "#f59e0b",
                whiteSpace: "nowrap",
              }}
            >★</span>
          </span>
        );
      })}
    </div>
  );
}
