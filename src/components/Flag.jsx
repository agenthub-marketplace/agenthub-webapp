// Minimal inline SVG flags for FR / GB / ES / IT
export default function Flag({ code, className = 'w-4 h-3 rounded-sm overflow-hidden inline-block' }) {
  if (code === 'FR') {
    return (
      <svg viewBox="0 0 6 4" className={className}>
        <rect width="2" height="4" x="0" fill="#0055A4"/>
        <rect width="2" height="4" x="2" fill="#FFFFFF"/>
        <rect width="2" height="4" x="4" fill="#EF4135"/>
      </svg>
    );
  }
  if (code === 'IT') {
    return (
      <svg viewBox="0 0 6 4" className={className}>
        <rect width="2" height="4" x="0" fill="#009246"/>
        <rect width="2" height="4" x="2" fill="#FFFFFF"/>
        <rect width="2" height="4" x="4" fill="#CE2B37"/>
      </svg>
    );
  }
  if (code === 'ES') {
    return (
      <svg viewBox="0 0 6 4" className={className}>
        <rect width="6" height="1" y="0" fill="#AA151B"/>
        <rect width="6" height="2" y="1" fill="#F1BF00"/>
        <rect width="6" height="1" y="3" fill="#AA151B"/>
      </svg>
    );
  }
  // GB Union Jack (simplified)
  return (
    <svg viewBox="0 0 60 40" className={className}>
      <rect width="60" height="40" fill="#012169"/>
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFF" strokeWidth="8"/>
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="4"/>
      <path d="M30,0 L30,40 M0,20 L60,20" stroke="#FFF" strokeWidth="10"/>
      <path d="M30,0 L30,40 M0,20 L60,20" stroke="#C8102E" strokeWidth="6"/>
    </svg>
  );
}
