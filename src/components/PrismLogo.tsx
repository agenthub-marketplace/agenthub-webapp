// Geodesic / triangulated polyhedron — less round, more angular (per user reference)
export function PrismLogo({ size = 280 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      role="img"
      aria-label="PRISM logo"
      className="select-none"
    >
      <g stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Outer hex silhouette */}
        <polygon points="200,22 360,112 360,288 200,378 40,288 40,112" />
        {/* Inner triangulation */}
        <line x1="40" y1="112" x2="200" y2="200" />
        <line x1="200" y1="200" x2="360" y2="112" />
        <line x1="40" y1="288" x2="200" y2="200" />
        <line x1="200" y1="200" x2="360" y2="288" />
        <line x1="200" y1="22" x2="200" y2="200" />
        <line x1="200" y1="200" x2="200" y2="378" />
        <line x1="40" y1="200" x2="360" y2="200" />
        {/* Sub-triangles */}
        <polyline points="40,112 130,68 200,22" />
        <polyline points="200,22 270,68 360,112" />
        <polyline points="40,288 130,332 200,378" />
        <polyline points="200,378 270,332 360,288" />
        <line x1="130" y1="68" x2="200" y2="200" />
        <line x1="270" y1="68" x2="200" y2="200" />
        <line x1="130" y1="332" x2="200" y2="200" />
        <line x1="270" y1="332" x2="200" y2="200" />
        <line x1="40" y1="200" x2="130" y2="68" />
        <line x1="40" y1="200" x2="130" y2="332" />
        <line x1="360" y1="200" x2="270" y2="68" />
        <line x1="360" y1="200" x2="270" y2="332" />
        <line x1="40" y1="112" x2="40" y2="288" />
        <line x1="360" y1="112" x2="360" y2="288" />
      </g>
      {/* Vertex dots — varied size */}
      <g fill="#1a1a1a">
        <circle cx="200" cy="22" r="5" />
        <circle cx="360" cy="112" r="9" />
        <circle cx="360" cy="288" r="5" />
        <circle cx="200" cy="378" r="7" />
        <circle cx="40" cy="288" r="9" />
        <circle cx="40" cy="112" r="5" />
        <circle cx="200" cy="200" r="6" />
        <circle cx="130" cy="68" r="3.5" />
        <circle cx="270" cy="68" r="3.5" />
        <circle cx="130" cy="332" r="3.5" />
        <circle cx="270" cy="332" r="3.5" />
        <circle cx="40" cy="200" r="3.5" />
        <circle cx="360" cy="200" r="3.5" />
      </g>
      {/* Wordmark */}
      <g>
        <rect x="116" y="178" width="168" height="48" fill="#F2F2F2" />
        <text
          x="200"
          y="213"
          textAnchor="middle"
          fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
          fontSize="34"
          fontWeight="600"
          letterSpacing="4"
          fill="#111"
        >
          PR<tspan fill="#bbb" fontWeight="400">i</tspan>SM
        </text>
      </g>
    </svg>
  );
}
