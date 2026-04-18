export function PrismLogo({ size = 280 }: { size?: number }) {
  // Stylized geodesic network sphere with PRISM wordmark
  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      role="img"
      aria-label="PRISM logo"
      className="select-none"
    >
      <defs>
        <clipPath id="sphere-clip">
          <circle cx="200" cy="200" r="170" />
        </clipPath>
      </defs>
      <g
        clipPath="url(#sphere-clip)"
        stroke="#111111"
        strokeWidth="1"
        fill="none"
      >
        {/* outer circle */}
        <circle cx="200" cy="200" r="170" />
        {/* horizontal ellipses */}
        {[0, 1, 2, 3, 4].map((i) => {
          const ry = 30 + i * 32;
          return <ellipse key={`h${i}`} cx="200" cy="200" rx="170" ry={ry} />;
        })}
        {/* vertical ellipses */}
        {[0, 1, 2, 3, 4].map((i) => {
          const rx = 30 + i * 32;
          return <ellipse key={`v${i}`} cx="200" cy="200" rx={rx} ry="170" />;
        })}
        {/* diagonal lines */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * Math.PI) / 6;
          const x1 = 200 + Math.cos(angle) * 170;
          const y1 = 200 + Math.sin(angle) * 170;
          const x2 = 200 - Math.cos(angle) * 170;
          const y2 = 200 - Math.sin(angle) * 170;
          return <line key={`d${i}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
        {/* dots at intersections */}
        {[
          [200, 30], [200, 370], [30, 200], [370, 200],
          [80, 80], [320, 80], [80, 320], [320, 320],
          [200, 100], [200, 300], [100, 200], [300, 200],
          [140, 60], [260, 60], [140, 340], [260, 340],
          [60, 140], [60, 260], [340, 140], [340, 260],
          [150, 150], [250, 150], [150, 250], [250, 250],
        ].map(([cx, cy], i) => (
          <circle key={`dot${i}`} cx={cx} cy={cy} r="4" fill="#111111" />
        ))}
      </g>
      {/* Wordmark */}
      <g>
        <rect x="120" y="180" width="160" height="44" fill="#F2F2F2" />
        <text
          x="200"
          y="212"
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="34"
          fontWeight="500"
          letterSpacing="6"
          fill="#111111"
        >
          PR<tspan fontSize="26" baselineShift="-2">i</tspan>SM
        </text>
        <circle cx="197" cy="190" r="2.5" fill="#111111" />
      </g>
    </svg>
  );
}
