"use client";

interface PageIllustrationProps {
  dark?: boolean;
}

export function PageIllustration({ dark = false }: PageIllustrationProps) {
  const ink = dark ? "rgba(255,255,255,0.85)" : "rgb(55,53,47)";
  const dim = dark ? "rgba(255,255,255,0.35)" : "rgba(55,53,47,0.4)";
  const paper = dark ? "#2a2826" : "#fffdf7";
  const accent = "#E5613A";

  function R(x1: number, y1: number, x2: number, y2: number, s = 1) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, j = Math.min(len * 0.018, 1.8);
    const si = (i: number) => Math.sin(s * 9.7 + i * 3.1) * j;
    return `M${x1} ${y1} C${x1 + dx / 3 + nx * si(1)} ${y1 + dy / 3 + ny * si(1)},${x1 + dx * 2 / 3 + nx * si(2)} ${y1 + dy * 2 / 3 + ny * si(2)},${x2} ${y2}`;
  }

  const cards: { x: number; y: number; r: number; w: number; h: number; kind: "happy" | "scribble" | "dup" }[] = [
    { x: 12,  y: 30,  r: -7, w: 100, h: 120, kind: "happy"    },
    { x: 100, y: 8,   r: 5,  w: 94,  h: 112, kind: "scribble" },
    { x: 175, y: 42,  r: -4, w: 98,  h: 115, kind: "happy"    },
    { x: 50,  y: 155, r: 8,  w: 90,  h: 108, kind: "scribble" },
    { x: 210, y: 22,  r: 11, w: 92,  h: 110, kind: "dup"      },
  ];

  return (
    <svg viewBox="0 0 320 280" width="320" height="280" style={{ display: "block", flexShrink: 0 }}>
      {cards.map((c, i) => (
        <g key={i} transform={`translate(${c.x},${c.y}) rotate(${c.r} ${c.w / 2} ${c.h / 2})`}>
          <rect x={0} y={0} width={c.w} height={c.h} fill={paper} rx={2} />
          <path d={R(0, 0, c.w, 0, 30 + i)} stroke={ink} strokeWidth={1.2} fill="none" strokeLinecap="round" />
          <path d={R(c.w, 0, c.w, c.h, 31 + i)} stroke={ink} strokeWidth={1.2} fill="none" strokeLinecap="round" />
          <path d={R(c.w, c.h, 0, c.h, 32 + i)} stroke={ink} strokeWidth={1.2} fill="none" strokeLinecap="round" />
          <path d={R(0, c.h, 0, 0, 33 + i)} stroke={ink} strokeWidth={1.2} fill="none" strokeLinecap="round" />
          <path d={R(c.w - 12, 0, c.w, 12, 40 + i)} stroke={ink} strokeWidth={1} fill="none" strokeLinecap="round" />
          <path d={R(10, 22, c.w - 22, 22, 50 + i)} stroke={ink} strokeWidth={2} fill="none" strokeLinecap="round" />
          <path d={R(10, 34, c.w - 16, 34, 51 + i)} stroke={dim} strokeWidth={0.8} fill="none" strokeLinecap="round" />
          <path d={R(10, 44, c.w - 24, 44, 52 + i)} stroke={dim} strokeWidth={0.8} fill="none" strokeLinecap="round" />
          {c.kind === "happy" && (
            <g transform={`translate(${c.w / 2},${c.h - 30})`}>
              <circle cx={0} cy={0} r={13} fill="none" stroke={ink} strokeWidth={1.1} />
              <circle cx={-4} cy={-3} r={1.2} fill={ink} />
              <circle cx={4} cy={-3} r={1.2} fill={ink} />
              <path d="M -5 3 Q 0 8 5 3" stroke={ink} strokeWidth={1.3} fill="none" strokeLinecap="round" />
            </g>
          )}
          {c.kind === "scribble" && (
            <g>
              <path
                d={`M 6 ${c.h - 44} Q ${c.w / 4} ${c.h - 62}, ${c.w / 2} ${c.h - 36} T ${c.w - 6} ${c.h - 44} Q ${c.w / 2} ${c.h - 18}, 8 ${c.h - 26} Q ${c.w / 3} ${c.h - 8}, ${c.w - 8} ${c.h - 18}`}
                stroke={accent} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"
              />
              <text x={c.w / 2} y={c.h - 6} textAnchor="middle" fontSize={9} fill={accent} fontWeight="700" fontFamily="ui-monospace,monospace">dupe!</text>
            </g>
          )}
          {c.kind === "dup" && (
            <g>
              <path d={R(-5, 16, -5, c.h - 8, 60 + i)} stroke={dim} strokeWidth={1.1} fill="none" />
              <path d={R(-5, 16, 8, 16, 61 + i)} stroke={dim} strokeWidth={1.1} fill="none" />
              <circle cx={c.w / 2} cy={c.h - 30} r={12} fill="none" stroke={ink} strokeWidth={1.1} />
              <circle cx={c.w / 2 - 4} cy={c.h - 33} r={1.1} fill={ink} />
              <circle cx={c.w / 2 + 4} cy={c.h - 33} r={1.1} fill={ink} />
              <path d={`M ${c.w / 2 - 4} ${c.h - 25} Q ${c.w / 2} ${c.h - 21} ${c.w / 2 + 4} ${c.h - 25}`} stroke={ink} strokeWidth={1.2} fill="none" strokeLinecap="round" />
              <text x={c.w + 4} y={8} fontSize={9} fill={accent} fontWeight="700" fontFamily="ui-monospace,monospace">×2</text>
            </g>
          )}
        </g>
      ))}
      {([[4, 12], [288, 180], [150, 0]] as [number, number][]).map(([x, y], i) => (
        <g key={i}>
          <line x1={x - 5} y1={y} x2={x + 5} y2={y} stroke={accent} strokeWidth={1.3} />
          <line x1={x} y1={y - 5} x2={x} y2={y + 5} stroke={accent} strokeWidth={1.3} />
        </g>
      ))}
      <g transform="translate(248,240) rotate(-14)">
        <path d="M 0 8 L 38 0 L 20 16 Z" stroke={ink} strokeWidth={1.3} fill={paper} strokeLinejoin="round" />
        <path d="M 20 16 L 34 7 L 38 0" stroke={ink} strokeWidth={1.1} fill="none" />
        <path d="M -12 11 Q -4 7 0 8" stroke={dim} strokeWidth={0.9} fill="none" strokeDasharray="2 2" />
      </g>
    </svg>
  );
}
