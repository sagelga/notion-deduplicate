// DedupProgressRing.tsx
// SVG ring that shows dedup completion as a circular progress arc.
// While scanning (duplicatesFound still 0), it renders in indeterminate/spin mode
// via a CSS animation class rather than trying to show meaningless 0% progress.

interface DedupProgressRingProps {
  actioned: number;
  duplicatesFound: number;
  phase: string;
}

export function DedupProgressRing({ actioned, duplicatesFound, phase }: DedupProgressRingProps) {
  const r = 13;
  const circ = 2 * Math.PI * r;

  const indeterminate = phase === "running" && duplicatesFound === 0;

  const pct =
    phase === "done"
      ? 100
      : duplicatesFound > 0
      ? Math.min((actioned / duplicatesFound) * 100, 100)
      : 0;

  const trackColor =
    phase === "error" ? "rgba(235,87,87,0.2)" : "var(--color-rim)";
  const arcColor =
    phase === "error"
      ? "#eb5757"
      : phase === "done"
      ? "var(--color-accent)"
      : "var(--color-accent)";

  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      className={indeterminate ? "dedup-ring-indeterminate" : undefined}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r={r} fill="none" stroke={trackColor} strokeWidth="2.5" />
      <circle
        cx="16"
        cy="16"
        r={r}
        fill="none"
        stroke={arcColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={indeterminate ? circ * 0.72 : circ * (1 - pct / 100)}
        transform="rotate(-90 16 16)"
        style={indeterminate ? undefined : { transition: "stroke-dashoffset 0.4s ease" }}
      />
    </svg>
  );
}